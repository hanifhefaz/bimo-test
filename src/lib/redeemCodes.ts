// Redeem Code System for Newbies Room
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
  deleteDoc,
  addDoc,
  increment,
  runTransaction
} from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { db, rtdb } from './firebase';
import { updateCredits, sendMessage, addXP, incrementRedeemsWeekly } from './firebaseOperations';

export interface RedeemCode {
  id: string;
  code: string;
  credits: number;
  createdAt: number;
  expiresAt: number;
  // track every user who has claimed the code
  redeemedBy?: { userId: string; username: string; redeemedAt: number }[];
  roomId: string;
}

// helpers used by both business logic and unit tests
export function canRedeem(code: RedeemCode, userId: string): boolean {
  const now = Date.now();
  if (now > code.expiresAt) return false;
  return !code.redeemedBy?.some(r => r.userId === userId);
}

export function addRedeemer(
  code: RedeemCode,
  userId: string,
  username: string,
  now: number = Date.now()
): RedeemCode {
  const redeemedBy = [...(code.redeemedBy || []), { userId, username, redeemedAt: now }];
  return { ...code, redeemedBy };
}

// Generate a random 5-digit alphanumeric code
export function generateCode(): string {
  const chars = '1234567890';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a new redeem code for the Newbies room
export async function generateRedeemCode(roomId: string): Promise<RedeemCode | null> {
  const now = Date.now();
  const code = generateCode();
  const credits = (Math.floor(Math.random() * 5) + 5) / 100;

  const codeData: Omit<RedeemCode, 'id'> = {
    code,
    credits,
    createdAt: now,
    expiresAt: now + (60 * 1000), // Expires in 1 minute
    redeemedBy: [], // Initialize as empty array
    roomId
  };

  const codeId = `code_${now}`;
  await setDoc(doc(db, 'redeemCodes', codeId), codeData);

  // Store in RTDB for real-time access
  const rtdbRef = ref(rtdb, `redeemCodes/${roomId}/current`);
  await set(rtdbRef, {
    ...codeData,
    id: codeId
  });

  return { id: codeId, ...codeData };
}

// Get the current active code for a room
export async function getActiveCode(roomId: string): Promise<RedeemCode | null> {
  const codesRef = collection(db, 'redeemCodes');
  const now = Date.now();

  const q = query(
    codesRef,
    where('roomId', '==', roomId),
    where('expiresAt', '>', now),
    orderBy('expiresAt', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RedeemCode;
}

// Redeem a code
export async function redeemCode(
  userId: string,
  username: string,
  codeStr: string,
  roomId: string
): Promise<{ success: boolean; message: string; credits?: number }> {
  const codesRef = collection(db, 'redeemCodes');
  const now = Date.now();

  // Find the code
  const q = query(
    codesRef,
    where('roomId', '==', roomId),
    where('code', '==', codeStr.toUpperCase()),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, message: 'Invalid code' };
  }

  const codeDoc = snapshot.docs[0];
  const codeData = codeDoc.data() as RedeemCode;

  // use helper to decide if this user can claim
  if (!canRedeem(codeData, userId)) {
    if (now > codeData.expiresAt) {
      return { success: false, message: 'This code has expired' };
    }
    return { success: false, message: 'You already redeemed this code' };
  }

  // Append user to redeemedBy array and persist
  const newRedeemedBy = addRedeemer(codeData, userId, username, now).redeemedBy!;
  await updateDoc(doc(db, 'redeemCodes', codeDoc.id), {
    redeemedBy: newRedeemedBy
  });

  // Increment user's weekly redeems counter for leaderboards (handles
  // automatic weekly reset if needed).
  try {
    await incrementRedeemsWeekly(userId);
  } catch (e) {
    console.warn('Failed to increment redeemsThisWeek for user:', e);
  }

  // Award credits
  await updateCredits(userId, codeData.credits);

  // Record transaction
  await addDoc(collection(db, 'transactions'), {
    from: 'system',
    to: userId,
    participants: [userId],
    toUsername: username,
    amount: codeData.credits,
    type: 'redeem',
    description: `Redeemed code ${codeStr.toUpperCase()}`,
    timestamp: serverTimestamp()
  });

  // Do NOT remove from RTDB; other users can still redeem until expiration

  // Award XP for redeeming a code
  try {
    await addXP(userId, 10);
  } catch (e) {
    console.warn('Failed to award XP for code redemption:', e);
  }

  return {
    success: true,
    message: `🎉 ${username} redeemed code ${codeStr.toUpperCase()} and won ${codeData.credits} credits!`,
    credits: codeData.credits
  };
}

// Check if it's time to generate a new code (every 10 minutes)
// Uses Firestore transaction to prevent duplicate codes when multiple clients call simultaneously
// This function only generates codes based on timing - independent of user presence
export async function checkAndGenerateCode(roomId: string): Promise<RedeemCode | null> {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000; // 10 minute interval

  // Use a transaction to atomically check and update the last generation time
  // This prevents race conditions when multiple clients call this simultaneously
  const lastGenRef = doc(db, 'redeemCodeMeta', roomId);
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const lastGenDoc = await transaction.get(lastGenRef);
      
      const lastGen = lastGenDoc.exists() ? (lastGenDoc.data().lastGenerated || 0) : 0;
      
      // Check if enough time has passed since last generation
      if (now - lastGen < tenMinutes) {
        return null; // Not time yet, abort transaction
      }
      
      // Atomically update the last generation time BEFORE generating the code
      // This ensures no other client can pass this check while we're generating
      transaction.set(lastGenRef, { 
        lastGenerated: now,
        generatingBy: `client_${now}` // Track which client is generating
      });
      
      return { shouldGenerate: true };
    });
    
    if (!result || !result.shouldGenerate) {
      return null;
    }
    
    // Generate new code outside the transaction (after we've claimed the slot)
    const newCode = await generateRedeemCode(roomId);
    return newCode;
  } catch (error) {
    // Transaction failed (likely due to concurrent write), skip generation
    console.warn('Code generation skipped due to concurrent request:', error);
    return null;
  }
}

// Subscribe to code announcements
export function subscribeToRedeemCodes(
  roomId: string,
  callback: (code: RedeemCode | null) => void
): () => void {
  const rtdbRef = ref(rtdb, `redeemCodes/${roomId}/current`);

  const handler = onValue(rtdbRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as RedeemCode);
    } else {
      callback(null);
    }
  });

  return () => off(rtdbRef);
}
