// User types
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  country: string;
  statusMessage: string;
  level: number;
  xp: number;
  credits: number;
  giftsSent: number;
  giftsReceived: number;
  pets: string[];
  assets: string[];
  avatar: AvatarConfig;
  isMerchant: boolean;
  isMentor?: boolean;
  merchantLevel?: string;
  mentorLevel?: string;
  // Expiry timestamps (ms since epoch). If present and in the future, the role is active.
  merchantExpiry?: number;
  mentorExpiry?: number;
  isAdmin: boolean;
  /** Limited administrator that only has privileges inside chatrooms (kick/mute/ban). */
  isChatAdmin?: boolean;
  /** Custom role for internal staff members. These users should have their username rendered in black. */
  isStaff?: boolean;
  isBanned: boolean;
  banReason?: string;
  banExpiry?: number;
  // presence is a manual status set by the user. It is undefined for legacy users but
  // will be one of the values below when present.
  presence?: 'online' | 'away' | 'busy' | 'offline';
  isOnline: boolean;
  lastSeen: number;
  favoriteRooms: string[];
  recentRooms: string[];
  friends: string[];
  pendingFriends: string[];
  blockedUsers: string[];
  activeSessionId: string | null;
  createdAt: number;
  lastSpinDate?: string;
  acceptedTerms: boolean;
}

export interface AvatarConfig {
  background: string;
  face: string | null;
  skin?: string;
  hair?: string;
  shirt?: string;
  pants?: string;
  shoes?: string;
}

// Chat types
export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  country?: string;
  isDefault: boolean;
  isPrivate: boolean;
  maxUsers: number;
  currentUsers: number;
  moderators: string[];
  bannedUsers: string[];
  createdAt: number;
  lastActivity: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  content: string;
  type: 'user' | 'system' | 'bot' | 'gift';
  giftData?: {
    giftId: string;
    giftName: string;
    giftEmoji: string;
    recipientId: string;
    recipientName: string;
    amount: number;
  };
  status: 'sending' | 'sent' | 'delivered' | 'read';
  timestamp: number;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  receiverId: string;
  receiverName: string;
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  timestamp: number;
}

// Store types
export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'pet' | 'asset' | 'avatar' | 'merchant';
  category?: 'background' | 'face' | 'shirt' | 'pants' | 'shoes' | 'hair' | 'skin';
  emoji?: string;
  imageUrl?: string;
  dailyCredits?: number;
}

// Game types
export interface GameSession {
  id: string;
  roomId: string;
  gameType: 'lowcard' | 'dice' | 'bimo' | 'luckynumber';
  status: 'waiting' | 'playing' | 'finished';
  betAmount: number;
  players: GamePlayer[];
  currentRound: number;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  winnerId?: string;
  winnerName?: string;
}

export interface GamePlayer {
  odUserId: string;
  username: string;
  isActive: boolean;
  currentCard?: { suit: string; value: number; display: string };
  hasDrawn: boolean;
  joinedAt: number;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  uid: string;
  username: string;
  fullName: string;
  avatar: AvatarConfig;
  value: number;
  badge: string;
}

// Daily spin types
export interface SpinReward {
  id: string;
  type: 'credits' | 'asset' | 'pet' | 'xp';
  value: number;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// Gift shower contest types
export interface GiftShowerContest {
  id: string;
  roomId: string;
  roomName?: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  prizeCredits: number;
  /** gift id that counts in this contest (optional) */
  giftId?: string;
  topSenders?: { odUserId: string; username: string; totalGifts: number }[];
  winnerId?: string;
  winnerName?: string;
}
