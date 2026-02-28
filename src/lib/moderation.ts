import { ref, get, set, remove } from 'firebase/database';
import { rtdb } from './firebase';

const MUTE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const KICK_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

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
