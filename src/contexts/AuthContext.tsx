import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, onSnapshot, runTransaction, deleteField, increment, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { getUserByUsername, getUserById, invalidateUserCache, createUserAlert } from '@/lib/firebaseOperations';
import { isValidUsername, normalizeUsername, isEmail } from '@/lib/utils';
import { ref, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { auth, db, rtdb } from '@/lib/firebase';
import { needsWeeklyReset } from '@/lib/weeklyUtils';
import { useToast } from '@/hooks/use-toast';
import type { GiftShowerContest } from '@/lib/giftContest';

export interface UserProfile {
  uid: string;
  username: string;
  usernameLower?: string;
  email: string;
  emailLower?: string;
  fullName: string;
  age: number;
  gender: string;
  country: string;
  avatar: string;
  profileImageUrl?: string;
  profileImagePath?: string;
  avatarItems: {
    background?: string;
    face?: string;
    frame?: string;
  };
  statusMessage: string;
  credits: number;
  level: number;
  xp: number;
  friends: string[];
  friendRequests: string[];
  blockedUsers?: string[];
  pets: string[];
  assets: string[];
  assetQuantities?: { [key: string]: number };
  petExpiryMap?: { [key: string]: number };
  assetExpiryMap?: { [key: string]: number[] };
  ownedCompanions?: string[];
  equippedCompanionId?: string | null;
  companionSettings?: {
    enabled: boolean;
    publicReactions: boolean;
  };
  companionState?: {
    lastPublicAt?: number;
    lastTriggerAtByType?: { [key: string]: number };
    winStreak?: number;
  };
  ownedEmoticonPacks?: string[];
  ownedAvatarItems: string[];
  ownedMerchantPacks?: string[];
  merchantLevel?: 'basic' | 'pro' | 'elite';
  mentorLevel?: 'standard' | 'elite';
  giftsSent: number;
  giftsReceived: number;
  unconvertedGifts?: number;
  // weekly stats
  gamesPlayedWeekly?: number;
  redeemsThisWeek?: number;
  isMerchant: boolean;
  isMentor?: boolean;
  isAdmin: boolean;
  /** chat moderators with limited global rights, only inside chat rooms */
  isChatAdmin?: boolean;
  isStaff?: boolean;
  isBanned: boolean;
  banReason?: string;
  isOnline: boolean;
  lastSeen: any;
  profileLikes: number;
  favoriteRooms: string[];
  recentRooms: string[];
  lastDailySpin: any;
  lastDailyRefund: any;
  xpBoostMultiplier?: number;
  xpBoostEndTime?: number;
  // Expiry timestamps for merchant/mentor (ms since epoch)
  merchantExpiry?: number;
  mentorExpiry?: number;
  sessionId?: string;
  unreadMessages?: { [conversationId: string]: number };
  createdAt: any;
  lastActive: any;
  lastDailyCollection: any;
  // manual presence/status set by user. if not provided fallback to isOnline boolean
  presence?: 'online' | 'away' | 'busy' | 'offline';
  // timestamp of the last time weekly counters were cleared for this user
  lastWeeklyReset?: any;
  dailyMissions?: {
    resetAt?: number;
    updatedAt?: number;
    allCompleted?: boolean;
    allCompletedRewarded?: boolean;
    roomsVisitedToday?: string[];
    missions?: Record<string, {
      progress: number;
      target: number;
      xp: number;
      completed: boolean;
      rewarded: boolean;
    }>;
  };
}

interface SignUpData {
  fullName: string;
  age: number;
  gender: string;
  country: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  /** contest that was active when the user logged in */
  contestAnnouncement: import('@/lib/giftContest').GiftShowerContest | null;
  clearContestAnnouncement: () => void;
  /**
   * Accepts either an email address or a username. When a username is provided
   * the helper `getEmailForIdentifier` will resolve it to the associated email
   * before attempting Firebase authentication.
   */
  signIn: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, username: string, data: SignUpData, normalizedUsername?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  updatePresence: (presence: 'online'|'away'|'busy'|'offline') => Promise<void>;
  updateAvatarItems: (items: UserProfile['avatarItems']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_AVATARS = [
  '🐶','🐱','🐼','🐵','🦊','🐯','🐷','🐰'
];

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Given an arbitrary login identifier (email address or username) resolve the
 * corresponding email address that Firestore authentication expects. This
 * helper is exported for unit testing as well as being used internally by the
 * `signIn` method below.
 */
export async function getEmailForIdentifier(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (!trimmed) throw new Error('Email or username is required');
  // treat anything containing @ as an email address
  if (trimmed.includes('@')) {
    return trimmed;
  }
  // otherwise look up by username; the lookup operates case-insensitively
  const profile = await getUserByUsername(trimmed);
  if (!profile) {
    throw new Error('No account found with that username or email');
  }
  return profile.email;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [contestAnnouncement, setContestAnnouncement] = useState<GiftShowerContest | null>(null);
  const clearContestAnnouncement = () => setContestAnnouncement(null);
  const { toast } = useToast();

  const fetchUserProfile = async (uid: string) => {
    try {
      // getUserById includes caching and returns null if missing
      const data = await getUserById(uid);
      if (!data) return null;

      const profile: UserProfile = {
        ...data,
        giftsSent: data.giftsSent || 0,
        giftsReceived: data.giftsReceived || 0,
        unconvertedGifts: data.unconvertedGifts || 0,
        gamesPlayedWeekly: data.gamesPlayedWeekly || 0,
        redeemsThisWeek: data.redeemsThisWeek || 0,
        lastWeeklyReset: data.lastWeeklyReset || null,
        isMerchant: data.isMerchant || false,
        isAdmin: data.isAdmin || false,
        isBanned: data.isBanned || false,
        // presence is an optional manual override for online/away/busy/offline.
        // Older users may not have it so we fall back to the boolean `isOnline`.
        presence: data.presence as any,
        isOnline: (data.presence ? data.presence !== 'offline' : data.isOnline !== false),
        profileLikes: data.profileLikes || 0,
        favoriteRooms: data.favoriteRooms || [],
        recentRooms: data.recentRooms || [],
        blockedUsers: data.blockedUsers || [],
        ownedAvatarItems: data.ownedAvatarItems || [],
        ownedCompanions: data.ownedCompanions || [],
        equippedCompanionId: data.equippedCompanionId || null,
        companionSettings: data.companionSettings || { enabled: true, publicReactions: true },
        companionState: data.companionState || { lastPublicAt: 0, lastTriggerAtByType: {}, winStreak: 0 },
        avatarItems: data.avatarItems || {},
        statusMessage: data.statusMessage || '',
        fullName: data.fullName || '',
        age: data.age || 0,
        gender: data.gender || '',
        country: data.country || '',
      };

      // Check if banned
      if (profile.isBanned) {
        await signOut(auth);
        throw new Error(`Account suspended: ${profile.banReason || 'Contact admin for details'}`);
      }

      // Normalize merchant/mentor booleans based on expiry timestamps
      const now = Date.now();
      profile.isMerchant = !!(profile.merchantExpiry && profile.merchantExpiry > now);
      profile.isMentor = !!(profile.mentorExpiry && profile.mentorExpiry > now);

      setUserProfile(profile);
      return profile;
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      // always invalidate cache so callers can rely on fresh data after any
      // mutation (avatar update, credits transfer, etc.)
      invalidateUserCache(user.uid);
      await fetchUserProfile(user.uid);
    }
  };

  // Set up presence system
  const setupPresence = (uid: string) => {
    const userStatusRef = ref(rtdb, `status/${uid}`);
    const userDocRef = doc(db, 'users', uid);

    // default to online when we first connect
    set(userStatusRef, {
      isOnline: true,
      presence: 'online',
      lastSeen: rtdbServerTimestamp()
    });

    // Set offline on disconnect (including manual presence)
    onDisconnect(userStatusRef).set({
      isOnline: false,
      presence: 'offline',
      lastSeen: rtdbServerTimestamp()
    });

    // Update Firestore
    updateDoc(userDocRef, {
      isOnline: true,
      presence: 'online',
      lastActive: serverTimestamp()
    });
  };

  // Remove user from all rooms and logout due to inactivity
  const handleInactivityLogout = async (uid: string | null) => {
    if (!uid) return;

    try {
      // Remove user from all rooms and announce the logout
      await import('@/lib/firebaseOperations').then(async (ops) => {
        if (ops.removeUserFromAllRooms) await ops.removeUserFromAllRooms(uid, true);
      });
    } catch (e) {
      console.error('Failed to remove user from rooms before logout:', e);
    }

    // Notify user about inactivity logout
    try {
      toast({
        title: 'Logged out for inactivity',
        description: 'You were logged out after 20 minutes of inactivity to protect your account.',
      });
    } catch (e) {
      // ignore toast errors
      console.warn('Failed to show inactivity toast:', e);
    }

    // Call existing logout to set offline and sign out
    await logout();
  };

  // Inactivity watcher - listens for user interactions and logs out after period of inactivity
  const startInactivityWatcher = (uid: string) => {
    const INACTIVE_MS = 20 * 60 * 1000; // 20 minutes
    let lastUpdate = 0;
    let timeoutHandle: any = null;

    const refreshActivity = async () => {
      const now = Date.now();
      // Update lastActive sparsely to reduce write pressure (at most once per 5 minutes).
      if (now - (lastUpdate || 0) > 5 * 60 * 1000) {
        try {
          await updateDoc(doc(db, 'users', uid), { lastActive: serverTimestamp() });
          lastUpdate = now;
        } catch (e) {
          console.error('Failed to update lastActive on activity:', e);
        }
      }
      // reset timeout
      if (timeoutHandle) clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => handleInactivityLogout(uid), INACTIVE_MS);
    };

    // Event handlers
    const activityHandler = () => {
      // Debounce frequent events
      try { refreshActivity(); } catch (e) { console.error(e); }
    };

    // Start timeout
    timeoutHandle = setTimeout(() => handleInactivityLogout(uid), INACTIVE_MS);

    // Attach listeners
    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('keydown', activityHandler);
    window.addEventListener('click', activityHandler);
    window.addEventListener('touchstart', activityHandler);
    // Only treat visibilitychange as activity when the document becomes visible again.
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        activityHandler();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Return a function to stop listening
    return () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      window.removeEventListener('click', activityHandler);
      window.removeEventListener('touchstart', activityHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  };


  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clean up previous profile listener if any
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (!isMounted) return;

      setUser(user);
      if (user) {
        try {
          const profile = await fetchUserProfile(user.uid);
          // fetch any active contest for announcement
          try {
            const { getAnyActiveContest } = await import('@/lib/giftContest');
            const active = await getAnyActiveContest();
            setContestAnnouncement(active);
          } catch (e) {
            console.warn('failed to load active contest announcement', e);
          }
          if (!isMounted) return;

          // Check for single device login
          const currentSessionId = generateSessionId();
          const userDocRef = doc(db, 'users', user.uid);

          // Update session ID
          await updateDoc(userDocRef, {
            sessionId: currentSessionId,
            lastActive: serverTimestamp()
          });

          if (!isMounted) return;

          // Set up presence
          setupPresence(user.uid);

          // Listen for session changes and profile updates (including unreadMessages)
          unsubProfile = onSnapshot(userDocRef, (snapshot) => {
            if (!isMounted) return;
            const data = snapshot.data();
            if (data) {
              // Check for single device enforcement
              if (data.sessionId && data.sessionId !== currentSessionId) {
                // Another device logged in, force logout
                signOut(auth);
                setUserProfile(null);
                return;
              }

              // Check if user was banned while online
              if (data.isBanned) {
                signOut(auth);
                setUserProfile(null);
                return;
              }

              // Update user profile with latest data (including unreadMessages and avatar)
              setUserProfile(prev => prev ? {
                ...prev,
                unreadMessages: data.unreadMessages || {},
                credits: data.credits ?? prev.credits,
                xp: data.xp ?? prev.xp,
                level: data.level ?? prev.level,
                friends: data.friends ?? prev.friends,
                friendRequests: data.friendRequests ?? prev.friendRequests,
                blockedUsers: data.blockedUsers ?? prev.blockedUsers ?? [],
                avatar: data.avatar ?? prev.avatar,
                avatarItems: data.avatarItems ?? prev.avatarItems,
                profileImageUrl: data.profileImageUrl ?? prev.profileImageUrl,
                profileImagePath: data.profileImagePath ?? prev.profileImagePath,
                unconvertedGifts: data.unconvertedGifts ?? prev.unconvertedGifts ?? 0,
                ownedCompanions: data.ownedCompanions ?? prev.ownedCompanions ?? [],
                equippedCompanionId: data.equippedCompanionId ?? prev.equippedCompanionId ?? null,
                companionSettings: data.companionSettings ?? prev.companionSettings ?? { enabled: true, publicReactions: true },
                companionState: data.companionState ?? prev.companionState ?? { lastPublicAt: 0, lastTriggerAtByType: {}, winStreak: 0 },
              } : null);
            }
          });
        } catch (error: any) {
          console.error('Auth error:', error);
          if (isMounted) setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      if (unsubProfile) unsubProfile();
      unsubscribe();
    };
  }, []);

  // Start/stop inactivity watcher when auth changes
  useEffect(() => {
    let stopWatcher: (() => void) | null = null;
    let cleanupInterval: NodeJS.Timeout | null = null;

    if (user && user.uid) {
      stopWatcher = startInactivityWatcher(user.uid);

      // Run a cleanup immediately and then periodically to ensure stale users are removed
      import('@/lib/firebaseOperations').then(async (ops) => {
        try {
          if (ops.cleanupStaleUsers) await ops.cleanupStaleUsers();
        } catch (e) {
          console.warn('Initial stale cleanup failed:', e);
        }

        // Schedule periodic cleanup every 5 minutes
        cleanupInterval = setInterval(() => {
          try { if (ops.cleanupStaleUsers) ops.cleanupStaleUsers(); } catch (e) { console.warn('Periodic stale cleanup failed:', e); }
        }, 5 * 60 * 1000);
      }).catch(e => console.warn('Failed to import firebaseOperations for cleanup:', e));
    }

    return () => {
      if (stopWatcher) stopWatcher();
      if (cleanupInterval) clearInterval(cleanupInterval as any);
    };
  }, [user]);


  const signIn = async (identifier: string, password: string, rememberMe: boolean = false) => {
    // Show global auth loading while the sign-in flow and profile fetch completes
    setLoading(true);
    try {
      // Resolve identifier into email if necessary
      const email = await getEmailForIdentifier(identifier);
      // Set persistence based on remember me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
      }

      // Check if user is banned before completing sign-in
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isBanned) {
          await signOut(auth);
          throw new Error(`Your account has been suspended. Reason: ${userData.banReason || 'Contact admin for details'}`);
        }
      }

      // On successful sign-in, clear the global loading flag so ProtectedRoute renders the
      // home layout immediately (it will show skeletons while the profile finishes loading).
      setLoading(false);
    } catch (e) {
      // If sign-in fails, ensure we clear the loading state so UI doesn't stay stuck
      setLoading(false);
      throw e;
    }
  };

  const signUp = async (email: string, password: string, username: string, data: SignUpData, normalizedUsername?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

    await updateProfile(userCredential.user, { displayName: username });

    // Send verification email
    await sendEmailVerification(userCredential.user);

    // Validate username server-side (case-insensitive rules)
    const normalized = normalizedUsername || normalizeUsername(username);
    if (!isValidUsername(username)) {
      throw new Error('Invalid username. Must be 3-20 characters, must start with a letter, no spaces, and only letters, numbers, ., _, -');
    }

    // Create user profile in Firestore (use a transaction to reserve username index to avoid races)
    const userDoc: Omit<UserProfile, 'uid'> = {
      username,
      usernameLower: normalized,
      email,
      emailLower: email.trim().toLowerCase(),
      fullName: data.fullName,
      age: data.age,
      gender: data.gender,
      country: data.country,
      avatar: randomAvatar,
      avatarItems: {},
      statusMessage: '',
      credits: 5.00,
      level: 1,
      xp: 0,
      friends: [],
      friendRequests: [],
      blockedUsers: [],
      pets: [],
      assets: [],
      petExpiryMap: {},
      assetExpiryMap: {},
      ownedCompanions: [],
      equippedCompanionId: null,
      companionSettings: { enabled: true, publicReactions: true },
      companionState: { lastPublicAt: 0, lastTriggerAtByType: {}, winStreak: 0 },
      ownedAvatarItems: [],
      giftsSent: 0,
      giftsReceived: 0,
      isMerchant: false,
      isAdmin: false,
      isChatAdmin: false,
      isBanned: false,
      lastSeen: serverTimestamp(),
      isOnline: true,
      profileLikes: 0,
      favoriteRooms: [],
      recentRooms: [],
      lastDailySpin: null,
      lastDailyRefund: null,
      xpBoostMultiplier: 1,
      xpBoostEndTime: 0,
      sessionId: generateSessionId(),
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      lastDailyCollection: null,
    };

    let inviteRewardMeta: { inviterUid?: string; inviterUsername?: string; invitedEmail?: string; rewarded?: boolean } | null = null;
    try {
      inviteRewardMeta = await runTransaction(db, async (tx) => {
        const indexRef = doc(db, 'usernameIndex', normalized);
        const userRef = doc(db, 'users', userCredential.user.uid);
        const emailLower = email.trim().toLowerCase();
        const inviteRef = doc(db, 'emailInvites', emailLower);

        // Read phase: Firestore transactions require all reads to complete before writes.
        const indexSnap = await tx.get(indexRef);
        if (indexSnap.exists()) {
          throw new Error('Username already taken');
        }

        const inviteSnap = await tx.get(inviteRef);
        let inviteData: any = null;
        let inviterRef: ReturnType<typeof doc> | null = null;
        let inviterExists = false;
        if (inviteSnap.exists()) {
          const data = inviteSnap.data() as any;
          if (data?.status === 'pending' && data?.inviterUid && data.inviterUid !== userCredential.user.uid) {
            inviterRef = doc(db, 'users', data.inviterUid);
            const inviterSnap = await tx.get(inviterRef);
            if (inviterSnap.exists()) {
              inviterExists = true;
              inviteData = data;
            }
          }
        }

        // Write phase.
        tx.set(userRef, userDoc);
        tx.set(indexRef, { uid: userCredential.user.uid, createdAt: serverTimestamp() });

        if (inviterExists && inviterRef && inviteData) {
          const rewardAmount = 5.00;
          tx.update(inviterRef, {
            credits: increment(rewardAmount),
          });
          tx.update(inviteRef, {
            status: 'registered',
            registeredUserId: userCredential.user.uid,
            registeredAt: serverTimestamp(),
            rewardCredits: rewardAmount,
            updatedAt: serverTimestamp(),
          });

          const rewardTxRef = doc(collection(db, 'transactions'));
          tx.set(rewardTxRef, {
            from: 'system',
            to: inviteData.inviterUid,
            participants: [inviteData.inviterUid],
            amount: rewardAmount,
            type: 'invite_bonus',
            description: `Invite reward for ${emailLower}`,
            timestamp: serverTimestamp(),
          });
          return {
            inviterUid: inviteData.inviterUid,
            inviterUsername: inviteData.inviterUsername || '',
            invitedEmail: emailLower,
            rewarded: true,
          };
        }

        return { rewarded: false };
      });
    } catch (e: any) {
      // Roll back by deleting the newly created auth user
      try { await userCredential.user.delete(); } catch (err) { /* ignore */ }
      throw e;
    }

    if (inviteRewardMeta?.rewarded && inviteRewardMeta.inviterUid) {
      let lotteryCode = '';
      try {
        const { recordInviteRegistrationForActiveContest } = await import('@/lib/giftContest');
        const contestRes = await recordInviteRegistrationForActiveContest(
          inviteRewardMeta.inviterUid,
          inviteRewardMeta.inviterUsername || '',
          inviteRewardMeta.invitedEmail || email.trim().toLowerCase(),
          userCredential.user.uid
        );
        lotteryCode = contestRes.lotteryCode || '';
      } catch (e) {
        console.warn('Failed to record invite contest registration:', e);
      }

      try {
        const codeText = lotteryCode ? ` Lottery code: ${lotteryCode}` : '';
        await createUserAlert(
          inviteRewardMeta.inviterUid,
          'daily_credits',
          `You earned 5.00 credits from a successful Bimo33 invitation.${codeText}`
        );
      } catch (e) {
        console.warn('Failed to create invite reward alert:', e);
      }
    }

    // Sign out after registration - user must verify email first
    await signOut(auth);
  };

  const logout = async () => {
    if (user) {
      const uid = user.uid;
      // Remove user from all rooms (do not announce on explicit logout)
      try {
        await import('@/lib/firebaseOperations').then(async (ops) => {
          if (ops.removeUserFromAllRooms) await ops.removeUserFromAllRooms(uid, true);

          // Verify no rooms remain; if any do, attempt to leave them individually
          try {
            if (ops.getChatroomsForParticipant && ops.leaveChatroom) {
              const remaining = await ops.getChatroomsForParticipant(uid);
              if (remaining.length > 0) {
                console.warn('Remaining rooms after bulk removal, attempting per-room leave:', remaining.map(r => r.id));
                for (const r of remaining) {
                  try { await ops.leaveChatroom(r.id, uid); } catch (e) { console.warn('Failed to leave room via leaveChatroom:', r.id, e); }
                }
                // Re-check
                const stillHere = await ops.getChatroomsForParticipant(uid);
                if (stillHere.length > 0) {
                  console.warn('User still present in rooms after retry:', stillHere.map(r => r.id));
                  try { toast({ title: 'Logout cleanup incomplete', description: 'Some rooms could not remove you automatically. Please contact support.' }); } catch (e) { /* ignore toast failures */ }
                }
              }
            }
          } catch (e) {
            console.warn('Verification of room removal failed:', e);
          }
        });
      } catch (e) {
        console.warn('Failed to remove user from rooms during logout:', e);
      }

      // Set offline (also clear manual presence)
      const userStatusRef = ref(rtdb, `status/${user.uid}`);
      await set(userStatusRef, {
        isOnline: false,
        presence: 'offline',
        lastSeen: rtdbServerTimestamp()
      });

      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: false,
        presence: 'offline',
        lastActive: serverTimestamp()
      });
    }
    await signOut(auth);
    setUserProfile(null);

    // Broadcast a logout event so UI-level components can react (clear tabs, navigate away)
    try {
      window.dispatchEvent(new CustomEvent('app:logout'));
    } catch (e) { /* ignore */ }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateStatus = async (status: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      statusMessage: status
    });
  };

  // allow manually setting presence from the UI
  const updatePresence = async (presence: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user) return;
    const userStatusRef = ref(rtdb, `status/${user.uid}`);
    const isOnline = presence !== 'offline';
    // update both RTDB presence node and user document
    await set(userStatusRef, {
      isOnline,
      presence,
      lastSeen: rtdbServerTimestamp()
    });
    await updateDoc(doc(db, 'users', user.uid), {
      isOnline,
      presence
    });
    // Clear cache and let the existing profile onSnapshot propagate the update.
    invalidateUserCache(user.uid);
  };

  const updateAvatarItems = async (items: UserProfile['avatarItems']) => {
    if (!user) return;
    // apply locally first so UI feels instantaneous
    setUserProfile(prev => prev ? { ...prev, avatarItems: items } : prev);

    try {
      // Firestore rejects undefined values, so build a payload that either
      // sets or deletes each sub-key explicitly.
      const payload: Record<string, any> = {};
      if (items.background !== undefined) {
        payload['avatarItems.background'] = items.background;
      } else {
        payload['avatarItems.background'] = deleteField();
      }
      if (items.face !== undefined) {
        payload['avatarItems.face'] = items.face;
      } else {
        payload['avatarItems.face'] = deleteField();
      }
      if (items.frame !== undefined) {
        payload['avatarItems.frame'] = items.frame;
      } else {
        payload['avatarItems.frame'] = deleteField();
      }

      await updateDoc(doc(db, 'users', user.uid), payload);

      // clear cached data so our listener or any future fetch will pull fresh data
      invalidateUserCache(user.uid);
      // NOTE: we used to call refreshProfile() here, but that can trigger a
      // fetch of stale data immediately after the write. instead we rely on the
      // realtime onSnapshot listener (which is already wired up in
      // AuthContext) to propagate the updated profile once the write has
      // finished. removing the explicit refresh prevents the UI from briefly
      // reverting to an outdated value and keeps the equipped frame stable.
    } catch (err) {
      console.error('Failed to update avatar items:', err);
      // revert local state so user isn't left with an out-of-sync preview
      setUserProfile(prev => prev ? { ...prev, avatarItems: prev.avatarItems } : prev);
      toast({ title: 'Unable to equip avatar item', variant: 'destructive' });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      contestAnnouncement,
      clearContestAnnouncement,
      signIn,
      signUp,
      logout,
      resetPassword,
      refreshProfile,
      updateStatus,
      updatePresence,
      updateAvatarItems
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
