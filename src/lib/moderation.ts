import { ref, get, set, remove, runTransaction, onValue } from 'firebase/database';
import { rtdb } from './firebase';

const MUTE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const KICK_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const VOTE_KICK_DURATION_MS = 60 * 1000; // 1 minute

export interface MuteRecord {
  mutedBy: string;
  mutedAt: number;
  expiresAt: number;
}

export interface KickRecord {
  kickedBy: string;
  kickedAt: number;
  canRejoinAt: number;
}

export interface RoomSilenceRecord {
  active: boolean;
  silencedBy: string;
  silencedByName: string;
  silencedAt: number;
}

export interface VoteKickRecord {
  targetUserId: string;
  targetUsername: string;
  startedBy: string;
  startedByUsername: string;
  startedAt: number;
  expiresAt: number;
  requiredVotes: number;
  votes: Record<string, true>;
}

// Mute a user in a room
import { getChatroomById } from './firebaseOperations';

export async function muteUser(roomId: string, userId: string, mutedBy: string): Promise<void> {
  // Ensure target is present in the room before muting
  const room = await getChatroomById(roomId);
  if (!room || !(room.participants || []).includes(userId)) {
    throw new Error('Cannot mute user who is not in the room');
  }

  const now = Date.now();
  const muteRef = ref(rtdb, `moderation/mutes/${roomId}/${userId}`);

  await set(muteRef, {
    mutedBy,
    mutedAt: now,
    expiresAt: now + MUTE_DURATION_MS
  });
}

// Check if user is muted in a room
export async function isUserMuted(roomId: string, userId: string): Promise<boolean> {
  const muteRef = ref(rtdb, `moderation/mutes/${roomId}/${userId}`);
  const snapshot = await get(muteRef);

  if (!snapshot.exists()) return false;

  const muteRecord = snapshot.val() as MuteRecord;
  const now = Date.now();

  // Check if mute has expired
  if (now >= muteRecord.expiresAt) {
    // Clean up expired mute
    await remove(muteRef);
    return false;
  }

  return true;
}

// Get remaining mute time in seconds
export async function getMuteTimeRemaining(roomId: string, userId: string): Promise<number> {
  const muteRef = ref(rtdb, `moderation/mutes/${roomId}/${userId}`);
  const snapshot = await get(muteRef);

  if (!snapshot.exists()) return 0;

  const muteRecord = snapshot.val() as MuteRecord;
  const remaining = Math.max(0, muteRecord.expiresAt - Date.now());

  return Math.ceil(remaining / 1000);
}

// Kick a user from a room (with 10 min cooldown)
export async function kickUser(roomId: string, userId: string, kickedBy: string): Promise<void> {
  // Ensure target is present in the room before kicking
  const room = await getChatroomById(roomId);
  if (!room || !(room.participants || []).includes(userId)) {
    throw new Error('Cannot kick user who is not in the room');
  }

  const now = Date.now();
  const kickRef = ref(rtdb, `moderation/kicks/${roomId}/${userId}`);

  await set(kickRef, {
    kickedBy,
    kickedAt: now,
    canRejoinAt: now + KICK_COOLDOWN_MS
  });
}
// Check if user can join a room (not in kick cooldown)
export async function canUserJoinRoom(roomId: string, userId: string): Promise<{ canJoin: boolean; minutesRemaining?: number }> {
  const kickRef = ref(rtdb, `moderation/kicks/${roomId}/${userId}`);
  const snapshot = await get(kickRef);

  if (!snapshot.exists()) return { canJoin: true };

  const kickRecord = snapshot.val() as KickRecord;
  const now = Date.now();

  // Check if cooldown has expired
  if (now >= kickRecord.canRejoinAt) {
    // Clean up expired kick record
    await remove(kickRef);
    return { canJoin: true };
  }

  const minutesRemaining = Math.ceil((kickRecord.canRejoinAt - now) / 60000);
  return { canJoin: false, minutesRemaining };
}

// Unmute a user
export async function unmuteUser(roomId: string, userId: string): Promise<void> {
  const muteRef = ref(rtdb, `moderation/mutes/${roomId}/${userId}`);
  await remove(muteRef);
}

// Clear kick record (allow user to rejoin)
export async function clearKickRecord(roomId: string, userId: string): Promise<void> {
  const kickRef = ref(rtdb, `moderation/kicks/${roomId}/${userId}`);
  await remove(kickRef);
}

export async function setRoomSilence(roomId: string, active: boolean, silencedBy: string, silencedByName: string): Promise<void> {
  const silenceRef = ref(rtdb, `moderation/roomSilence/${roomId}`);
  if (!active) {
    await remove(silenceRef);
    return;
  }

  await set(silenceRef, {
    active: true,
    silencedBy,
    silencedByName,
    silencedAt: Date.now()
  } as RoomSilenceRecord);
}

export function subscribeToRoomSilence(roomId: string, callback: (state: RoomSilenceRecord | null) => void): () => void {
  const silenceRef = ref(rtdb, `moderation/roomSilence/${roomId}`);
  const unsubscribe = onValue(silenceRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.val() as RoomSilenceRecord);
  });
  return unsubscribe;
}

export async function startVoteKick(
  roomId: string,
  targetUserId: string,
  targetUsername: string,
  startedBy: string,
  startedByUsername: string,
  requiredVotes: number = 5
): Promise<{ success: boolean; message: string; votes?: number; requiredVotes?: number }> {
  const voteKickRef = ref(rtdb, `moderation/votekicks/${roomId}/${targetUserId}`);
  try {
    const result = await runTransaction(voteKickRef, (current: VoteKickRecord | null) => {
      if (current) return current;
      return {
        targetUserId,
        targetUsername,
        startedBy,
        startedByUsername,
        startedAt: Date.now(),
        expiresAt: Date.now() + VOTE_KICK_DURATION_MS,
        requiredVotes,
        votes: { [startedBy]: true }
      } as VoteKickRecord;
    });

    if (!result.committed || !result.snapshot.exists()) {
      return { success: false, message: 'Vote-kick already active for this user' };
    }

    const val = result.snapshot.val() as VoteKickRecord;
    const votes = Object.keys(val.votes || {}).length;
    return { success: true, message: 'Vote-kick started', votes, requiredVotes: val.requiredVotes };
  } catch (error) {
    console.error('Failed to start vote-kick:', error);
    return { success: false, message: 'Failed to start vote-kick' };
  }
}

export async function castVoteKick(
  roomId: string,
  targetUserId: string,
  voterId: string
): Promise<{ success: boolean; message: string; votes?: number; requiredVotes?: number; reached?: boolean }> {
  const voteKickRef = ref(rtdb, `moderation/votekicks/${roomId}/${targetUserId}`);

  try {
    const result = await runTransaction(voteKickRef, (current: VoteKickRecord | null) => {
      if (!current) return current;
      if (Date.now() > (current.expiresAt || 0)) return null;
      const existingVotes = current.votes || {};
      if (existingVotes[voterId]) return current;

      return {
        ...current,
        votes: {
          ...existingVotes,
          [voterId]: true
        }
      } as VoteKickRecord;
    });

    if (!result.snapshot.exists()) {
      return { success: false, message: 'No active vote-kick found (expired or cancelled)' };
    }

    const record = result.snapshot.val() as VoteKickRecord;
    const votes = Object.keys(record.votes || {}).length;
    const requiredVotes = record.requiredVotes || 5;
    return {
      success: true,
      message: 'Vote recorded',
      votes,
      requiredVotes,
      reached: votes >= requiredVotes
    };
  } catch (error) {
    console.error('Failed to cast vote-kick vote:', error);
    return { success: false, message: 'Failed to cast vote' };
  }
}

export async function cancelVoteKick(roomId: string, targetUserId: string): Promise<void> {
  const voteKickRef = ref(rtdb, `moderation/votekicks/${roomId}/${targetUserId}`);
  await remove(voteKickRef);
}

export function subscribeToVoteKicks(
  roomId: string,
  callback: (records: Record<string, VoteKickRecord>) => void
): () => void {
  const voteKicksRef = ref(rtdb, `moderation/votekicks/${roomId}`);
  const unsubscribe = onValue(voteKicksRef, (snapshot) => {
    callback((snapshot.val() || {}) as Record<string, VoteKickRecord>);
  });
  return unsubscribe;
}
