// Gift Shower Contest Feature
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
  addDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { updateCredits, createUserAlert, STORE_ITEMS } from './firebaseOperations';

// generic contest interface - extensions can add more fields as needed
export type ContestType = 'gift' | 'invite';

export interface InviteContestStat {
  username: string;
  successfulInvites: number;
  lotteryCodes: string[];
}

export interface InviteLotteryEntry {
  code: string;
  inviterUid: string;
  inviterUsername: string;
  invitedEmail: string;
  registeredUserId: string;
  createdAt: number;
}

export interface GiftShowerContest {
  id: string;
  /**
   * type of contest
   */
  type?: ContestType;
  roomId: string;
  roomName: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  prizeCredits: number;
  /**
   * id of the gift that counts toward the contest. if omitted any gift is eligible.
   */
  giftId?: string;
  giftStats?: { [userId: string]: { username: string; totalGifts: number; totalValue: number } };
  inviteStats?: { [userId: string]: InviteContestStat };
  lotteryEntries?: { [code: string]: InviteLotteryEntry };
  fixedTopPrizes?: number[];
  grandPrizeCredits?: number;
  grandPrizeWinnerId?: string;
  grandPrizeWinnerName?: string;
  grandPrizeLotteryCode?: string;
  grandPrizePetId?: string;
  endedAt?: number;
  winnerId?: string;
  winnerName?: string;
  lastContestDate?: string; // YYYY-MM-DD format to track daily limit
  topPrizeWinners?: { userId: string; username: string; successfulInvites: number; prize: number }[];
}

export const INVITE_CONTEST_DURATION_DAYS = 5;
export const INVITE_TOP_PRIZES = [150, 100, 75, 50, 30]; // top 5 fixed prizes for invite contest
export const INVITE_GRAND_PRIZE_CREDITS = 100;

function getTopPetId(): string | undefined {
  const topPet = STORE_ITEMS
    .filter(item => item.type === 'pet')
    .sort((a, b) => b.price - a.price)[0];
  return topPet?.id;
}

function getPetPriceById(petId: string): number {
  const pet = STORE_ITEMS.find(item => item.type === 'pet' && item.id === petId);
  return pet?.price || 0;
}

function randomCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateLotteryCode(contestId: string): string {
  const suffix = contestId.slice(-4).toUpperCase();
  return `BIMO-${suffix}-${randomCode(6)}`;
}

// Check if there's an active contest in a room
export async function getActiveContest(roomId: string): Promise<GiftShowerContest | null> {
  const now = Date.now();
  const contestsRef = collection(db, 'giftContests');
  const q = query(
    contestsRef,
    where('roomId', '==', roomId),
    where('isActive', '==', true),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const contest = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as GiftShowerContest;

  // Check if contest has ended
  if (now > contest.endTime) {
    await endContest(contest.id);
    return null;
  }

  return contest;
}

// Check if a contest was already run today for a room
export async function hasContestRunToday(roomId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const metaRef = doc(db, 'contestMeta', roomId);
  const metaDoc = await getDoc(metaRef);

  if (!metaDoc.exists()) return false;

  return metaDoc.data().lastContestDate === today;
}

// Start a new gift shower contest (system/admin only) - once per 24 hours, Newbies room only
export async function startGiftShowerContest(
  roomId: string,
  roomName: string,
  durationMinutes: number = 60,
  prizeCredits: number = 50,
  giftId?: string,
  skipDailyCheck: boolean = false
): Promise<{ contest?: GiftShowerContest; error?: string }> {
  // Only allow in Newbies room
  if (roomName !== 'Newbies') {
    return { error: 'Gift contests can only be started in the Newbies room!' };
  }

  // giftId is mandatory for new contests
  if (!giftId || giftId.trim().length === 0) {
    return { error: 'You must specify a gift ID when starting a contest.' };
  }

  // Check if contest already run today
  if (!skipDailyCheck) {
    const alreadyRun = await hasContestRunToday(roomId);
    if (alreadyRun) {
      return { error: 'A gift contest has already been run today. Try again tomorrow!' };
    }
  }

  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const contestId = `contest_${roomId}_${now}`;

  const contest: Omit<GiftShowerContest, 'id'> = {
    type: 'gift',
    roomId,
    roomName,
    startTime: now,
    endTime: now + (durationMinutes * 60 * 1000),
    isActive: true,
    prizeCredits,
    giftId,
    giftStats: {},
    lastContestDate: today
  };

  await setDoc(doc(db, 'giftContests', contestId), contest);

  // Update contest meta to track daily limit
  const metaRef = doc(db, 'contestMeta', roomId);
  await setDoc(metaRef, { lastContestDate: today });

  return { contest: { id: contestId, ...contest } };
}

// Start a global invite contest (admin command entry-point).
export async function startInviteContest(
  durationDays: number = INVITE_CONTEST_DURATION_DAYS
): Promise<{ contest?: GiftShowerContest; error?: string }> {
  const contestsRef = collection(db, 'giftContests');
  const existingQ = query(contestsRef, where('type', '==', 'invite'), where('isActive', '==', true), limit(1));
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    return { error: 'An invite contest is already active.' };
  }

  const now = Date.now();
  const contestId = `invite_contest_${now}`;
  const contest: Omit<GiftShowerContest, 'id'> = {
    type: 'invite',
    roomId: 'global',
    roomName: 'Bimo33',
    startTime: now,
    endTime: now + durationDays * 24 * 60 * 60 * 1000,
    isActive: true,
    prizeCredits: INVITE_TOP_PRIZES.reduce((sum, v) => sum + v, 0) + INVITE_GRAND_PRIZE_CREDITS,
    inviteStats: {},
    lotteryEntries: {},
    fixedTopPrizes: INVITE_TOP_PRIZES,
    grandPrizeCredits: INVITE_GRAND_PRIZE_CREDITS,
    grandPrizePetId: getTopPetId(),
  };

  await setDoc(doc(db, 'giftContests', contestId), contest);
  return { contest: { id: contestId, ...contest } };
}

// helper to determine eligibility
export function isContestGiftEligible(contest: GiftShowerContest, giftId: string): boolean {
  // if contest has no gift restriction, all gifts count
  return !contest.giftId || contest.giftId === giftId;
}

// Record a gift during a contest (only counts if giftId matches contest.giftId)
export async function recordContestGift(
  contestId: string,
  senderId: string,
  senderUsername: string,
  giftValue: number,
  // number of individual gifts sent (1 for a single gift, or number of recipients for a shower)
  giftCount: number = 1,
  giftId?: string
): Promise<void> {
  const contestRef = doc(db, 'giftContests', contestId);
  const contestSnap = await getDoc(contestRef);

  if (!contestSnap.exists()) return;

  const contest = contestSnap.data() as GiftShowerContest;

  // Check if contest is still active
  if (!contest.isActive || Date.now() > contest.endTime) return;

  // filter by gift if specified
  if (giftId && contest.giftId && giftId !== contest.giftId) return;

  const currentStats = contest.giftStats[senderId] || { username: senderUsername, totalGifts: 0, totalValue: 0 };

  await updateDoc(contestRef, {
    [`giftStats.${senderId}`]: {
      username: senderUsername,
      totalGifts: currentStats.totalGifts + giftCount,
      totalValue: currentStats.totalValue + giftValue
    }
  });
}

// End a contest and distribute prizes among top 10 - with transaction recording
export async function endContest(contestId: string): Promise<{ winnerId: string; winnerName: string; prize: number; roomId: string } | null> {
  const contestRef = doc(db, 'giftContests', contestId);

  // Use a transaction to prevent multiple announcements
  const result = await runTransaction(db, async (tx) => {
    const contestSnap = await tx.get(contestRef);

    if (!contestSnap.exists()) return null;

    const contest = contestSnap.data() as GiftShowerContest;

    // Already ended - don't process again
    if (!contest.isActive) return null;

    // Mark as ended FIRST in the transaction to prevent race conditions
    tx.update(contestRef, { isActive: false, endedAt: Date.now() });

    if (contest.type === 'invite') {
      const inviteStats = contest.inviteStats || {};
      const entries = Object.entries(inviteStats);
      const sorted = entries.sort((a, b) => b[1].successfulInvites - a[1].successfulInvites);
      const topParticipants = sorted.slice(0, 5);
      const fixedPrizes = contest.fixedTopPrizes?.length ? contest.fixedTopPrizes : INVITE_TOP_PRIZES;
      const prizeDistribution = topParticipants.map(([userId, data], idx) => ({
        userId,
        username: data.username,
        successfulInvites: data.successfulInvites,
        prize: fixedPrizes[idx] || 0,
      })).filter(p => p.prize > 0);

      const lotteryEntries = contest.lotteryEntries || {};
      const lotteryCodes = Object.keys(lotteryEntries);
      let grandPrizeWinnerId: string | undefined;
      let grandPrizeWinnerName: string | undefined;
      let grandPrizeLotteryCode: string | undefined;
      if (lotteryCodes.length > 0) {
        const selectedCode = lotteryCodes[Math.floor(Math.random() * lotteryCodes.length)];
        const selectedEntry = lotteryEntries[selectedCode];
        if (selectedEntry) {
          grandPrizeWinnerId = selectedEntry.inviterUid;
          grandPrizeWinnerName = selectedEntry.inviterUsername;
          grandPrizeLotteryCode = selectedCode;
        }
      }

      const winnerId = prizeDistribution[0]?.userId || grandPrizeWinnerId || '';
      const winnerName = prizeDistribution[0]?.username || grandPrizeWinnerName || '';
      tx.update(contestRef, {
        winnerId,
        winnerName,
        topPrizeWinners: prizeDistribution,
        grandPrizeWinnerId: grandPrizeWinnerId || null,
        grandPrizeWinnerName: grandPrizeWinnerName || null,
        grandPrizeLotteryCode: grandPrizeLotteryCode || null,
        grandPrizeCredits: contest.grandPrizeCredits || INVITE_GRAND_PRIZE_CREDITS,
      });

      return {
        type: 'invite',
        roomId: contest.roomId,
        roomName: contest.roomName,
        prize: contest.prizeCredits,
        prizeDistribution,
        grandPrizeWinnerId,
        grandPrizeWinnerName,
        grandPrizeLotteryCode,
        grandPrizeCredits: contest.grandPrizeCredits || INVITE_GRAND_PRIZE_CREDITS,
        grandPrizePetId: contest.grandPrizePetId || getTopPetId(),
        winnerId,
        winnerName,
      };
    }

    // Get participants
    const entries = Object.entries(contest.giftStats || {});
    if (entries.length === 0) {
      return { noParticipants: true, roomId: contest.roomId, roomName: contest.roomName };
    }

    // Sort by total gifts sent (descending)
    const sorted = entries.sort((a, b) => b[1].totalGifts - a[1].totalGifts);

    // Take top 5 senders only
    const topParticipants = sorted.slice(0, 5);

    const totalGifts = topParticipants.reduce((sum, [, data]) => sum + data.totalGifts, 0);

    // Calculate prize distribution proportionally with proper rounding
    let remainingPrize = contest.prizeCredits;
    const prizeDistribution: { userId: string; username: string; gifts: number; prize: number }[] = [];

    topParticipants.forEach(([userId, data], index) => {
      // Last participant gets whatever remains to fix rounding
      const prize = index === topParticipants.length - 1
        ? remainingPrize
        : Math.round(contest.prizeCredits * (data.totalGifts / totalGifts));

      remainingPrize -= prize;

      if (prize > 0) {
        prizeDistribution.push({
          userId,
          username: data.username,
          gifts: data.totalGifts,
          prize
        });
      }
    });

    // Update winner info (top sender)
    const [winnerId, winnerData] = sorted[0];
    tx.update(contestRef, {
      winnerId,
      winnerName: winnerData.username
    });

    return {
      type: 'gift',
      winnerId,
      winnerName: winnerData.username,
      prize: contest.prizeCredits,
      roomId: contest.roomId,
      roomName: contest.roomName,
      prizeDistribution,
      sorted
    };
  });

  if (!result) return null;

  if ((result as any).type === 'invite') {
    const inviteResult: any = result;
    for (const [index, winner] of inviteResult.prizeDistribution.entries()) {
      await updateCredits(winner.userId, winner.prize);
      try {
        await createUserAlert(
          winner.userId,
          'contest_win',
          `🎉 You placed ${index + 1} in the invite contest and earned ${winner.prize} credits!`
        );
      } catch (e) {
        console.warn('Failed to alert invite contest winner', winner.userId, e);
      }
      await addDoc(collection(db, 'transactions'), {
        from: 'system',
        to: winner.userId,
        participants: [winner.userId],
        toUsername: winner.username,
        amount: winner.prize,
        type: 'contest',
        description: `Invite contest rank ${index + 1} prize`,
        timestamp: serverTimestamp()
      });
    }

    if (inviteResult.grandPrizeWinnerId) {
      await updateCredits(inviteResult.grandPrizeWinnerId, inviteResult.grandPrizeCredits);
      let grandPrizeExtraText = '';
      if (inviteResult.grandPrizePetId) {
        const grandWinnerRef = doc(db, 'users', inviteResult.grandPrizeWinnerId);
        const winnerSnap = await getDoc(grandWinnerRef);
        const winnerPets = winnerSnap.exists() ? (winnerSnap.data().pets || []) : [];
        const alreadyOwnsTopPet = Array.isArray(winnerPets) && winnerPets.includes(inviteResult.grandPrizePetId);
        if (alreadyOwnsTopPet) {
          const halfPetPrice = Number((getPetPriceById(inviteResult.grandPrizePetId) / 2).toFixed(2));
          if (halfPetPrice > 0) {
            await updateCredits(inviteResult.grandPrizeWinnerId, halfPetPrice);
            await addDoc(collection(db, 'transactions'), {
              from: 'system',
              to: inviteResult.grandPrizeWinnerId,
              participants: [inviteResult.grandPrizeWinnerId],
              toUsername: inviteResult.grandPrizeWinnerName,
              amount: halfPetPrice,
              type: 'contest',
              description: `Invite contest top-pet duplicate compensation (${inviteResult.grandPrizePetId})`,
              timestamp: serverTimestamp()
            });
            grandPrizeExtraText = ` You already had the top pet, so you also received ${halfPetPrice} credits (half pet price).`;
          }
        } else {
          await updateDoc(grandWinnerRef, {
            pets: arrayUnion(inviteResult.grandPrizePetId)
          });
        }
      }
      try {
        await createUserAlert(
          inviteResult.grandPrizeWinnerId,
          'contest_win',
          `🎁 Grand prize winner! You won ${inviteResult.grandPrizeCredits} credits + top pet with lottery code ${inviteResult.grandPrizeLotteryCode}.`
        );
      } catch (e) {
        console.warn('Failed to alert invite grand winner', e);
      }
      if (grandPrizeExtraText) {
        try {
          await createUserAlert(
            inviteResult.grandPrizeWinnerId,
            'contest_win',
            grandPrizeExtraText.trim()
          );
        } catch (e) {
          console.warn('Failed to alert invite grand winner compensation', e);
        }
      }
      await addDoc(collection(db, 'transactions'), {
        from: 'system',
        to: inviteResult.grandPrizeWinnerId,
        participants: [inviteResult.grandPrizeWinnerId],
        toUsername: inviteResult.grandPrizeWinnerName,
        amount: inviteResult.grandPrizeCredits,
        type: 'contest',
        description: `Invite contest grand prize (code ${inviteResult.grandPrizeLotteryCode})`,
        timestamp: serverTimestamp()
      });
    }

    return {
      winnerId: inviteResult.winnerId,
      winnerName: inviteResult.winnerName,
      prize: inviteResult.prize,
      roomId: inviteResult.roomId
    };
  }

  // Handle no participants case
  if ('noParticipants' in result && result.noParticipants) {
    try {
      const { sendMessage } = await import('./firebaseOperations');
      sendMessage(result.roomId, {
        roomId: result.roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '📢',
        content: `⏰ GIFT CONTEST ENDED!\n\nNo gifts were sent during this contest. Better luck next time!`,
        type: 'gift'
      });
    } catch (e) {
      console.warn('Failed to announce contest end (no participants):', e);
    }
    return null;
  }

  // Distribute prizes to top 5 winners
  const { prizeDistribution, winnerId, winnerName, roomId, roomName } = result as any;

  for (const [index, winner] of prizeDistribution.entries()) {
    // Award the prize
    await updateCredits(winner.userId, winner.prize);

    // Create a bimo alert for the user so they know they won
    try {
      await createUserAlert(
        winner.userId,
        'contest_win',
        `🎉 You placed ${index + 1} in the gift contest in ${roomName} and earned ${winner.prize} credits!`
      );
    } catch (e) {
      console.warn('Failed to create alert for contest winner', winner.userId, e);
    }

    // Record transaction
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'transactions'), {
      from: 'system',
      to: winner.userId,
      participants: [winner.userId],
      toUsername: winner.username,
      amount: winner.prize,
      type: 'contest',
      description: `Gift contest prize in ${roomName} (${winner.gifts} gifts)`,
      timestamp: serverTimestamp()
    });
  }

  // Announce winners and leaderboard in the room
  try {
    const { sendMessage } = await import('./firebaseOperations');
    const topList = prizeDistribution
      .map((w: any, idx: number) => `${idx + 1}. ${w.username} — ${w.gifts} gifts → ${w.prize} credits`)
      .join('\n');

    const content = `🎉 GIFT CONTEST ENDED!\n\n🏆 Top Sender: ${winnerName}\n💰 Total Prize Pool: ${result.prize} credits\n\nPrizes were distributed proportionally based on number of gifts sent.\n\nPrize Distribution:\n${topList}`;

    sendMessage(roomId, {
      roomId,
      senderId: 'system',
      senderName: 'System',
      senderAvatar: '🏆',
      content,
      type: 'gift'
    });
  } catch (e) {
    console.warn('Failed to announce contest winners:', e);
  }

  return { winnerId, winnerName, prize: result.prize, roomId };
}

// Get leaderboard for active contest
export function getContestLeaderboard(contest: GiftShowerContest): { userId: string; username: string; totalGifts: number; totalValue: number }[] {
  if (contest.type === 'invite') {
    return Object.entries(contest.inviteStats || {})
      .map(([userId, data]) => ({
        userId,
        username: data.username,
        totalGifts: data.successfulInvites,
        totalValue: data.lotteryCodes?.length || data.successfulInvites
      }))
      .sort((a, b) => b.totalGifts - a.totalGifts);
  }
  // leaderboard is based on number of gifts sent (totalGifts), not the credit value
  return Object.entries(contest.giftStats || {})
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      totalGifts: data.totalGifts,
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.totalGifts - a.totalGifts)
    .slice(0, 10);
}

/**
 * Determine how the prize pool would be distributed for a finished contest.
 * This mirrors the algorithm used by `endContest` but does not perform any
 * database writes. The result can be used on the UI to show how many credits
 * each of the top participants received.
 */
export function calculatePrizeDistribution(contest: GiftShowerContest): {
  userId: string;
  username: string;
  gifts: number;
  prize: number;
}[] {
  if (contest.type === 'invite') {
    const sorted = Object.entries(contest.inviteStats || {})
      .sort((a, b) => b[1].successfulInvites - a[1].successfulInvites)
      .slice(0, 5);
    const fixedPrizes = contest.fixedTopPrizes?.length ? contest.fixedTopPrizes : INVITE_TOP_PRIZES;
    return sorted.map(([userId, data], i) => ({
      userId,
      username: data.username,
      gifts: data.successfulInvites,
      prize: fixedPrizes[i] || 0
    })).filter(x => x.prize > 0);
  }
  const entries = Object.entries(contest.giftStats || {});
  // sort by totalGifts descending
  const sorted = entries.sort((a, b) => b[1].totalGifts - a[1].totalGifts);
  const topParticipants = sorted.slice(0, 5);
  const totalGifts = topParticipants.reduce((sum, [, data]) => sum + data.totalGifts, 0);

  let remainingPrize = contest.prizeCredits;
  const prizeDistribution: { userId: string; username: string; gifts: number; prize: number }[] = [];

  topParticipants.forEach(([userId, data], index) => {
    const prize =
      index === topParticipants.length - 1
        ? remainingPrize
        : Math.round(contest.prizeCredits * (data.totalGifts / totalGifts));

    remainingPrize -= prize;
    if (prize > 0) {
      prizeDistribution.push({
        userId,
        username: data.username,
        gifts: data.totalGifts,
        prize
      });
    }
  });

  return prizeDistribution;
}

// Get remaining time in contest
export function getContestRemainingTime(contest: GiftShowerContest): { minutes: number; seconds: number } {
  const remaining = Math.max(0, contest.endTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { minutes, seconds };
}
// Fetch any active contest (used for announcements)
export async function getAnyActiveContest(): Promise<GiftShowerContest | null> {
  const now = Date.now();
  const contestsRef = collection(db, 'giftContests');
  const q = query(contestsRef, where('isActive', '==', true), limit(10));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const active: GiftShowerContest[] = [];
  for (const docSnap of snapshot.docs) {
    const contest = { id: docSnap.id, ...docSnap.data() } as GiftShowerContest;
    if (now > contest.endTime) {
      await endContest(contest.id);
      continue;
    }
    active.push(contest);
  }
  if (!active.length) return null;
  const idx = Math.floor(Math.random() * active.length);
  return active[idx];
}
// new helper that fetches all currently active contests (not just one)
export async function getActiveContests(): Promise<GiftShowerContest[]> {
  // return any contest that started in the last 24h. this includes currently active
  // contests as well as contests that ended within the past day so that the
  // frontend can continue showing results for a reasonable window.
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000; // active + ended in the last 24 hours
  const contestsRef = collection(db, 'giftContests');
  // query by endTime since it's comparable
  const q = query(contestsRef, where('endTime', '>=', cutoff), orderBy('endTime', 'desc'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return [];

  const recent: GiftShowerContest[] = [];
  for (const docSnap of snapshot.docs) {
    let contest = { id: docSnap.id, ...docSnap.data() } as GiftShowerContest;

    // if the contest has technically expired but we haven't marked it ended yet,
    // end it now. we still want to include it in the results so the page can show
    // the leaderboard/winner information.
    if (contest.isActive && now > contest.endTime) {
      try {
        // this will update the document (set isActive=false, winner info, send
        // announcements) and we grab the refreshed snapshot so we can show the
        // winner on the contests page immediately.
        await endContest(contest.id);
        const fresh = await getDoc(doc(db, 'giftContests', contest.id));
        if (fresh.exists()) {
          contest = { id: fresh.id, ...fresh.data() } as GiftShowerContest;
        }
      } catch (e) {
        console.warn('Error ending contest during active fetch:', e);
      }
    }

    // only include contests that are still within the 24h window
    recent.push(contest);
  }

  return recent;
}

export async function getActiveInviteContest(): Promise<GiftShowerContest | null> {
  const now = Date.now();
  const contestsRef = collection(db, 'giftContests');
  const q = query(contestsRef, where('type', '==', 'invite'), where('isActive', '==', true), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const contest = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as GiftShowerContest;
  if (now > contest.endTime) {
    await endContest(contest.id);
    return null;
  }
  return contest;
}

export async function recordInviteRegistrationForActiveContest(
  inviterUid: string,
  inviterUsername: string,
  invitedEmail: string,
  registeredUserId: string
): Promise<{ lotteryCode?: string; contestId?: string }> {
  const activeContest = await getActiveInviteContest();
  if (!activeContest) return {};

  const contestRef = doc(db, 'giftContests', activeContest.id);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(contestRef);
    if (!snap.exists()) return {};
    const contest = { id: snap.id, ...snap.data() } as GiftShowerContest;
    if (!contest.isActive || contest.type !== 'invite' || Date.now() > contest.endTime) {
      return {};
    }

    const inviteStats = contest.inviteStats || {};
    const lotteryEntries = contest.lotteryEntries || {};
    const current = inviteStats[inviterUid] || {
      username: inviterUsername,
      successfulInvites: 0,
      lotteryCodes: []
    };

    let lotteryCode = generateLotteryCode(contest.id);
    while (lotteryEntries[lotteryCode]) {
      lotteryCode = generateLotteryCode(contest.id);
    }

    tx.update(contestRef, {
      [`inviteStats.${inviterUid}.username`]: inviterUsername,
      [`inviteStats.${inviterUid}.successfulInvites`]: (current.successfulInvites || 0) + 1,
      [`inviteStats.${inviterUid}.lotteryCodes`]: [...(current.lotteryCodes || []), lotteryCode],
      [`lotteryEntries.${lotteryCode}`]: {
        code: lotteryCode,
        inviterUid,
        inviterUsername,
        invitedEmail,
        registeredUserId,
        createdAt: Date.now()
      }
    });

    return { lotteryCode, contestId: contest.id };
  });

  return result as any;
}
