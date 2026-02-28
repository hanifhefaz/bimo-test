import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  serverTimestamp,
  increment,
  Timestamp,
  onSnapshot,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { ref, push, onValue, off, set, remove, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { db, rtdb, storage } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { COUNTRIES } from './countries';
import { UserProfile } from '@/contexts/AuthContext';

// Simple in-memory cache for user profiles to reduce repetitive reads.
// Entries expire after USER_CACHE_TTL milliseconds.
const userCache: Map<string, UserProfile> = new Map();
const userCacheTimestamps: Map<string, number> = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// helper to invalidate cached user when we know the document was modified
export function invalidateUserCache(uid: string) {
  userCache.delete(uid);
  userCacheTimestamps.delete(uid);
}

// User operations
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('usernameLower', '==', username.toLowerCase()), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
}

export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const lower = searchTerm.toLowerCase();
  // prefix search using usernameLower field; this avoids reading arbitrary documents
  const end = lower + '\uf8ff';
  const q = query(usersRef, where('usernameLower', '>=', lower), where('usernameLower', '<=', end), limit(20));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as UserProfile))
    .filter(user => user.uid !== currentUserId);
}

/**
 * Get a list of recommended users for a given profile.
 * Recommendations are computed from a sample of users, scored by matching
 * attributes (country, age proximity, gender, level proximity, shared pets)
 * Results are randomized within score groups and limited to `limit`.
 */
export async function getRecommendedUsers(
  currentUser: UserProfile,
  limitNum: number = 10
): Promise<UserProfile[]> {
  if (!currentUser) return [];

  const usersRef = collection(db, 'users');
  const q = query(usersRef, limit(200)); // fetch up to 200 for scoring
  const snapshot = await getDocs(q);

  const candidates = snapshot.docs
    .map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as UserProfile))
    .filter(u => u.uid !== currentUser.uid && !(currentUser.friends || []).includes(u.uid));

  // Compute score based ONLY on country and shared pets
  const scored = candidates.map(u => {
    let score = 0;
    if (u.country && currentUser.country && u.country === currentUser.country) score += 3;

    if (Array.isArray(u.pets) && Array.isArray(currentUser.pets)) {
      const sharedPets = u.pets.filter(p => currentUser.pets.includes(p));
      score += sharedPets.length * 2;
    }

    // slight randomness to rotate recommendations
    const randomTiebreaker = Math.random();

    return { user: u, score, randomTiebreaker };
  });

  // Sort descending by score, break ties randomly
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.randomTiebreaker - b.randomTiebreaker;
  });

  const results = scored.slice(0, limitNum).map(s => s.user);

  // Fill with remaining random users if we don’t have enough
  if (results.length < limitNum) {
    const remaining = candidates.filter(c => !results.find(r => r.uid === c.uid));
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    results.push(...remaining.slice(0, limitNum - results.length));
  }

  return results;
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const now = Date.now();
  const cached = userCache.get(uid);
  if (cached && (userCacheTimestamps.get(uid) || 0) + USER_CACHE_TTL > now) {
    return cached;
  }

  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  const user = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
  userCache.set(uid, user);
  userCacheTimestamps.set(uid, now);
  return user;
}

// Allows fetching multiple user profiles efficiently using cache and batched reads.
export async function getUsersByIds(uids: string[]): Promise<UserProfile[]> {
  const now = Date.now();
  const unique = Array.from(new Set(uids.filter(Boolean)));
  const results: UserProfile[] = [];
  const toFetch: string[] = [];

  unique.forEach(uid => {
    const cached = userCache.get(uid);
    if (cached && (userCacheTimestamps.get(uid) || 0) + USER_CACHE_TTL > now) {
      results.push(cached);
    } else {
      toFetch.push(uid);
    }
  });

  if (toFetch.length > 0) {
    // Firestore `in` queries are limited to 10 elements per call
    while (toFetch.length) {
      const batchIds = toFetch.splice(0, 10);
      const q = query(collection(db, 'users'), where('__name__', 'in', batchIds));
      const snap = await getDocs(q);
      snap.docs.forEach(ds => {
        const u = { uid: ds.id, ...ds.data() } as UserProfile;
        results.push(u);
        userCache.set(u.uid, u);
        userCacheTimestamps.set(u.uid, now);
      });
    }
  }

  // preserve order of the input array and filter out any missing users
  return uids
    .map(uid => results.find(u => u.uid === uid))
    .filter((u): u is UserProfile => !!u);
}

// Helper to build a participants array for transactions. Excludes 'system' and 'all' sentinel values.
export function txParticipants(from: any, to: any, extra: string[] = []): string[] {
  const ids: string[] = [];
  if (typeof from === 'string' && from !== 'system' && from !== 'all') ids.push(from);
  if (typeof to === 'string' && to !== 'system' && to !== 'all') ids.push(to);
  if (Array.isArray(extra) && extra.length) ids.push(...extra.filter(x => typeof x === 'string'));
  return Array.from(new Set(ids));
}

// Upload a profile image to Firebase Storage and update user's document
export async function uploadProfileImage(userId: string, file: File): Promise<{ url: string; path: string }> {
  if (!file) throw new Error('No file provided');
  // Basic validation
  if (!file.type || !file.type.startsWith('image/')) throw new Error('Invalid image file');
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) throw new Error('Image too large (max 5MB)');

  const path = `profileImages/${userId}/${Date.now()}_${file.name}`;
  const sRef = storageRef(storage, path);

  try {
    await uploadBytes(sRef, file, { contentType: file.type });
    const url = await getDownloadURL(sRef);
    // Update user doc
    await updateDoc(doc(db, 'users', userId), {
      profileImageUrl: url,
      profileImagePath: path
    });
    return { url, path };
  } catch (error: any) {
    console.error('Failed to upload profile image:', error);
    const rawMsg = (error?.message || '').toString();

    // Heuristic: network / preflight / CORS-related failures often show up as 'Network Error', 'Failed to fetch', 'ERR_FAILED' or preflight failing
    const isNetworkOrCors = /cors|cross\-origin|preflight|network|failed|ERR_FAILED|Failed to fetch/i.test(rawMsg) || rawMsg === '';
    if (isNetworkOrCors) {
      throw new Error('Upload failed due to a network/CORS issue. Ensure your Firebase Storage bucket CORS allows requests from your app origin (e.g. http://localhost:8080). See README for instructions.');
    }

    throw new Error(rawMsg || 'Upload failed');
  }
}

// ==================== USER ALERTS SYSTEM ====================

export interface UserAlert {
  id?: string;
  userId: string;
  // extend with contest_win so winners can receive a bimo alert
  type: 'like' | 'pet_feed' | 'refund' | 'daily_credits' | 'gift_received' | 'contest_win';
  message: string;
  read: boolean;
  createdAt: any;
}

// Get unread alerts for a user
export async function getUnreadAlerts(userId: string): Promise<UserAlert[]> {
  const alertsRef = collection(db, 'userAlerts');
  const q = query(alertsRef, where('userId', '==', userId), where('read', '==', false), orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAlert));
}

// Get all alerts for a user
export async function getAllAlerts(userId: string, limitNum: number = 50): Promise<UserAlert[]> {
  const alertsRef = collection(db, 'userAlerts');
  const q = query(alertsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(limitNum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAlert));
}

// Mark alerts as read (batch write to avoid multiple roundtrips)
export async function markAlertsAsRead(alertIds: string[]): Promise<void> {
  if (!alertIds || alertIds.length === 0) return;
  const batch = writeBatch(db);
  alertIds.forEach(alertId => {
    const alertRef = doc(db, 'userAlerts', alertId);
    batch.update(alertRef, { read: true });
  });
  await batch.commit();
}

// Create an alert for a user
export async function createUserAlert(userId: string, type: UserAlert['type'], message: string): Promise<void> {
  await addDoc(collection(db, 'userAlerts'), {
    userId,
    type,
    message,
    read: false,
    createdAt: serverTimestamp()
  });
}

// Get alert counts by type
export async function getAlertCounts(userId: string): Promise<{ likes: number; petFeeds: number; refunds: number; dailyCredits: number; contestWins: number; total: number }> {
  const alerts = await getUnreadAlerts(userId);
  const likes = alerts.filter(a => a.type === 'like').length;
  const petFeeds = alerts.filter(a => a.type === 'pet_feed').length;
  const refunds = alerts.filter(a => a.type === 'refund').length;
  const dailyCredits = alerts.filter(a => a.type === 'daily_credits').length;
  const contestWins = alerts.filter(a => a.type === 'contest_win').length;
  return { likes, petFeeds, refunds, dailyCredits, contestWins, total: alerts.length };
}

export async function removeProfileImage(userId: string, path?: string): Promise<void> {
  try {
    if (path) {
      const sRef = storageRef(storage, path);
      await deleteObject(sRef);
    }
  } catch (e) {
    // ignore deletion errors
    console.warn('Failed to delete profile image:', e);
  }
  // Remove fields from user doc
  await updateDoc(doc(db, 'users', userId), {
    profileImageUrl: null,
    profileImagePath: null
  });
  invalidateUserCache(userId);
}

// Friend operations
export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<{ success: boolean; message: string }> {
  if (fromUserId === toUserId) {
    return { success: false, message: 'Cannot send a request to yourself' };
  }

  // read both sides to enforce invariants and invalidate caches later
  const toUserRef = doc(db, 'users', toUserId);
  const toSnap = await getDoc(toUserRef);
  if (!toSnap.exists()) {
    return { success: false, message: 'User not found' };
  }
  const toUser = toSnap.data() as UserProfile;

  if (toUser.friends && toUser.friends.includes(fromUserId)) {
    return { success: false, message: 'You are already friends with this user' };
  }

  if (toUser.friendRequests?.includes(fromUserId)) {
    return { success: false, message: 'Friend request already sent' };
  }

  // add incoming request on recipient and record outgoing on sender
  const fromUserRef = doc(db, 'users', fromUserId);
  const batch = writeBatch(db);
  batch.update(toUserRef, {
    friendRequests: arrayUnion(fromUserId)
  });
  batch.update(fromUserRef, {
    sentFriendRequests: arrayUnion(toUserId)
  });

  await batch.commit();

  invalidateUserCache(toUserId);
  invalidateUserCache(fromUserId);

  return { success: true, message: 'Friend request sent!' };
}

export async function acceptFriendRequest(userId: string, friendId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const friendRef = doc(db, 'users', friendId);

  const batch = writeBatch(db);
  batch.update(userRef, {
    friends: arrayUnion(friendId),
    friendRequests: arrayRemove(friendId)
  });
  // Also remove the outgoing marker from the requester
  batch.update(friendRef, {
    friends: arrayUnion(userId),
    sentFriendRequests: arrayRemove(userId)
  });

  await batch.commit();

  invalidateUserCache(userId);
  invalidateUserCache(friendId);
}

export async function declineFriendRequest(userId: string, friendId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const friendRef = doc(db, 'users', friendId);

  const batch = writeBatch(db);
  batch.update(userRef, {
    friendRequests: arrayRemove(friendId)
  });
  // also clear the outgoing marker on the original requester
  batch.update(friendRef, {
    sentFriendRequests: arrayRemove(userId)
  });

  await batch.commit();

  invalidateUserCache(userId);
  invalidateUserCache(friendId);
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const friendRef = doc(db, 'users', friendId);

  await updateDoc(userRef, {
    friends: arrayRemove(friendId)
  });
  invalidateUserCache(userId);

  await updateDoc(friendRef, {
    friends: arrayRemove(userId)
  });
  invalidateUserCache(friendId);
}

// Credits operations
export async function updateCredits(userId: string, amount: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    credits: increment(amount)
  });
  invalidateUserCache(userId);
}

export interface Transaction {
  id?: string;
  from: string;
  fromUsername?: string;
  participants?: string[];
  to: string;
  toUsername?: string;
  amount: number;
  type: 'transfer' | 'gift' | 'purchase' | 'game' | 'daily' | 'merchant' | 'refund' | 'boost' | 'credits_pack' | 'level' | 'redeem' | 'redeem_reward' | 'gift_conversion';
  description?: string;
  // Optional metadata for gifts and showers
  giftId?: string;
  giftName?: string;
  giftEmoji?: string;
  recipientsCount?: number;
  roomId?: string;
  timestamp: any;
}

// Credit packs for store
export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  emoji: string;
  popular?: boolean;
  name?: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  // Standard: 10,000 USD for $5 (grants Merchant with purple username)
  { id: 'pack_standard', credits: 50.00, price: 10.00, emoji: '💰', name: 'Standard' },
  // Pro: 25,000 USD for $10 (grants Merchant with gold username)
  { id: 'pack_pro', credits: 100.00, price: 20.00, emoji: '💎', popular: true, name: 'Pro' },
  // Elite: 100,000 USD for $20 (grants Mentor with pink username)
  { id: 'pack_elite', credits: 500.00, price: 50.00, emoji: '👑', name: 'Elite' },
];

// XP Boosts
export interface XPBoost {
  id: string;
  name: string;
  multiplier: number;
  durationHours: number;
  price: number;
  emoji: string;
}

export const XP_BOOSTS: XPBoost[] = [
  { id: 'boost_1h_2x', name: '2x XP (1h)', multiplier: 2, durationHours: 1, price: 0.10, emoji: '⚡' },
  { id: 'boost_1h_3x', name: '3x XP (1h)', multiplier: 3, durationHours: 1, price: 0.20, emoji: '⚡' },
  { id: 'boost_24h_2x', name: '2x XP (24h)', multiplier: 2, durationHours: 24, price: 0.5, emoji: '🔥' },
  { id: 'boost_24h_3x', name: '3x XP (24h)', multiplier: 3, durationHours: 24, price: 0.75, emoji: '🔥' },
];

// Purchase a credit pack and automatically assign merchant/mentor roles for specific packs
export async function purchaseCreditPack(userId: string, packId: string): Promise<{ success: boolean; message: string }> {
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) return { success: false, message: 'Pack not found' };

  const user = await getUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  const userRef = doc(db, 'users', userId);

  const updates: any = {
    credits: increment(pack.credits)
  };

  const now = Date.now();
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000; // 30 days
  const FORTY_FIVE_DAYS = 45 * 24 * 60 * 60 * 1000; // 45 days for Pro pack
  const TWO_MONTHS = 60 * 24 * 60 * 60 * 1000; // 60 days

  // Standard 5k pack should grant/renew Merchant for 1 month
  if (packId === 'pack_standard') {
    updates.isMerchant = true;
    updates.merchantLevel = 'standard';
    updates.merchantExpiry = now + ONE_MONTH;
  }

  // Pro pack => Merchant for 45 days (and renew Mentor if already mentor)
  if (packId === 'pack_pro') {
    updates.isMerchant = true;
    updates.merchantLevel = 'pro';
    updates.merchantExpiry = now + FORTY_FIVE_DAYS; // 45 days for Pro pack

    // If user currently has mentor status active, renew mentor expiry
    if (user.isMentor || (user.mentorExpiry && user.mentorExpiry > now)) {
      updates.mentorExpiry = now + TWO_MONTHS;
    }
  }

  // Elite pack => Mentor (and merchant)
  if (packId === 'pack_elite') {
    updates.isMentor = true;
    updates.mentorLevel = 'elite';
    updates.mentorExpiry = now + TWO_MONTHS;
    updates.isMerchant = true; // mentors are also merchants
    updates.merchantLevel = 'elite';
    updates.merchantExpiry = now + ONE_MONTH;
  }

  await updateDoc(userRef, updates);
  // invalidate cached profile so subsequent callers fetch fresh data
  invalidateUserCache(userId);

  // Log transaction in credits (amount uses credits for clarity)
  await addDoc(collection(db, 'transactions'), {
    from: userId,
    to: 'system',
    participants: txParticipants(userId, 'system'),
    amount: pack.credits,
    type: 'credits_pack',
    description: `Purchased credit pack: ${packId}`,
    packId,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Added ${pack.credits} credits to your account.` };
}

// Admin sells a pack to a username (admin-only)
export async function sellPackToUser(adminId: string, packId: string, targetUsername: string): Promise<{ success: boolean; message: string }> {
  const admin = await getUserById(adminId);
  if (!admin || !admin.isAdmin) return { success: false, message: 'Only admins can perform sales' };

  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) return { success: false, message: 'Pack not found' };

  const target = await getUserByUsername(targetUsername);
  if (!target) return { success: false, message: 'Target user not found' };

  const userRef = doc(db, 'users', target.uid);
  const updates: any = {
    credits: increment(pack.credits)
  };

  const now = Date.now();
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000; // 30 days
  const TWO_MONTHS = 60 * 24 * 60 * 60 * 1000; // 60 days

  if (packId === 'pack_standard') {
    updates.isMerchant = true;
    updates.merchantLevel = 'standard';
    updates.merchantExpiry = now + ONE_MONTH;
  }

  if (packId === 'pack_pro') {
    updates.isMerchant = true;
    updates.merchantLevel = 'pro';
    updates.merchantExpiry = now + ONE_MONTH;

    if (target.isMentor || (target.mentorExpiry && target.mentorExpiry > now)) {
      updates.mentorExpiry = now + TWO_MONTHS;
    }
  }
  if (packId === 'pack_elite') {
    updates.isMentor = true;
    updates.mentorLevel = 'elite';
    updates.mentorExpiry = now + TWO_MONTHS;
    updates.isMerchant = true;
    updates.merchantLevel = 'elite';
    updates.merchantExpiry = now + ONE_MONTH;
  }

  await updateDoc(userRef, updates);
  invalidateUserCache(target.uid);

  await addDoc(collection(db, 'transactions'), {
    from: adminId,
    to: target.uid,
    participants: txParticipants(adminId, target.uid),
    amount: pack.credits,
    type: 'credits_pack',
    description: `Admin sold ${packId} to ${targetUsername}`,
    packId,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Sold ${pack.credits} credits to ${targetUsername}` };
}

export async function getTransactionHistory(userId: string, limitNum: number = 100): Promise<Transaction[]> {
  // Use a single indexed query on participants to avoid multiple full-collection reads.
  // We apply additional filtering in‑memory so that callers only see entries that actually
  // involve the user and that contain a non‑zero credit amount. Some legacy/edge
  // transactions (e.g. xp-only events) might slip through otherwise.
  const ref = collection(db, 'transactions');
  const q = query(
    ref,
    where('participants', 'array-contains', userId),
    orderBy('timestamp', 'desc'),
    limit(limitNum)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
    .filter(tx => {
      // only show entries with a credits amount
      if (typeof tx.amount !== 'number' || tx.amount === 0) return false;
      // make extra sure the user was either sender or receiver of this transaction
      return tx.from === userId || tx.to === userId;
    });
}

/**
 * Get gift transactions where the user is a recipient (includes showers since participants contains the user).
 * Supports pagination via startAfterDoc (a Firestore document snapshot) to fetch the next page.
 */
export async function getGiftsReceived(userId: string, limitNum: number = 20, cursorTimestamp?: number): Promise<{ gifts: Transaction[]; lastTimestamp?: number }> {
  const refCol = collection(db, 'transactions');

  // Fetch a reasonable window of candidate docs (avoid compound indexes by not ordering in query)
  const q1 = query(refCol, where('participants', 'array-contains', userId), limit(500));
  const q2 = query(refCol, where('to', '==', userId), limit(500));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  // Merge docs and dedupe by id
  const docMap = new Map<string, any>();
  snap1.docs.forEach(d => docMap.set(d.id, d));
  snap2.docs.forEach(d => docMap.set(d.id, d));

  let allDocs = Array.from(docMap.values());

  // Filter only gift transactions
  allDocs = allDocs.filter(d => d.data().type === 'gift');

  // Convert to JS objects with timestamp ms
  let withTs = allDocs.map(d => {
    const raw = d.data();
    const ts = raw.timestamp?.toMillis ? raw.timestamp.toMillis() : (typeof raw.timestamp === 'number' ? raw.timestamp : Date.now());
    return { snap: d, raw, ts };
  });

  // If cursor provided, filter for older items
  if (cursorTimestamp) {
    withTs.sort((a, b) => b.ts - a.ts);
    withTs = withTs.filter(x => x.ts < cursorTimestamp);
  }

  // Sort by timestamp desc
  withTs.sort((a, b) => b.ts - a.ts);

  // Fallback: if we found no gifts via participants/to queries, try scanning recent gifts globally
  if (withTs.length === 0) {
    try {
      const qAll = query(refCol, where('type', '==', 'gift'), orderBy('timestamp', 'desc'), limit(100));
      const snapAll = await getDocs(qAll);
      const recent = snapAll.docs
        .map(d => ({ snap: d, raw: d.data(), ts: d.data().timestamp?.toMillis ? d.data().timestamp.toMillis() : (typeof d.data().timestamp === 'number' ? d.data().timestamp : Date.now()) }))
        .filter(x => {
          // include if recipient is user or participants contains user
          const toId = x.raw.to;
          const parts = x.raw.participants || [];
          return toId === userId || (Array.isArray(parts) && parts.includes(userId));
        });

      withTs = recent;
    } catch (e) {
      // ignore fallback errors
      console.warn('Fallback gift scan failed:', e);
    }
  }

  const sliced = withTs.slice(0, limitNum);
  const gifts = sliced.map(s => ({ id: s.snap.id, ...s.raw } as Transaction));
  const lastTimestamp = sliced.length > 0 ? sliced[sliced.length - 1].ts : undefined;

  return { gifts, lastTimestamp };
}

/**
 * Get gift transactions sent by a user (includes showers as a single aggregated transaction).
 */
export async function getGiftsSent(userId: string, limitNum: number = 20, cursorTimestamp?: number): Promise<{ gifts: Transaction[]; lastTimestamp?: number }> {
  const refCol = collection(db, 'transactions');

  // Fetch candidate docs (from sender)
  const q = query(refCol, where('from', '==', userId), limit(500));
  const snap = await getDocs(q);

  let docs = snap.docs.filter(d => d.data().type === 'gift');

  let withTs = docs.map(d => {
    const raw = d.data();
    const ts = raw.timestamp?.toMillis ? raw.timestamp.toMillis() : (typeof raw.timestamp === 'number' ? raw.timestamp : Date.now());
    return { snap: d, raw, ts };
  });

  if (cursorTimestamp) {
    withTs.sort((a, b) => b.ts - a.ts);
    withTs = withTs.filter(x => x.ts < cursorTimestamp);
  }

  withTs.sort((a, b) => b.ts - a.ts);

  // Fallback: try a recent global scan if no results
  if (withTs.length === 0) {
    try {
      const qAll = query(refCol, where('type', '==', 'gift'), orderBy('timestamp', 'desc'), limit(200));
      const snapAll = await getDocs(qAll);
      const recent = snapAll.docs
        .map(d => ({ snap: d, raw: d.data(), ts: d.data().timestamp?.toMillis ? d.data().timestamp.toMillis() : (typeof d.data().timestamp === 'number' ? d.data().timestamp : Date.now()) }))
        .filter(x => x.raw.from === userId);

      withTs = recent;
    } catch (e) {
      console.warn('Fallback gift scan failed for sent gifts:', e);
    }
  }

  const sliced = withTs.slice(0, limitNum);
  const gifts = sliced.map(s => ({ id: s.snap.id, ...s.raw } as Transaction));
  const lastTimestamp = sliced.length > 0 ? sliced[sliced.length - 1].ts : undefined;

  return { gifts, lastTimestamp };
}


export async function transferCredits(fromUserId: string, toUsername: string, amount: number): Promise<{ success: boolean; message: string }> {
  const toUser = await getUserByUsername(toUsername);
  const fromUser = await getUserById(fromUserId);

  if (!toUser) {
    return { success: false, message: 'User not found' };
  }

  if (toUser.uid === fromUserId) {
    return { success: false, message: 'Cannot transfer credits to yourself' };
  }

  if (!fromUser || fromUser.credits < amount) {
    return { success: false, message: 'Insufficient credits' };
  }

  await updateCredits(fromUserId, -amount);
  await updateCredits(toUser.uid, amount);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: fromUserId,
    fromUsername: fromUser.username,
    to: toUser.uid,
    toUsername: toUser.username,
    participants: txParticipants(fromUserId, toUser.uid),
    amount,
    type: 'transfer',
    description: `Transfer to ${toUsername}`,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Transferred ${amount} credits to ${toUsername}` };
}

// Chatroom operations
export interface Chatroom {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  moderators: string[];
  isPrivate: boolean;
  topic: string;
  participants: string[];
  createdAt: any;
}

// Helper: create a URL-safe slug from a room name
function roomNameToSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, '') // remove unsafe chars
    .replace(/\s+/g, '-') // spaces -> dashes
    .replace(/-+/g, '-') // collapse dashes
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function createChatroom(name: string, ownerId: string, ownerName: string, isPrivate: boolean = false): Promise<string> {
  // Use a transactional name-claim to prevent duplicate rooms when callers run concurrently.
  const slug = roomNameToSlug(name);
  const nameIndexRef = doc(db, 'chatroomNames', slug);
  const chatroomsRef = collection(db, 'chatrooms');
  // Pre-allocate a chatroom doc ref so we can set it inside the transaction
  const newRoomRef = doc(chatroomsRef);

  try {
    await runTransaction(db, async (tx) => {
      const nameSnap = await tx.get(nameIndexRef);
      if (nameSnap.exists()) {
        throw new Error('A chatroom with this name already exists');
      }

      // Create the chatroom document
      tx.set(newRoomRef, {
        name,
        ownerId,
        ownerName,
        moderators: [],
        isPrivate,
        topic: '',
        participants: [ownerId],
        createdAt: serverTimestamp()
      });

      // Claim the name in the index to make future calls fail
      tx.set(nameIndexRef, {
        chatroomId: newRoomRef.id,
        name,
        createdAt: serverTimestamp()
      });
    });

    return newRoomRef.id;
  } catch (e: any) {
    // Surface the error message while keeping previous behavior
    throw new Error(e?.message || 'Failed to create chatroom');
  }
}

export async function getChatrooms(): Promise<Chatroom[]> {
  const chatroomsRef = collection(db, 'chatrooms');
  const q = query(chatroomsRef, where('isPrivate', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chatroom));
}


export async function getUserChatrooms(userId: string): Promise<Chatroom[]> {
  const chatroomsRef = collection(db, 'chatrooms');
  const q = query(chatroomsRef, where('ownerId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chatroom));
}

export async function searchChatrooms(searchTerm: string): Promise<Chatroom[]> {
  const chatroomsRef = collection(db, 'chatrooms');
  const q = query(chatroomsRef, where('isPrivate', '==', false));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Chatroom))
    .filter(room => room.name.toLowerCase().includes(searchTerm.toLowerCase()));
}

// Returns true if user was newly added, false if already a participant
export async function joinChatroom(roomId: string, userId: string): Promise<boolean> {
  const roomRef = doc(db, 'chatrooms', roomId);

  // Use transaction to check if already a participant to avoid duplicate announcements
  const wasNew = await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists()) return false;
    const data: any = snap.data();
    const participants: string[] = data.participants || [];
    if (participants.includes(userId)) {
      return false; // Already in room
    }
    tx.update(roomRef, { participants: arrayUnion(userId) });
    return true;
  });

  return wasNew;
}

export async function leaveChatroom(roomId: string, userId: string): Promise<void> {
  const roomRef = doc(db, 'chatrooms', roomId);
  await updateDoc(roomRef, {
    participants: arrayRemove(userId)
  });
}

export async function getChatroomById(roomId: string): Promise<Chatroom | null> {
  const docRef = doc(db, 'chatrooms', roomId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Chatroom;
}

// Get all chatrooms where the user is a participant
export async function getChatroomsForParticipant(userId: string): Promise<Chatroom[]> {
  const chatroomsRef = collection(db, 'chatrooms');
  const q = query(chatroomsRef, where('participants', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chatroom));
}

// Remove a user from all chatrooms they are currently in
export async function removeUserFromAllRooms(userId: string, announce: boolean = false): Promise<void> {
  try {
    const rooms = await getChatroomsForParticipant(userId);
    // Resolve username once to avoid repeated lookups and to compose a proper announcement
    const user = await getUserById(userId);
    const username = user?.username || 'Someone';

    for (const r of rooms) {
      try {
        // Use a transaction to atomically remove the user from the participants array
        const roomRef = doc(db, 'chatrooms', r.id);
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(roomRef);
          if (!snap.exists()) return;
          const data: any = snap.data();
          const participants: string[] = data.participants || [];
          if (!participants.includes(userId)) return;
          const updated = participants.filter((p) => p !== userId);
          tx.update(roomRef, { participants: updated });
        });

        // Clean up any per-user bot notification markers in RTDB for this room
        try {
          const noteRef = ref(rtdb, `botNotifications/${r.id}/${userId}`);
          await remove(noteRef);
        } catch (e) { /* ignore */ }

        // Announce to room via RTDB messages when requested (e.g., inactivity logout or explicit logout)
        if (announce) {
          try {
            const roomName = (r && (r as any).name) ? (r as any).name : 'Room';
            const content = `${roomName}: ${username} left the room${announce ? ' (logged out)' : ''}`;
            // Use sendMessage helper so messages go through the same pipeline and get rendered like normal leave messages
            sendMessage(r.id, {
              roomId: r.id,
              senderId: 'system',
              senderName: 'System',
              senderAvatar: '📢',
              content,
              type: 'system'
            });
          } catch (e) {
            console.warn('Failed to announce logout in room:', r.id, e);
          }
        }
      } catch (e) {
        console.warn('Failed to remove user from room during transactional removal:', r.id, e);
      }
    }
  } catch (e) {
    console.error('Failed to remove user from all rooms:', e);
  }
}

// Real-time messages
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderAvatarItems?: {
    background?: string;
    face?: string;
    accessory?: string;
    frame?: string;
  };
  senderIsMerchant?: boolean;
  senderMerchantLevel?: string; // used to distinguish gold vs purple names
  senderIsMentor?: boolean;
  senderIsAdmin?: boolean;
  senderIsStaff?: boolean; // internal staff flag
  content: string;
  type: 'message' | 'system' | 'gift' | 'game' | 'action';
  timestamp: number;
}

export function sendMessage(roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
  const messagesRef = ref(rtdb, `messages/${roomId}`);
  const payload: any = { ...message, timestamp: Date.now() };
  Object.keys(payload).forEach(k => {
    if (payload[k] === undefined) delete payload[k];
  });
  push(messagesRef, payload);
}

export function subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = ref(rtdb, `messages/${roomId}`);

  const handler = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key!, ...child.val() });
    });
    callback(messages.sort((a, b) => a.timestamp - b.timestamp));
  });

  return () => off(messagesRef);
}

// Private messages
export function getPrivateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export function sendPrivateMessage(conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId'>, recipientId?: string): void {
  const messagesRef = ref(rtdb, `privateMessages/${conversationId}`);
  const payload: any = { ...message, timestamp: Date.now() };
  Object.keys(payload).forEach(k => {
    if (payload[k] === undefined) delete payload[k];
  });
  push(messagesRef, payload);

  // Increment unread count for recipient if provided
  if (recipientId) {
    incrementUnreadCount(recipientId, conversationId);
  }
}

// Increment unread message count
export async function incrementUnreadCount(userId: string, conversationId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    [`unreadMessages.${conversationId}`]: increment(1)
  });
  invalidateUserCache(userId);
}

// Clear unread messages for a conversation
export async function clearUnreadMessages(userId: string, conversationId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    [`unreadMessages.${conversationId}`]: 0
  });
  invalidateUserCache(userId);
}

export function subscribeToPrivateMessages(conversationId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = ref(rtdb, `privateMessages/${conversationId}`);

  const handler = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key!, roomId: conversationId, ...child.val() });
    });
    callback(messages.sort((a, b) => a.timestamp - b.timestamp));
  });

  return () => off(messagesRef);
}

// Store items
import dogAnim from '@/assets/animations/dog.json';
import rabbitAnim from '@/assets/animations/rabbit.json';
import chimpAnim from '@/assets/animations/chimpanzee.json';
import racehorseAnim from '@/assets/animations/racehorse.json';
import roosterAnim from '@/assets/animations/rooster.json';
import snakeAnim from '@/assets/animations/snake.json';
import tRexAnim from '@/assets/animations/t-rex.json';
import tigerAnim from '@/assets/animations/tiger.json';
// Asset animations
import rocketAnim from '@/assets/animations/rocket.json';
import skateboardAnim from '@/assets/animations/skateboard.json';
import bicycleAnim from '@/assets/animations/bicycle.json';
import motorcycleAnim from '@/assets/animations/motorcycle.json';
import carAnim from '@/assets/animations/car.json';
import automobileAnim from '@/assets/animations/automobile.json';
import helicopterAnim from '@/assets/animations/helicopter.json';
import speedboatAnim from '@/assets/animations/speedboat.json';
import airplaneAnim from '@/assets/animations/airplane.json';
import ufoAnim from '@/assets/animations/ufo.json';
import owlAnim from '@/assets/animations/owl.json';
import oxAnim from '@/assets/animations/ox.json';
import turtleAnim from '@/assets/animations/turtle.json';
import unicornAnim from '@/assets/animations/unicorn.json';
import whaleAnim from '@/assets/animations/whale.json';

// Helper: validate animation JSON
const isValidAnim = (a: any) => a && typeof a === 'object' && ('layers' in a || 'v' in a);

// Price helper: scale price with power (base unit = 500 credits)
const priceFromPower = (power: number) => 2.5 * Math.max(1, Math.round(power));

export interface StoreItem {
  id: string;
  name: string;
  type: 'pet' | 'asset' | 'merchant';
  price: number;
  power?: number;
  emoji: string;
  description: string;
  dailyCredits?: number;
  // optional Lottie animation data (local JSON import or remote URL string)
  animationData?: any;
}

export const STORE_ITEMS: StoreItem[] = [
  // Pets (animals)
  { id: 'rooster', name: 'Rooster', type: 'pet', power: 1, price: priceFromPower(1), emoji: '', description: 'Bright and loud', animationData: roosterAnim },
  { id: 'dog', name: 'Dog', type: 'pet', power: 2, price: priceFromPower(2), emoji: '', description: 'A loyal companion', animationData: dogAnim },
  { id: 'rabbit', name: 'Rabbit', type: 'pet', power: 3, price: priceFromPower(4), emoji: '', description: 'Soft and energetic', animationData: rabbitAnim },
  { id: 'turtle', name: 'Turtle', type: 'pet', power: 4, price: priceFromPower(6), emoji: '', description: 'Slow but resilient', animationData: turtleAnim },
  { id: 'chimpanzee', name: 'Chimpanzee', type: 'pet', power: 5, price: priceFromPower(10), emoji: '', description: 'Curious and playful', animationData: chimpAnim },
  { id: 'racehorse', name: 'Racehorse', type: 'pet', power: 6, price: priceFromPower(20), emoji: '', description: 'Fast and elegant', animationData: racehorseAnim },
  { id: 'snake', name: 'Snake', type: 'pet', power: 7, price: priceFromPower(40), emoji: '', description: 'Sly and swift', animationData: snakeAnim },
  { id: 'owl', name: 'Owl', type: 'pet', power: 8, price: priceFromPower(50), emoji: '', description: 'Wise and silent', animationData: owlAnim },
  { id: 'ox', name: 'Ox', type: 'pet', power: 12, price: priceFromPower(70), emoji: '', description: 'Strong and steady', animationData: oxAnim },
  { id: 'tiger', name: 'Tiger', type: 'pet', power: 18, price: priceFromPower(80), emoji: '', description: 'Strong and fierce', animationData: tigerAnim },
  { id: 'unicorn', name: 'Unicorn', type: 'pet', power: 30, price: priceFromPower(120), emoji: '', description: 'Magical and rare', animationData: unicornAnim },
  { id: 't-rex', name: 'T-Rex', type: 'pet', power: 50, price: priceFromPower(150), emoji: '', description: 'An ancient apex predator', animationData: tRexAnim },
  { id: 'whale', name: 'Whale', type: 'pet', power: 70, price: priceFromPower(200), emoji: '', description: 'Massive and majestic', animationData: whaleAnim },
  // Assets (transportation)

  { id: 'skateboard', name: 'Skateboard', type: 'asset', price: 1.00, emoji: '🛹', description: 'Generates 0.02 USD daily', dailyCredits: 0.02, animationData: skateboardAnim },
  { id: 'bicycle', name: 'Bicycle', type: 'asset', price: 1.50, emoji: '🚲', description: 'Generates 0.03 USD daily', dailyCredits: 0.03, animationData: bicycleAnim },
  { id: 'motorcycle', name: 'Motorcycle', type: 'asset', price: 5.00, emoji: '🏍️', description: 'Generates 0.11 USD daily', dailyCredits: 0.11, animationData: motorcycleAnim },
  { id: 'car', name: 'Car', type: 'asset', price: 10.00, emoji: '🚗', description: 'Generates 0.23 USD daily', dailyCredits: 0.23, animationData: carAnim },
  { id: 'automobile', name: 'Automobile', type: 'asset', price: 15.00, emoji: '🚜', description: 'Generates 0.36 USD daily', dailyCredits: 0.36, animationData: automobileAnim },
  { id: 'rocket', name: 'Rocket', type: 'asset', price: 20.00, emoji: '🛴', description: 'Generates 0.50 USD daily', dailyCredits: 0.50, animationData: rocketAnim },
  { id: 'helicopter', name: 'Helicopter', type: 'asset', price: 30.00, emoji: '🚁', description: 'Generates 0.78 USD daily', dailyCredits: 0.78, animationData: helicopterAnim },
  { id: 'speedboat', name: 'Speedboat', type: 'asset', price: 50.00, emoji: '🚤', description: 'Generates 1.40 USD daily', dailyCredits: 1.40, animationData: speedboatAnim },
  { id: 'airplane', name: 'Airplane', type: 'asset', price: 100.00, emoji: '✈️', description: 'Generates 2.90 USD daily', dailyCredits: 2.90, animationData: airplaneAnim },
  { id: 'ufo', name: 'UFO', type: 'asset', price: 200.00, emoji: '🛸', description: 'Generates 6.00 USD daily', dailyCredits: 5.00, animationData: ufoAnim }


];


export const GIFTS: StoreItem[] = [
  { id: 'rose', name: 'Rose', type: 'asset', price: 0.01, emoji: '🌹', description: 'A beautiful rose' },
{
  id: 'happy_ramadan',
  name: 'Happy Ramadan',
  type: 'asset',
  price: 0.05,
  emoji: '🎁🌙',
  description: 'Gift box with sweets, dates, and Ramadan treats'
},
{
  id: 'sahari',
  name: 'Sahari',
  type: 'asset',
  price: 0.05,
  emoji: '🏮🌅',
  description: 'Traditional lantern used during Suhoor (pre-dawn meal)'
},
{
  id: 'iftar',
  name: 'Iftar',
  type: 'asset',
  price: 0.05,
  emoji: '🍽️🌙',
  description: 'Shared platter with dates, soup, and traditional Ramadan dishes'
},
  { id: 'chocolate', name: 'Chocolate', type: 'asset', price: 0.05, emoji: '🍫', description: 'Sweet treat' },
  { id: 'teddy', name: 'Teddy Bear', type: 'asset', price: 0.10, emoji: '🧸', description: 'Cuddly friend' },
  { id: 'lollipop', name: 'Lollipop', type: 'asset', price: 0.20, emoji: '🍭', description: 'Colorful candy' },
  { id: 'candy', name: 'Candy', type: 'asset', price: 0.25, emoji: '🍬', description: 'Sweet delight' },
  { id: 'bouquet', name: 'Bouquet', type: 'asset', price: 1.00, emoji: '💐', description: 'A lovely flower bouquet' },
  { id: 'cherry', name: 'Cherries', type: 'asset', price: 1.00, emoji: '🍒', description: 'Juicy cherries' },
  { id: 'cookie', name: 'Cookie', type: 'asset', price: 1.00, emoji: '🍪', description: 'Yummy cookie' },
  { id: 'cake', name: 'Cake', type: 'asset', price: 0.5, emoji: '🎂', description: 'Sweet celebration cake' },
  { id: 'cupcake', name: 'Cupcake', type: 'asset', price: 0.10, emoji: '🧁', description: 'Mini sweet cake' },
  { id: 'crown', name: 'Crown', type: 'asset', price: 0.50, emoji: '👑', description: 'Royal gift' },
  { id: 'star', name: 'Star', type: 'asset', price: 0.05, emoji: '⭐', description: 'Shiny star' },
  { id: 'heart', name: 'Heart', type: 'asset', price: 1.00, emoji: '❤️', description: 'Love from the heart' },
  { id: 'purple_heart', name: 'Purple Heart', type: 'asset', price: 1.00, emoji: '💜', description: 'Lovely purple heart' },
  { id: 'yellow_heart', name: 'Yellow Heart', type: 'asset', price: 1.00, emoji: '💛', description: 'Bright yellow heart' },
  { id: 'blue_heart', name: 'Blue Heart', type: 'asset', price: 1.00, emoji: '💙', description: 'Cool blue heart' },
  { id: 'balloon', name: 'Balloon', type: 'asset', price: 1.00, emoji: '🎈', description: 'Party balloon' },
  { id: 'gift_box', name: 'Gift Box', type: 'asset', price: 3.00, emoji: '🎁', description: 'A wrapped gift' },
  { id: 'tulip', name: 'Tulip', type: 'asset', price: 1.00, emoji: '🌷', description: 'Bright tulip flower' },
  { id: 'sunflower', name: 'Sunflower', type: 'asset', price: 1.00, emoji: '🌻', description: 'Sunny flower' },
  { id: 'hibiscus', name: 'Hibiscus', type: 'asset', price: 1.00, emoji: '🌺', description: 'Tropical flower' },
  { id: 'blossom', name: 'Blossom', type: 'asset', price: 1.00, emoji: '🌼', description: 'Cheerful bloom' },
  { id: 'butterfly', name: 'Butterfly', type: 'asset', price: 1.00, emoji: '🦋', description: 'Beautiful butterfly' },
  { id: 'diamond_gift', name: 'Diamond', type: 'asset', price: 5.00, emoji: '💎', description: 'Precious diamond gift' },
];

// Emoticon Packs for Store - users can buy these to use emoticons in chat
export interface EmoticonPack {
  id: string;
  name: string;
  price: number;
  emoticons: string[];
  description: string;
}

export const EMOTICON_PACKS: EmoticonPack[] = [
  {
    id: 'pack_faces',
    name: 'Faces Pack',
    price: 0.50,
    emoticons: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '😊',
      '😇', '😍', '😘', '😋', '😎', '😌', '😉', '😏', '😜', '😝',
      '🤗', '😬', '😳', '😱', '😭', '😤', '😡', '🤔', '😴', '😐'
    ],
    description: 'Express yourself with face emoticons'
  },
  {
    id: 'pack_animals',
    name: 'Animals Pack',
    price: 1.00,
    emoticons: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁',
      '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐺', '🐗',
      '🐴', '🐢', '🐍', '🐙', '🐠', '🐟', '🐬', '🐳', '🐘', '🐄'
    ],
    description: 'Cute animal emoticons for animal lovers'
  },
  {
    id: 'pack_hearts',
    name: 'Hearts & Love Pack',
    price: 1.00,
    emoticons: [
      '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '❣️', '💌', '💋', '😍', '🥰',
      '😘', '😊', '😉', '🤗', '👫', '👭', '👬', '💍', '🌹', '🎁'
    ],
    description: 'Spread love with heart emoticons'
  },
  {
    id: 'pack_party',
    name: 'Party Pack',
    price: 1.50,
    emoticons: [
      '🎉', '🎊', '🎈', '🎁', '🎂', '🎀', '🎆', '🎇', '✨', '🎵',
      '🎶', '🎤', '🎧', '🎸', '🥳', '🍾', '🥂', '🍻', '🍹', '🍰',
      '🕺', '💃', '🎭', '🎪', '🎯', '🎺', '🥁', '🎷', '📸', '🎬'
    ],
    description: 'Celebrate with party emoticons'
  },
  {
    id: 'pack_food',
    name: 'Food & Drinks Pack',
    price: 1.50,
    emoticons: [
      '🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥐', '🍩', '🍪', '🎂',
      '🍰', '🍫', '🍬', '🍎', '🍌', '🍓', '🍇', '🍉', '🍒', '🍑',
      '🥑', '🍅', '🍣', '🍜', '🍝', '🍞', '🥪', '🥞', '☕', '🍺'
    ],
    description: 'Delicious food and drink emoticons'
  },
  {
    id: 'pack_nature',
    name: 'Nature Pack',
    price: 1.00,
    emoticons: [
      '🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🌿', '🍀', '🍁', '🍂',
      '🌴', '🌲', '🌳', '⭐', '🌙', '☀️', '🌈', '🌊', '⛰️', '🔥',
      '❄️', '🌍', '🌎', '🌏', '☁️', '⛅', '🌧️', '⚡', '🍃', '🌾'
    ],
    description: 'Beautiful nature and plant emoticons'
  },
  {
    id: 'pack_premium',
    name: 'Premium Collection',
    price: 2.00,
    emoticons: [
      '💎', '👑', '🏆', '🥇', '🎖️', '💫', '🌟', '⚡', '🔥', '💥',
      '🌈', '🦄', '🐉', '👾', '🚀', '♾️', '💰', '🤑', '🕶️', '🎩',
      '🧠', '⚜️', '🔑', '📀', '📸', '🎮', '🖥️', '📱', '⌚', '📈'
    ],
    description: 'Exclusive premium emoticons for VIPs'
  }
];


// Purchase an emoticon pack
export async function purchaseEmoticonPack(userId: string, packId: string): Promise<{ success: boolean; message: string }> {
  const pack = EMOTICON_PACKS.find(p => p.id === packId);
  if (!pack) return { success: false, message: 'Pack not found' };

  const user = await getUserById(userId);
  if (!user) return { success: false, message: 'User not found' };

  // Check if already owned
  const ownedPacks = (user as any).ownedEmoticonPacks || [];
  if (ownedPacks.includes(packId)) {
    return { success: false, message: 'You already own this emoticon pack' };
  }

  if (user.credits < pack.price) {
    return { success: false, message: 'Insufficient credits' };
  }

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    credits: increment(-pack.price),
    ownedEmoticonPacks: arrayUnion(packId)
  });
  invalidateUserCache(userId);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: userId,
    to: 'system',
    participants: txParticipants(userId, 'system'),
    amount: pack.price,
    type: 'purchase',
    description: `Purchased ${pack.name}`,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Purchased ${pack.name}! You can now use these emoticons in chat.` };
}

// Free chat commands
export const FREE_COMMANDS: { command: string; action: string; emoji: string }[] = [
  { command: 'hug', action: 'gives a warm hug to everyone', emoji: '🤗' },
  { command: 'busy', action: 'is very busy!', emoji: '⛔' },
  { command: 'away', action: 'is away from keyboard, wil be right back!', emoji: '⏰' },
  { command: 'wave', action: 'waves hello to everyone', emoji: '👋' },
  { command: 'dance', action: 'starts dancing', emoji: '💃' },
  { command: 'clap', action: 'claps for everyone', emoji: '👏' },
  { command: 'cheer', action: 'cheers loudly', emoji: '🎉' },
  { command: 'laugh', action: 'laughs out loud', emoji: '😂' },
  { command: 'cry', action: 'cries dramatically', emoji: '😢' },
  { command: 'kiss', action: 'blows kisses to everyone', emoji: '😘' },
  { command: 'wink', action: 'winks playfully', emoji: '😉' },
  { command: 'sleep', action: 'falls asleep', emoji: '😴' },
  { command: 'think', action: 'is deep in thought', emoji: '🤔' },
  { command: 'sing', action: 'starts singing', emoji: '🎤' },
  { command: 'pray', action: 'sends prayers', emoji: '🙏' },
  { command: 'flex', action: 'flexes muscles', emoji: '💪' },
  { command: 'bow', action: 'takes a bow', emoji: '🙇' },
  { command: 'smile', action: 'smiles happily', emoji: '😊' },
  { command: 'grin', action: 'grins from ear to ear', emoji: '😁' },
  { command: 'shrug', action: 'shrugs casually', emoji: '🤷' },
  { command: 'facepalm', action: 'facepalms in disbelief', emoji: '🤦' },
  { command: 'highfive', action: 'gives everyone a high five', emoji: '✋' },
  { command: 'thumbsup', action: 'gives a thumbs up', emoji: '👍' },
  { command: 'thumbsdown', action: 'gives a thumbs down', emoji: '👎' },
  { command: 'nod', action: 'nods in agreement', emoji: '🙂' },
  { command: 'shake', action: 'shakes head in disagreement', emoji: '😕' },
  { command: 'applaud', action: 'applauds enthusiastically', emoji: '🙌' },
  { command: 'celebrate', action: 'celebrates the moment', emoji: '🥳' },
  { command: 'panic', action: 'panics dramatically', emoji: '😱' },
  { command: 'relax', action: 'leans back and relaxes', emoji: '😌' },
  { command: 'confused', action: 'looks very confused', emoji: '😵‍💫' },
  { command: 'angry', action: 'gets visibly angry', emoji: '😠' },
  { command: 'blush', action: 'blushes shyly', emoji: '😳' },
  { command: 'sweat', action: 'breaks into a nervous sweat', emoji: '😓' },
  { command: 'party', action: 'starts a party', emoji: '🎊' },
  { command: 'salute', action: 'salutes respectfully', emoji: '🫡' },
  { command: 'read', action: 'starts reading quietly', emoji: '📖' },
  { command: 'write', action: 'begins writing something important', emoji: '✍️' },
  { command: 'coffee', action: 'grabs a cup of coffee', emoji: '☕' },
  { command: 'eat', action: 'starts eating happily', emoji: '🍽️' },
  { command: 'drink', action: 'takes a refreshing drink', emoji: '🥤' },
  { command: 'stretch', action: 'stretches arms and legs', emoji: '🤸' },
];


export async function purchaseItem(userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
  const item = STORE_ITEMS.find(i => i.id === itemId);
  if (!item) {
    return { success: false, message: 'Item not found' };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.credits < item.price) {
    return { success: false, message: 'Insufficient credits' };
  }

  const userRef = doc(db, 'users', userId);

  if (item.type === 'merchant') {
    // Each merchant pack should be tracked separately
    const ownedMerchantPacks = user.ownedMerchantPacks || [];
    if (ownedMerchantPacks.includes(itemId)) {
      return { success: false, message: 'You already own this merchant pack' };
    }

    await updateDoc(userRef, {
      credits: increment(-item.price),
      isMerchant: true,
      ownedMerchantPacks: arrayUnion(itemId),
      merchantLevel: itemId === 'merchant_elite' ? 'elite' : itemId === 'merchant_pro' ? 'pro' : user.merchantLevel || 'basic'
    });
    invalidateUserCache(userId);

    // Log transaction
    await addDoc(collection(db, 'transactions'), {
      from: userId,
      to: 'system',
      participants: txParticipants(userId, 'system'),
      amount: item.price,
      type: 'merchant',
      description: `Purchased ${item.name}`,
      timestamp: serverTimestamp()
    });

    return { success: true, message: `You purchased ${item.name}! Your name will appear in gold.` };
  }

  // Assets can be bought multiple times - don't check for ownership
  if (item.type === 'asset') {
    await updateDoc(userRef, {
      credits: increment(-item.price),
      assets: arrayUnion(itemId),
      // Track quantity of owned assets
      [`assetQuantities.${itemId}`]: increment(1)
    });
    invalidateUserCache(userId);

    // Log transaction
    await addDoc(collection(db, 'transactions'), {
      from: userId,
      to: 'system',
      participants: txParticipants(userId, 'system'),
      amount: item.price,
      type: 'purchase',
      description: `Purchased ${item.name}`,
      timestamp: serverTimestamp()
    });

    return { success: true, message: `Purchased ${item.name}!` };
  }

  // Pets can only be owned once
  const field = 'pets';
  if ((user[field] as string[]).includes(itemId)) {
    return { success: false, message: 'You already own this pet' };
  }

  await updateDoc(userRef, {
    credits: increment(-item.price),
    [field]: arrayUnion(itemId)
  });
  invalidateUserCache(userId);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: userId,
    to: 'system',
    participants: txParticipants(userId, 'system'),
    amount: item.price,
    type: 'purchase',
    description: `Purchased ${item.name}`,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Purchased ${item.name}!` };
}

// Daily asset collection
export async function collectDailyCredits(userId: string): Promise<{ success: boolean; amount: number; message: string }> {
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, amount: 0, message: 'User not found' };
  }

  const now = new Date();
  if (user.lastDailyCollection) {
    const lastCollection = user.lastDailyCollection.toDate ? user.lastDailyCollection.toDate() : new Date(user.lastDailyCollection);
    const hoursSinceCollection = (now.getTime() - lastCollection.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCollection < 24) {
      const hoursLeft = Math.ceil(24 - hoursSinceCollection);
      return { success: false, amount: 0, message: `Come back in ${hoursLeft} hours` };
    }
  }

  // Calculate total credits based on quantity of each asset owned
  let totalCredits = 0;
  for (const assetId of user.assets) {
    const asset = STORE_ITEMS.find(i => i.id === assetId);
    if (asset && asset.dailyCredits) {
      // Get quantity from assetQuantities, default to 1 if not set
      const quantity = user.assetQuantities?.[assetId] || 1;
      totalCredits += asset.dailyCredits * quantity;
    }
  }

  if (totalCredits === 0) {
    return { success: false, amount: 0, message: 'No assets to collect from' };
  }

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    credits: increment(totalCredits),
    lastDailyCollection: serverTimestamp()
  });
  invalidateUserCache(userId);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: 'system',
    to: userId,
    participants: txParticipants('system', userId),
    amount: totalCredits,
    type: 'daily',
    description: 'Daily asset collection',
    timestamp: serverTimestamp()
  });

  return { success: true, amount: totalCredits, message: `Collected ${totalCredits} credits!` };
}

// Pet feeding - requires friendship, max 5 feeders per pet per day, random credits based on pet price
// IMPORTANT: Feeder must own the same pet type to be able to feed
export async function feedPet(feederId: string, ownerId: string, petId: string): Promise<{ success: boolean; message: string; reward?: number; rewardType?: 'credits' | 'asset'; assetName?: string }> {
  if (feederId === ownerId) {
    return { success: false, message: 'Cannot feed your own pets' };
  }

  const feeder = await getUserById(feederId);
  const owner = await getUserById(ownerId);

  if (!feeder || !owner) {
    return { success: false, message: 'User not found' };
  }

  // Check if they are friends
  if (!feeder.friends.includes(ownerId) || !owner.friends.includes(feederId)) {
    return { success: false, message: 'You must be friends to feed their pets' };
  }

  // Check if owner has the pet
  if (!owner.pets.includes(petId)) {
    return { success: false, message: 'This user does not own this pet' };
  }

  // Check if feeder owns the same pet type - REQUIRED to feed
  if (!feeder.pets.includes(petId)) {
    const pet = STORE_ITEMS.find(i => i.id === petId && i.type === 'pet');
    return { success: false, message: `You need to own a ${pet?.name || 'pet'} to feed this pet` };
  }

  // Get today's date key for daily tracking
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyFeedRef = doc(db, 'petFeedingsDaily', `${ownerId}_${petId}_${today}`);
  const dailyFeedDoc = await getDoc(dailyFeedRef);

  // Check if max 5 feeders already
  const currentFeeders = dailyFeedDoc.exists() ? (dailyFeedDoc.data().feeders || []) : [];
  if (currentFeeders.length >= 5 && !currentFeeders.includes(feederId)) {
    return { success: false, message: 'This pet has already been fed by 5 users today' };
  }

  // Check if this feeder already fed this pet today
  if (currentFeeders.includes(feederId)) {
    return { success: false, message: 'You already fed this pet today. Come back tomorrow!' };
  }

  // Get pet price to calculate reward
  const pet = STORE_ITEMS.find(i => i.id === petId && i.type === 'pet');
  const petPrice = pet?.price || 1.0;

  // Random reward: exact value between 3% and 5% of the pet price
  // we do not round – allow fractional credits since the system supports them
  const percentage = 0.03 + Math.random() * 0.02; // [0.03,0.05)
  const reward = petPrice * percentage;

  // Update daily feeders list
  await setDoc(dailyFeedRef, {
    feeders: [...currentFeeders, feederId],
    date: today,
    petId,
    ownerId
  });

  const remainingSlots = 5 - currentFeeders.length - 1;

  // 10% chance to win a random asset instead of credits for the feeder
  const getsAsset = Math.random() < 0.1;
  if (getsAsset) {
    // Pick a random asset from the first five cheapest assets
    const availableAssets = STORE_ITEMS
      .filter(i => i.type === 'asset')
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);
    if (availableAssets.length > 0) {
      const randomAsset = availableAssets[Math.floor(Math.random() * availableAssets.length)];

      const feederRef = doc(db, 'users', feederId);
      await updateDoc(feederRef, {
        assets: arrayUnion(randomAsset.id),
        [`assetQuantities.${randomAsset.id}`]: increment(1)
      });

      // also give the owner the same asset
      const ownerRef = doc(db, 'users', ownerId);
      await updateDoc(ownerRef, {
        assets: arrayUnion(randomAsset.id),
        [`assetQuantities.${randomAsset.id}`]: increment(1)
      });

      // Record bonus asset transaction for feeder
      await addDoc(collection(db, 'transactions'), {
        from: 'system',
        to: feederId,
        participants: txParticipants('system', feederId),
        amount: randomAsset.price,
        type: 'daily',
        description: `Lucky bonus! Won ${randomAsset.name} for feeding ${pet?.name || 'pet'}`,
        timestamp: serverTimestamp()
      });

      // Record asset transaction for owner
      await addDoc(collection(db, 'transactions'), {
        from: 'system',
        to: ownerId,
        participants: txParticipants('system', ownerId),
        amount: randomAsset.price,
        type: 'daily',
        description: `Received ${randomAsset.name} because ${feeder.username} fed your ${pet?.name || 'pet'}`,
        timestamp: serverTimestamp()
      });

      // Owner still gets credits
      await updateCredits(ownerId, reward);
      await addDoc(collection(db, 'transactions'), {
        from: 'system',
        to: ownerId,
        participants: txParticipants('system', ownerId),
        toUsername: owner.username,
        amount: reward,
        type: 'daily',
        description: `${pet?.name || 'Pet'} fed by ${feeder.username}`,
        timestamp: serverTimestamp()
      });

      // Create alert for pet owner
      await addDoc(collection(db, 'userAlerts'), {
        userId: ownerId,
        type: 'pet_feed',
        message: `${feeder.username} fed your ${pet?.name || 'pet'} (+${reward} credits and a ${randomAsset.name})`,
        read: false,
        createdAt: serverTimestamp()
      });

      return {
        success: true,
        message: `🎉 Lucky! You won a ${randomAsset.name}! Owner also received a ${randomAsset.name} and ${reward} credits. (${remainingSlots} slots left)`,
        reward,
        rewardType: 'asset',
        assetName: randomAsset.name
      };
    }
  }

  await updateCredits(feederId, reward);
  await updateCredits(ownerId, reward);

  // Record transactions for pet feeding
  await addDoc(collection(db, 'transactions'), {
    from: 'system',
    to: feederId,
    participants: txParticipants('system', feederId),
    toUsername: feeder.username,
    amount: reward,
    type: 'daily',
    description: `Fed ${owner.username}'s ${pet?.name || 'pet'}`,
    timestamp: serverTimestamp()
  });

  await addDoc(collection(db, 'transactions'), {
    from: 'system',
    to: ownerId,
    participants: txParticipants('system', ownerId),
    toUsername: owner.username,
    amount: reward,
    type: 'daily',
    description: `${pet?.name || 'Pet'} fed by ${feeder.username}`,
    timestamp: serverTimestamp()
  });

  // Create alert for pet owner
  await addDoc(collection(db, 'userAlerts'), {
    userId: ownerId,
    type: 'pet_feed',
    message: `${feeder.username} fed your ${pet?.name || 'pet'} (+${reward} credits)`,
    read: false,
    createdAt: serverTimestamp()
  });

  return { success: true, message: `Fed ${pet?.name || 'pet'}! You both received ${reward} credits! (${remainingSlots} feeding slots left today)`, reward, rewardType: 'credits' };
}

// Update gift stats
// isPrivate: if true, transaction is only visible to sender (not added to receiver's transaction history)
export async function recordGift(senderId: string, receiverId: string, giftPrice: number, isPrivate: boolean = false, giftId?: string, giftName?: string, giftEmoji?: string): Promise<void> {
  const senderRef = doc(db, 'users', senderId);
  const receiverRef = doc(db, 'users', receiverId);

  await updateDoc(senderRef, {
    giftsSent: increment(1)
  });

  // Award XP for sending a gift (small reward)
  try { await addXP(senderId, 5); } catch (e) { console.warn('Failed to award XP for sending gift:', e); }

  if (receiverId !== 'all') {
    // Increment giftsReceived count and add to unconvertedGifts balance
    await updateDoc(receiverRef, {
      giftsReceived: increment(1),
      unconvertedGifts: increment(giftPrice)
    });
  }

  // Log transaction - for private gifts, only include sender in participants so receiver doesn't see it
  const participants = isPrivate
    ? [senderId]  // Private gift: only sender sees the transaction
    : txParticipants(senderId, receiverId);  // Public gift: both see the transaction

  await addDoc(collection(db, 'transactions'), {
    from: senderId,
    to: receiverId,
    participants,
    amount: giftPrice,
    type: 'gift',
    description: isPrivate ? 'Private gift sent' : 'Gift sent',
    isPrivate,
    giftId: giftId || null,
    giftName: giftName || null,
    giftEmoji: giftEmoji || null,
    timestamp: serverTimestamp()
  });
}

// Record a gift shower (send same gift to multiple recipients) as a single aggregated transaction
export async function recordGiftShower(senderId: string, recipientIds: string[], giftId: string, giftName: string, giftEmoji: string, giftPrice: number): Promise<void> {
  const senderRef = doc(db, 'users', senderId);

  // Increment sender giftsSent by number of recipients
  await updateDoc(senderRef, {
    giftsSent: increment(recipientIds.length)
  });

  // Award XP proportionally (same 5 XP per gift as single sends)
  try { await addXP(senderId, 5 * recipientIds.length); } catch (e) { console.warn('Failed to award XP for gift shower:', e); }

  // Update each recipient's counters
  for (const receiverId of recipientIds) {
    const receiverRef = doc(db, 'users', receiverId);
    await updateDoc(receiverRef, {
      giftsReceived: increment(1),
      unconvertedGifts: increment(giftPrice)
    });
  }

  // The old implementation created one aggregated transaction that included all
  // recipients in the participants array and used the *total* cost as the amount.
  // That meant each recipient saw the full spend in their history which was confusing
  // (they should only see what they individually received).  To fix this we now:
  //
  // 1. Write a single summary entry visible only to the sender.
  // 2. Write one transaction per recipient reflecting their share of the shower.
  //
  // This also satisfies the requirement that history is only recorded when
  // credits are involved and that users only see their own history.

  // summary record for sender
  await addDoc(collection(db, 'transactions'), {
    from: senderId,
    to: 'all',
    participants: [senderId],   // only sender should see the summary
    amount: giftPrice * recipientIds.length,
    type: 'gift',
    description: `Gift shower: ${giftName}`,
    giftId,
    giftName,
    giftEmoji,
    recipientsCount: recipientIds.length,
    timestamp: serverTimestamp()
  });

  // individual records for each recipient
  for (const receiverId of recipientIds) {
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      to: receiverId,
      participants: txParticipants(senderId, receiverId),
      amount: giftPrice,
      type: 'gift',
      description: `Gift shower received: ${giftName}`,
      giftId,
      giftName,
      giftEmoji,
      timestamp: serverTimestamp()
    });
  }
}

// Try to consume a single-recipient gift cooldown (10 seconds). Returns allowed: true or remainingSeconds when blocked.
export async function tryConsumeGiftCooldown(userId: string): Promise<{ allowed: true } | { allowed: false; remainingSeconds: number }> {
  const COOLDOWN_MS = 10_000;
  try {
    const res = await runTransaction(db, async (tx) => {
      const userRef = doc(db, 'users', userId);
      const snap = await tx.get(userRef);
      if (!snap.exists()) return { allowed: true };
      const data: any = snap.data();
      const last = data.lastGiftSentAt ? (data.lastGiftSentAt.toDate ? data.lastGiftSentAt.toDate().getTime() : new Date(data.lastGiftSentAt).getTime()) : 0;
      const now = Date.now();
      if (now - last < COOLDOWN_MS) {
        return { allowed: false, remainingMs: COOLDOWN_MS - (now - last) };
      }
      tx.update(userRef, { lastGiftSentAt: serverTimestamp() });
      return { allowed: true };
    });

    if ((res as any).allowed) return { allowed: true };
    const rem = Math.ceil((res as any).remainingMs / 1000);
    return { allowed: false, remainingSeconds: rem };
  } catch (e) {
    console.error('Failed to check/consume gift cooldown:', e);
    // On error, allow to avoid blocking users due to transient issues
    return { allowed: true };
  }
}

// Try to consume a shower cooldown (20 seconds). Returns allowed or remaining seconds when blocked.
export async function tryConsumeShowerCooldown(userId: string): Promise<{ allowed: true } | { allowed: false; remainingSeconds: number }> {
  const COOLDOWN_MS = 20_000;
  try {
    const res = await runTransaction(db, async (tx) => {
      const userRef = doc(db, 'users', userId);
      const snap = await tx.get(userRef);
      if (!snap.exists()) return { allowed: true };
      const data: any = snap.data();
      const last = data.lastShowerSentAt ? (data.lastShowerSentAt.toDate ? data.lastShowerSentAt.toDate().getTime() : new Date(data.lastShowerSentAt).getTime()) : 0;
      const now = Date.now();
      if (now - last < COOLDOWN_MS) {
        return { allowed: false, remainingMs: COOLDOWN_MS - (now - last) };
      }
      tx.update(userRef, { lastShowerSentAt: serverTimestamp() });
      return { allowed: true };
    });
    if ((res as any).allowed) return { allowed: true };
    const rem = Math.ceil((res as any).remainingMs / 1000);
    return { allowed: false, remainingSeconds: rem };
  } catch (e) {
    console.error('Failed to check/consume shower cooldown:', e);
    return { allowed: true };
  }
}

// Initialize default rooms (Newbies + Country rooms + Game rooms)
export async function initializeDefaultRooms(): Promise<void> {
  const chatroomsRef = collection(db, 'chatrooms');
  const flagRef = doc(db, 'meta', 'roomsInitialized');

  // Try to claim an initialization flag atomically. If it's already claimed, skip initialization entirely.
  try {
    const txRes = await runTransaction(db, async (tx) => {
      const snap = await tx.get(flagRef);
      if (snap.exists()) return false;
      tx.set(flagRef, { initialized: true, createdAt: serverTimestamp() });
      return true;
    });

    if (!txRes) return; // already initialized
  } catch (e) {
    console.warn('Failed to claim roomsInitialized flag transactionally, checking flag directly and proceeding if missing:', e);
    try {
      const snap = await getDoc(flagRef);
      if (snap.exists()) return; // another process initialized while we failed
    } catch (e2) {
      console.warn('Failed to read roomsInitialized flag; proceeding with fallback initialization:', e2);
    }
    // Proceed with fallback initialization; we'll try to set the flag after successful creation
  }

  // Create Newbies room if missing using a transactional name-claim (prevents duplicates when this runs concurrently)
  try {
    const nameSlug = roomNameToSlug('Newbies');
    const nameIndexRef = doc(db, 'chatroomNames', nameSlug);
    const newRoomRef = doc(chatroomsRef);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(nameIndexRef);
      if (snap.exists()) return; // already claimed

      tx.set(newRoomRef, {
        name: 'Newbies',
        ownerId: 'system',
        ownerName: 'System',
        moderators: [],
        isPrivate: false,
        topic: 'Welcome to bimo33! Meet new friends here.',
        description: 'A friendly place for newcomers',
        participants: [],
        createdAt: serverTimestamp()
      });

      tx.set(nameIndexRef, {
        chatroomId: newRoomRef.id,
        name: 'Newbies',
        createdAt: serverTimestamp()
      });
    });
  } catch (e) {
    console.error('Failed to initialize Newbies room:', e);
  }

  // Create one country room per configured country (avoid duplicates)
  try {
    for (const country of COUNTRIES) {
      // Skip 'Other' if present
      if (!country || country.code === 'OTHER') continue;
      const roomName = `${country.name}`;
      const slug = roomNameToSlug(roomName);
      const nameIndexRef = doc(db, 'chatroomNames', slug);
      const newRoomRef = doc(chatroomsRef);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(nameIndexRef);
        if (snap.exists()) return;

        tx.set(newRoomRef, {
          name: roomName,
          ownerId: 'system',
          ownerName: 'System',
          moderators: [],
          isPrivate: false,
          topic: `Room for ${country.name}`,
          description: `${country.flag} ${country.name} community`,
          participants: [],
          createdAt: serverTimestamp()
        });

        tx.set(nameIndexRef, {
          chatroomId: newRoomRef.id,
          name: roomName,
          createdAt: serverTimestamp()
        });
      });
    }
  } catch (e) {
    console.error('Failed to initialize country rooms:', e);
  }

  // Create official Game rooms (Game 1..Game 5) if missing
  try {
    for (let i = 1; i <= 5; i++) {
      const gameRoomName = `Game ${i}`;
      const slug = roomNameToSlug(gameRoomName);
      const nameIndexRef = doc(db, 'chatroomNames', slug);
      const newRoomRef = doc(chatroomsRef);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(nameIndexRef);
        if (snap.exists()) return;

        tx.set(newRoomRef, {
          name: gameRoomName,
          ownerId: 'system',
          ownerName: 'System',
          moderators: [],
          isPrivate: false,
          topic: 'Official game room',
          description: 'Play and watch official games',
          participants: [],
          createdAt: serverTimestamp()
        });

        tx.set(nameIndexRef, {
          chatroomId: newRoomRef.id,
          name: gameRoomName,
          createdAt: serverTimestamp()
        });
      });
    }
  } catch (e) {
    console.error('Failed to initialize game rooms:', e);
  }

  // Ensure the roomsInitialized flag exists in case we took the fallback path earlier
  try {
    await setDoc(flagRef, { initialized: true, createdAt: serverTimestamp() });
  } catch (e) {
    console.warn('Failed to write roomsInitialized flag after initialization:', e);
  }
}


// XP and leveling
export function xpToNext(level: number): number {
  // Soft exponential curve: XP_to_next = round(100 × 1.12^(level − 1))
  return Math.round(100 * Math.pow(1.12, Math.max(0, level - 1)));
}

export function getCumulativeXpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l);
  return sum;
}

export function getLevelFromTotalXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
    if (level > 10000) break; // safety cap
  }
  return level;
}

export function getXpProgress(totalXp: number, currentLevel: number) {
  const spent = getCumulativeXpForLevel(currentLevel);
  const needed = xpToNext(currentLevel);
  const current = Math.max(0, totalXp - spent);
  const percent = Math.round((current / needed) * 100);
  return { percent, current, needed };
}

export function getEffectiveXpAmount(user: any, amount: number, nowMs: number = Date.now()): number {
  // Apply active XP boost multiplier if user has one and it's still active
  try {
    if (user && user.xpBoostMultiplier && user.xpBoostMultiplier > 1 && user.xpBoostEndTime && user.xpBoostEndTime > nowMs) {
      return Math.round(amount * user.xpBoostMultiplier);
    }
  } catch (e) {
    // If anything goes wrong, fall back to base amount
  }
  return amount;
}

export async function addXP(userId: string, amount: number): Promise<{ leveledUp: boolean; newLevel: number }> {
  const user = await getUserById(userId);
  if (!user) return { leveledUp: false, newLevel: 1 };

  // Apply any active XP boost multiplier (2x, 3x, etc.)
  const appliedAmount = getEffectiveXpAmount(user, amount);

  const newXP = user.xp + appliedAmount;
  const newLevel = getLevelFromTotalXp(newXP);
  const leveledUp = newLevel > user.level;

  const userRef = doc(db, 'users', userId);
  const updates: any = { xp: newXP, level: newLevel };

  if (leveledUp) {
    // Compute linear credits for each level gained: Credits = 50 + (level × 10)
    let totalBonusCredits = 0;
    for (let lvl = (user.level || 1) + 1; lvl <= newLevel; lvl++) {
      totalBonusCredits += 0.50 + (lvl * 0.01);
    }
    updates.credits = increment(totalBonusCredits);

    // Record level up bonus transaction
    await addDoc(collection(db, 'transactions'), {
      from: 'system',
      to: userId,
      participants: txParticipants('system', userId),
      amount: totalBonusCredits,
      type: 'level',
      description: `Level up bonus (Level ${newLevel})`,
      timestamp: serverTimestamp()
    });
  }

  await updateDoc(userRef, updates);

  return { leveledUp, newLevel };
}

// Record a message sent and award 1 XP per 10 messages
export async function recordMessageSent(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    const res = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return { messagesSent: 0 };
      const data: any = snap.data();
      const prev = data.messagesSent || 0;
      const next = prev + 1;
      tx.update(userRef, { messagesSent: next });
      return { messagesSent: next };
    });
    if (res.messagesSent % 10 === 0) {
      try { await addXP(userId, 1); } catch (e) { console.warn('Failed to award message XP:', e); }
    }
  } catch (e) {
    console.error(`Failed to record messageSent for ${userId}:`, e);
  }
}

// Add room to recent rooms
export async function addToRecentRooms(userId: string, roomId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const user = await getUserById(userId);
  if (!user) return;

  let recentRooms = user.recentRooms || [];
  // Remove if already exists and add to front
  recentRooms = recentRooms.filter(id => id !== roomId);
  recentRooms.unshift(roomId);
  // Keep only last 10
  recentRooms = recentRooms.slice(0, 10);

  await updateDoc(userRef, { recentRooms });
  invalidateUserCache(userId);
  invalidateUserCache(userId);
}

// Generic helper to examine a timestamp field and zero counters if more than a week has passed.
// This is similar to needsWeeklyReset but operates inside a Firestore transaction.
async function _transactionalIncrementWeeklyField(
  userId: string,
  field: 'gamesPlayedWeekly' | 'redeemsThisWeek',
  amount: number
) {
  const userRef = doc(db, 'users', userId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    const data: any = snap.data();

    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    let last: any = data.lastWeeklyReset || 0;
    let lastMs: number;
    if (typeof last === 'number') {
      lastMs = last;
    } else if (last && typeof last.toMillis === 'function') {
      lastMs = last.toMillis();
    } else {
      lastMs = 0;
    }
    const needsReset = lastMs < now - ONE_WEEK;

    if (needsReset) {
      // reset both counters and start fresh for this field
      const updateData: any = {
        gamesPlayedWeekly: 0,
        redeemsThisWeek: 0,
        lastWeeklyReset: serverTimestamp()
      };
      updateData[field] = amount;
      tx.update(userRef, updateData);
    } else {
      tx.update(userRef, { [field]: increment(amount) });
    }
  });
}

// log each game/redeem event so that we can compute sliding‑window leaderboards
async function _recordEvent(userId: string, collectionName: string): Promise<void> {
  try {
    const eventsRef = collection(db, collectionName);
    await addDoc(eventsRef, { userId, timestamp: serverTimestamp() });
  } catch (e) {
    console.warn(`Failed to log event to ${collectionName} for ${userId}:`, e);
  }
}

// Increment the weekly games played counter for a user.  If the user is past
// the one‑week window their counters will be cleared automatically before the
// increment is applied.  This makes the leaderboard robust even if the
// scheduler didn't run.
export async function incrementGamesPlayedWeekly(userId: string, amount: number = 1): Promise<void> {
  try {
    await _transactionalIncrementWeeklyField(userId, 'gamesPlayedWeekly', amount);
    _recordEvent(userId, 'gameEvents');
  } catch (e) {
    console.error(`Failed to increment gamesPlayedWeekly for ${userId}:`, e);
  }
}

// Similar helper for tracking redeems
export async function incrementRedeemsWeekly(userId: string, amount: number = 1): Promise<void> {
  try {
    await _transactionalIncrementWeeklyField(userId, 'redeemsThisWeek', amount);
    _recordEvent(userId, 'redeemEvents');
  } catch (e) {
    console.error(`Failed to increment redeemsThisWeek for ${userId}:`, e);
  }
}

// ----- sliding-window leaderboard helpers -----

/**
 * Return top `limitNum` users who have the most events of type `kind` during
 * the past seven days. `kind` may be `'game'` or `'redeem'`.
 *
 * This function performs a query for all events in the window and then
 * aggregates counts in memory. For large datasets you should instead run a
 * scheduled aggregation and store the results in a separate collection.  The
 * UI can call that materialized leaderboard for better performance.
 */
export async function getTopUsersLast7Days(
  kind: 'game' | 'redeem',
  limitNum: number = 5
): Promise<UserProfile[]> {
  const now = Timestamp.now();
  const weekAgo = Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
  const eventsRef = collection(db, kind === 'game' ? 'gameEvents' : 'redeemEvents');
  const q = query(eventsRef, where('timestamp', '>=', weekAgo));
  const snapshot = await getDocs(q);

  const counts: Record<string, number> = {};
  snapshot.forEach((docSnap) => {
    const data: any = docSnap.data();
    const uid = data.userId;
    counts[uid] = (counts[uid] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limitNum);

  const users = await Promise.all(
    sorted.map(async ([uid]) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) return { uid, ...userDoc.data() } as UserProfile;
      } catch {
        // ignore
      }
      return null;
    })
  );

  return users.filter((u): u is UserProfile => u !== null).slice(0, limitNum);
}

// Reset the weekly counters for every user. Typically invoked by a
// scheduled/cloud‑function once per week (e.g. Monday UTC).
export async function resetWeeklyLeaderboard(): Promise<void> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      const ref = doc(db, 'users', docSnap.id);
      batch.update(ref, {
        gamesPlayedWeekly: 0,
        redeemsThisWeek: 0,
        lastWeeklyReset: serverTimestamp()
      });
    });
    await batch.commit();
  } catch (e) {
    console.error('Failed to reset weekly leaderboard counters:', e);
  }
}

// conversion rate for gift value -> credit amount (20%)
export const GIFT_CONVERSION_RATE = 0.2;

// compute how many credits a pending gift amount will convert to
// apply the configured rate directly and allow fractional results. this
// makes small gifts (e.g. value 1) still yield 0.2 credits and keeps the
// convert button active for any positive balance.
export function calculateGiftConversion(amount: number): number {
  if (amount <= 0) return 0;
  return amount * GIFT_CONVERSION_RATE;
}

// helper used by both server and tests to encapsulate business logic
export function applyGiftConversion(pending: number): { success: boolean; message: string; converted: number } {
  if (!pending || pending <= 0) {
    return { success: false, message: 'No gifts to convert', converted: 0 };
  }

  const converted = calculateGiftConversion(pending);
  if (converted <= 0) {
    return { success: false, message: 'No credits earned after conversion', converted: 0 };
  }

  return {
    success: true,
    message: `Converted ${converted} credits from gifts (${GIFT_CONVERSION_RATE * 100}% rate)`,
    converted
  };
}

// Convert accumulated (unconverted) gifts into credits for a user
export async function convertGiftsToCredits(userId: string): Promise<{ success: boolean; message: string; converted?: number }> {
  const userRef = doc(db, 'users', userId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('User not found');
      const data: any = snap.data();
      const pending = data.unconvertedGifts || 0;

      // compute conversion result (pure logic)
      const { success, message, converted } = applyGiftConversion(pending);

      if (!success) {
        // if nothing converted, leave pending balance untouched so user can
        // accumulate more gifts; we still return a message and converted=0.
        return { success, message, converted };
      }

      // At this point we know converted > 0
      // Apply conversion atomically along with a transaction record
      tx.update(userRef, {
        credits: increment(converted),
        unconvertedGifts: 0
      });

      // create a new transaction document inside the same Firestore
      // transaction so that the conversion cannot accidentally fire more
      // than once (the previous implementation used addDoc outside the
      // transaction which could run multiple times if the tx callback was
      // retried). doing it here also ensures that any cloud function
      // listening on transactions sees a single record.
      const txDocRef = doc(collection(db, 'transactions'));
      tx.set(txDocRef, {
        from: 'gifts',
        to: userId,
        participants: txParticipants('gifts', userId),
        amount: converted,
        type: 'gift_conversion',
        description: `Converted gifts to credits (${GIFT_CONVERSION_RATE * 100}% rate)`,
        timestamp: serverTimestamp()
      });

      return { success, message, converted };
    });

    return result as any;
  } catch (e: any) {
    console.error('Failed to convert gifts:', e);
    return { success: false, message: 'Conversion failed' };
  }
}

// Toggle favorite room
export async function toggleFavoriteRoom(userId: string, roomId: string): Promise<boolean> {
  const userRef = doc(db, 'users', userId);
  const user = await getUserById(userId);
  if (!user) return false;

  const favoriteRooms = user.favoriteRooms || [];
  const isFavorite = favoriteRooms.includes(roomId);

  if (isFavorite) {
    await updateDoc(userRef, { favoriteRooms: arrayRemove(roomId) });
  } else {
    await updateDoc(userRef, { favoriteRooms: arrayUnion(roomId) });
  }
  invalidateUserCache(userId);

  return !isFavorite;
}

// Ban/Suspend user (admin only)
export async function banUser(adminId: string, targetUserId: string, reason: string): Promise<{ success: boolean; message: string }> {
  const admin = await getUserById(adminId);
  if (!admin?.isAdmin) {
    return { success: false, message: 'Only admins can ban users' };
  }

  const targetRef = doc(db, 'users', targetUserId);
  await updateDoc(targetRef, {
    isBanned: true,
    banReason: reason
  });

  return { success: true, message: 'User has been banned' };
}

// Unban user (admin only)
export async function unbanUser(adminId: string, targetUserId: string): Promise<{ success: boolean; message: string }> {
  const admin = await getUserById(adminId);
  if (!admin?.isAdmin) {
    return { success: false, message: 'Only admins can unban users' };
  }

  const targetRef = doc(db, 'users', targetUserId);
  await updateDoc(targetRef, {
    isBanned: false,
    banReason: null
  });

  return { success: true, message: 'User has been unbanned' };
}

// Purchase avatar item
export async function purchaseAvatarItem(userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
  const { getAvatarItemById } = await import('./avatarItems');
  const item = getAvatarItemById(itemId);

  if (!item) {
    return { success: false, message: 'Item not found' };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.credits < item.price) {
    return { success: false, message: 'Insufficient credits' };
  }

  if (user.ownedAvatarItems?.includes(itemId)) {
    return { success: false, message: 'You already own this item' };
  }

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    credits: increment(-item.price),
    ownedAvatarItems: arrayUnion(itemId)
  });
  invalidateUserCache(userId);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: userId,
    to: 'system',
    participants: txParticipants(userId, 'system'),
    amount: item.price,
    type: 'purchase',
    description: `Purchased avatar item: ${item.name}`,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Purchased ${item.name}!` };
}

// Daily loss refund - calculates and refunds a percentage of credits spent in last 24 hours
export async function calculateDailyLossRefund(userId: string): Promise<{ success: boolean; refundAmount: number; message: string }> {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  const ref = collection(db, 'transactions');
  // Query only transactions where the user is a participant and within the last 24 hours to avoid scanning the entire collection
  const q = query(
    ref,
    where('participants', 'array-contains', userId),
    where('type', 'in', ['purchase', 'gift', 'transfer', 'game', 'merchant']),
    where('timestamp', '>=', new Date(oneDayAgo))
  );

  const snapshot = await getDocs(q);
  let totalSpent = 0;

  snapshot.docs.forEach(docSnap => {
    const tx = docSnap.data();
    totalSpent += tx.amount || 0;
  });

  if (totalSpent === 0) {
    return { success: false, refundAmount: 0, message: 'No spending to refund' };
  }

  // 5% refund rate
  const refundRate = 0.05;
  const refundAmount = Math.floor(totalSpent * refundRate);

  if (refundAmount === 0) {
    return { success: false, refundAmount: 0, message: 'Refund amount too small' };
  }

  // Check if already refunded today
  const user = await getUserById(userId);
  if (!user) return { success: false, refundAmount: 0, message: 'User not found' };

  const lastRefund = user.lastDailyRefund?.toDate?.()?.getTime() ?? 0;
  if (now - lastRefund < 24 * 60 * 60 * 1000) {
    return { success: false, refundAmount: 0, message: 'Already received refund today' };
  }

  // Apply refund
  await updateCredits(userId, refundAmount);

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    lastDailyRefund: serverTimestamp()
  });
  invalidateUserCache(userId);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: 'system',
    to: userId,
    participants: txParticipants('system', userId),
    amount: refundAmount,
    type: 'refund',
    description: `Daily loss refund (5% of ${totalSpent} spent)`,
    timestamp: serverTimestamp()
  });

  return { success: true, refundAmount, message: `Received ${refundAmount} credits as daily refund!` };
}

// Like a user's profile
export async function likeProfile(likerId: string, profileId: string): Promise<{ success: boolean; message: string }> {
  if (likerId === profileId) {
    return { success: false, message: 'Cannot like your own profile' };
  }

  const likeKey = `${likerId}_${profileId}`;
  const likeRef = doc(db, 'profileLikes', likeKey);
  const likeDoc = await getDoc(likeRef);

  if (likeDoc.exists()) {
    return { success: false, message: 'Already liked this profile' };
  }

  // Get liker username for the alert
  const liker = await getUserById(likerId);
  const likerName = liker?.username || 'Someone';

  await setDoc(likeRef, {
    likerId,
    profileId,
    timestamp: serverTimestamp()
  });

  const profileRef = doc(db, 'users', profileId);
  await updateDoc(profileRef, {
    profileLikes: increment(1)
  });
  invalidateUserCache(profileId);

  // Create alert for profile owner
  await addDoc(collection(db, 'userAlerts'), {
    userId: profileId,
    type: 'like',
    message: `${likerName} liked your profile`,
    read: false,
    createdAt: serverTimestamp()
  });

  return { success: true, message: 'Profile liked!' };
}

// Check if user has liked a profile
export async function hasLikedProfile(likerId: string, profileId: string): Promise<boolean> {
  const likeKey = `${likerId}_${profileId}`;
  const likeRef = doc(db, 'profileLikes', likeKey);
  const likeDoc = await getDoc(likeRef);
  return likeDoc.exists();
}

// Purchase XP boost - only one active at a time
export async function purchaseXPBoost(userId: string, boostId: string): Promise<{ success: boolean; message: string }> {
  const boost = XP_BOOSTS.find(b => b.id === boostId);
  if (!boost) {
    return { success: false, message: 'Boost not found' };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Check if user already has an active boost
  const now = Date.now();
  if (user.xpBoostEndTime && user.xpBoostEndTime > now) {
    const remainingMinutes = Math.ceil((user.xpBoostEndTime - now) / 60000);
    return { success: false, message: `You already have an active boost! ${remainingMinutes} minutes remaining.` };
  }

  if (user.credits < boost.price) {
    return { success: false, message: 'Insufficient credits' };
  }

  const boostEndTime = now + (boost.durationHours * 60 * 60 * 1000);

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    credits: increment(-boost.price),
    xpBoostMultiplier: boost.multiplier,
    xpBoostEndTime: boostEndTime
  });
  invalidateUserCache(userId);

  // Log transaction
  await addDoc(collection(db, 'transactions'), {
    from: userId,
    to: 'system',
    participants: txParticipants(userId, 'system'),
    amount: boost.price,
    type: 'boost',
    description: `Purchased ${boost.name}`,
    timestamp: serverTimestamp()
  });

  return { success: true, message: `Activated ${boost.name}!` };
}

// Start gift shower contest (admin only)
export async function startNewbiesContest(
  adminId: string,
  durationMinutes: number = 60,
  prizeCredits: number = 1000,
  giftId?: string
): Promise<{ success: boolean; message: string }> {
  const admin = await getUserById(adminId);
  if (!admin?.isAdmin) {
    return { success: false, message: 'Only admins can start contests' };
  }

  // Find Newbies room
  const chatroomsRef = collection(db, 'chatrooms');
  const q = query(chatroomsRef, where('name', '==', 'Newbies'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, message: 'Newbies room not found' };
  }

  const roomId = snapshot.docs[0].id;

  // Check for existing active contest
  const { getActiveContest, startGiftShowerContest } = await import('./giftContest');
  const existingContest = await getActiveContest(roomId);

  if (existingContest) {
    return { success: false, message: 'A contest is already active' };
  }

  await startGiftShowerContest(roomId, 'Newbies', durationMinutes, prizeCredits, giftId);

  const giftMsg = giftId ? ` with gift ${giftId}` : '';
  return { success: true, message: `Contest started for ${durationMinutes} minutes with ${prizeCredits} credits prize${giftMsg}!` };
}

// Get user's most expensive pet
export function getMostExpensivePet(petIds: string[]): { pet: StoreItem; price: number } | null {
  if (!petIds || petIds.length === 0) return null;

  let mostExpensive: StoreItem | null = null;
  let maxPrice = 0;

  for (const petId of petIds) {
    const pet = STORE_ITEMS.find(i => i.id === petId && i.type === 'pet');
    if (pet && pet.price > maxPrice) {
      mostExpensive = pet;
      maxPrice = pet.price;
    }
  }

  return mostExpensive ? { pet: mostExpensive, price: maxPrice } : null;
}

export function getMostExpensiveAsset(assetIds: string[]): { asset: StoreItem; price: number } | null {
  if (!assetIds || assetIds.length === 0) return null;

  let mostExpensive: StoreItem | null = null;
  let maxPrice = 0;

  for (const assetId of assetIds) {
    const asset = STORE_ITEMS.find(i => i.id === assetId && i.type === 'asset');
    if (asset && asset.price > maxPrice) {
      mostExpensive = asset;
      maxPrice = asset.price;
    }
  }

  return mostExpensive ? { asset: mostExpensive, price: maxPrice } : null;
}

// Subscribe to friend requests in real-time
export function subscribeToFriendRequests(userId: string, callback: (requests: string[]) => void): () => void {
  const userRef = doc(db, 'users', userId);

  const unsubscribe = onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data.friendRequests || []);
    }
  });

  return unsubscribe;
}

// Subscribe to room participants in real-time
export function subscribeToRoomParticipants(roomId: string, callback: (participants: string[]) => void): () => void {
  const roomRef = doc(db, 'chatrooms', roomId);

  const unsubscribe = onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data.participants || []);
    }
  });

  return unsubscribe;
}

// Cleanup stale online users who have not been active in the last `inactiveMs` milliseconds.
// This is run by active clients to ensure users who went idle or closed the app are removed from rooms
// and marked offline when their `lastActive` timestamp is older than the threshold.
export async function cleanupStaleUsers(inactiveMs: number = 20 * 60 * 1000): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - inactiveMs);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isOnline', '==', true), where('lastActive', '<', cutoff));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    for (const docSnap of snapshot.docs) {
      const uid = docSnap.id;
      console.log('Cleaning up stale user:', uid);

      try {
        // Remove from all rooms and announce to rooms
        await removeUserFromAllRooms(uid, true);
      } catch (e) {
        console.error('Failed to remove user from rooms during cleanup:', uid, e);
      }

      try {
        // Set RTDB status offline if present
        const statusRef = ref(rtdb, `status/${uid}`);
        await set(statusRef, {
          isOnline: false,
          lastSeen: rtdbServerTimestamp()
        });
      } catch (e) {
        console.warn('Failed to set RTDB status for stale user:', uid, e);
      }

      try {
        // Try to update Firestore user doc to set offline. This may fail if security rules forbid it from arbitrary clients.
        await updateDoc(doc(db, 'users', uid), {
          isOnline: false,
          lastActive: serverTimestamp()
        });
      } catch (e) {
        console.warn('Failed to update Firestore user doc for stale user (may be a security rule):', uid, e);
      }
    }
  } catch (e) {
    console.error('Failed to cleanup stale users:', e);
  }
}

// explicit export to ensure TypeScript recognizes the helper across modules
// export { invalidateUserCache }; // Removed to fix redeclaration error
