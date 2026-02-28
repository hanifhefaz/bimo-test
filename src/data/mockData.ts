import { User, Pet, Asset, ChatRoom, Message, StoreItem, Gift } from '@/types';

// Mock current user
export const mockCurrentUser: User = {
  id: 'user1',
  username: 'CyberNinja',
  email: 'ninja@example.com',
  avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CyberNinja',
  credits: 5000,
  level: 12,
  xp: 2450,
  createdAt: new Date('2024-01-15'),
  friends: ['user2', 'user3', 'user4'],
  friendRequests: ['user5', 'user6'],
  sentFriendRequests: ['user7'],
  pets: [
    {
      id: 'pet1',
      name: 'Shadow',
      type: 'cat',
      image: '🐱',
      price: 100,
      lastFed: new Date(),
    },
    {
      id: 'pet2',
      name: 'Blaze',
      type: 'dragon',
      image: '🐉',
      price: 200,
      lastFed: null,
    },
  ],
  assets: [
    {
      id: 'asset1',
      name: 'Crystal Gem',
      type: 'crystal_gem',
      image: '💎',
      price: 150,
      purchasedAt: new Date('2024-06-01'),
    },
  ],
  lastDailyCollection: null,
};

// Mock friends
export const mockFriends: User[] = [
  {
    id: 'user2',
    username: 'PixelQueen',
    email: 'queen@example.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PixelQueen',
    credits: 8500,
    level: 18,
    xp: 4200,
    createdAt: new Date('2024-01-10'),
    friends: ['user1'],
    friendRequests: [],
    pets: [{ id: 'pet3', name: 'Luna', type: 'dog', image: '🐕', price: 100, lastFed: new Date() }],
    assets: [],
    lastDailyCollection: null,
  },
  {
    id: 'user3',
    username: 'NeonRider',
    email: 'neon@example.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NeonRider',
    credits: 3200,
    level: 9,
    xp: 1800,
    createdAt: new Date('2024-02-20'),
    friends: ['user1'],
    friendRequests: [],
    pets: [],
    assets: [{ id: 'asset2', name: 'Magic Wand', type: 'magic_wand', image: '🪄', price: 100, purchasedAt: new Date() }],
    lastDailyCollection: null,
  },
  {
    id: 'user4',
    username: 'StarGazer',
    email: 'star@example.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=StarGazer',
    credits: 12000,
    level: 25,
    xp: 8500,
    createdAt: new Date('2023-12-01'),
    friends: ['user1'],
    friendRequests: [],
    pets: [
      { id: 'pet4', name: 'Spark', type: 'dragon', image: '🐉', price: 200, lastFed: new Date() },
    ],
    assets: [],
    lastDailyCollection: null,
  },
];

// Mock friend requests
export const mockFriendRequests: User[] = [
  {
    id: 'user5',
    username: 'CloudWalker',
    email: 'cloud@example.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CloudWalker',
    credits: 1500,
    level: 5,
    xp: 800,
    createdAt: new Date('2024-03-15'),
    friends: [],
    friendRequests: [],
    pets: [],
    assets: [],
    lastDailyCollection: null,
  },
  {
    id: 'user6',
    username: 'FireStorm',
    email: 'fire@example.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FireStorm',
    credits: 2800,
    level: 7,
    xp: 1200,
    createdAt: new Date('2024-03-10'),
    friends: [],
    friendRequests: [],
    pets: [],
    assets: [],
    lastDailyCollection: null,
  },
];

// Mock chat rooms
export const mockChatRooms: ChatRoom[] = [
  {
    id: 'room1',
    name: 'General Lounge',
    ownerId: 'user1',
    moderators: ['user2'],
    isPrivate: false,
    topic: 'Chat about anything!',
    participants: ['user1', 'user2', 'user3', 'user4'],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'room2',
    name: 'Gaming Hub',
    ownerId: 'user2',
    moderators: [],
    isPrivate: false,
    topic: 'Play games and win credits!',
    participants: ['user1', 'user2'],
    createdAt: new Date('2024-02-15'),
  },
  {
    id: 'room3',
    name: 'Pet Lovers',
    ownerId: 'user1',
    moderators: ['user4'],
    isPrivate: false,
    topic: 'Share your pets and feed others!',
    participants: ['user1', 'user4'],
    createdAt: new Date('2024-03-01'),
  },
];

// Mock messages
export const mockMessages: Message[] = [
  {
    id: 'msg1',
    roomId: 'room1',
    senderId: 'user2',
    senderUsername: 'PixelQueen',
    senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PixelQueen',
    content: 'Hey everyone! Anyone up for a game?',
    type: 'message',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 'msg2',
    roomId: 'room1',
    senderId: 'user3',
    senderUsername: 'NeonRider',
    senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=NeonRider',
    content: "I'm in! Let's play dice!",
    type: 'message',
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: 'msg3',
    roomId: 'room1',
    senderId: 'system',
    senderUsername: 'System',
    senderAvatar: '',
    content: 'StarGazer has joined the room',
    type: 'system',
    timestamp: new Date(Date.now() - 2400000),
  },
];

// Store items
export const storeItems: StoreItem[] = [
  {
    id: 'store1',
    name: 'Fluffy Cat',
    type: 'pet',
    subType: 'cat',
    price: 100,
    image: '🐱',
    description: 'A cute fluffy companion that purrs with joy!',
  },
  {
    id: 'store2',
    name: 'Loyal Dog',
    type: 'pet',
    subType: 'dog',
    price: 100,
    image: '🐕',
    description: 'Your best friend forever, always by your side!',
  },
  {
    id: 'store3',
    name: 'Mystic Dragon',
    type: 'pet',
    subType: 'dragon',
    price: 200,
    image: '🐉',
    description: 'A legendary creature with magical powers!',
  },
  {
    id: 'store4',
    name: 'Crystal Gem',
    type: 'asset',
    subType: 'crystal_gem',
    price: 150,
    image: '💎',
    description: 'Generates 15 credits daily. A shimmering investment!',
  },
  {
    id: 'store5',
    name: 'Magic Wand',
    type: 'asset',
    subType: 'magic_wand',
    price: 100,
    image: '🪄',
    description: 'Generates 10 credits daily. Wave it for luck!',
  },
  {
    id: 'store6',
    name: 'Treasure Chest',
    type: 'asset',
    subType: 'treasure_chest',
    price: 200,
    image: '📦',
    description: 'Generates 20 credits daily. Full of surprises!',
  },
];

// Gifts
export const gifts: Gift[] = [
  { id: 'gift1', name: 'Rose', type: 'rose', image: '🌹', price: 50 },
  { id: 'gift2', name: 'Chocolate', type: 'chocolate', image: '🍫', price: 30 },
  { id: 'gift3', name: 'Teddy Bear', type: 'teddy_bear', image: '🧸', price: 100 },
];
