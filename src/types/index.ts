export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  credits: number;
  level: number;
  xp: number;
  createdAt: Date;
  friends: string[];
  friendRequests: string[];
  sentFriendRequests?: string[];
  pets: Pet[];
  assets: Asset[];
  lastDailyCollection: Date | null;
}

export interface Pet {
  id: string;
  name: string;
  type: 'cat' | 'dog' | 'dragon';
  image: string;
  price: number;
  lastFed: Date | null;
}

export interface Asset {
  id: string;
  name: string;
  type: 'crystal_gem' | 'magic_wand' | 'treasure_chest';
  image: string;
  price: number;
  purchasedAt: Date;
}

export interface Gift {
  id: string;
  name: string;
  type: 'rose' | 'chocolate' | 'teddy_bear';
  image: string;
  price: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  ownerId: string;
  moderators: string[];
  isPrivate: boolean;
  topic: string;
  participants: string[];
  createdAt: Date;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  content: string;
  type: 'message' | 'system' | 'gift' | 'game';
  timestamp: Date;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
}

export interface GameSession {
  id: string;
  roomId: string;
  type: 'lowcard' | 'dice' | 'bimo' | 'luckynumber' | 'higherlower';
  status: 'waiting' | 'playing' | 'finished';
  players: string[];
  wager: number;
  startedBy: string;
  winner?: string;
  createdAt: Date;
}

export interface StoreItem {
  id: string;
  name: string;
  type: 'pet' | 'asset';
  subType: string;
  price: number;
  image: string;
  description: string;
}
