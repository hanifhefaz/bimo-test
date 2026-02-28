// Badge system based on user levels
export interface Badge {
  id: string;
  name: string;
  emoji: string;
  minLevel: number;
  color: string;
  description: string;
}

// Badge levels: 1, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600
export const BADGES: Badge[] = [
  {
    id: 'noob',
    name: 'Noob',
    emoji: '🐣',
    minLevel: 0,
    color: 'text-green-400',
    description: 'Just getting started',
  },
  {
    id: 'rookie',
    name: 'Rookie',
    emoji: '🎯',
    minLevel: 100,
    color: 'text-lime-400',
    description: 'Learning the ropes',
  },
  {
    id: 'grinder',
    name: 'Grinder',
    emoji: '⛏️',
    minLevel: 300,
    color: 'text-yellow-500',
    description: 'Putting in the work',
  },
  {
    id: 'pro',
    name: 'Pro',
    emoji: '⚡',
    minLevel: 600,
    color: 'text-orange-400',
    description: 'Playing at a high level',
  },
  {
    id: 'sweat',
    name: 'Sweat',
    emoji: '🔥',
    minLevel: 1000,
    color: 'text-red-500',
    description: 'Always competing hard',
  },
  {
    id: 'elite',
    name: 'Elite',
    emoji: '💎',
    minLevel: 2000,
    color: 'text-cyan-400',
    description: 'Top-tier performance',
  },
  {
    id: 'captain',
    name: 'Captain',
    emoji: '🧭',
    minLevel: 4000,
    color: 'text-blue-400',
    description: 'Leading the way',
  },
  {
    id: 'master',
    name: 'Master',
    emoji: '🧠',
    minLevel: 10000,
    color: 'text-purple-400',
    description: 'Strategic mastery',
  },
  {
    id: 'legend',
    name: 'Legend',
    emoji: '👑',
    minLevel: 20000,
    color: 'text-amber-400',
    description: 'Legendary status',
  },
];


export function getBadgeForLevel(level: number): Badge {
  // Find the highest badge the user qualifies for
  const qualifiedBadges = BADGES.filter(b => level >= b.minLevel);
  return qualifiedBadges[qualifiedBadges.length - 1] || BADGES[0];
}

export function getAllBadgesForLevel(level: number): Badge[] {
  return BADGES.filter(b => level >= b.minLevel);
}

export function getNextBadge(level: number): Badge | null {
  const nextBadge = BADGES.find(b => b.minLevel > level);
  return nextBadge || null;
}

export function getLevelsUntilNextBadge(level: number): number {
  const nextBadge = getNextBadge(level);
  if (!nextBadge) return 0;
  return nextBadge.minLevel - level;
}

export function getProgressToNextBadge(level: number): number {
  const currentBadge = getBadgeForLevel(level);
  const nextBadge = getNextBadge(level);
  
  if (!nextBadge) return 100;
  
  const levelsFromCurrent = level - currentBadge.minLevel;
  const levelsBetweenBadges = nextBadge.minLevel - currentBadge.minLevel;
  
  return Math.round((levelsFromCurrent / levelsBetweenBadges) * 100);
}
