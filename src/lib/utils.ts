import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatShortNumber(value: number | string | undefined | null): string {
  if (value === null || value === undefined) return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}B`;
  }

  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`;
  }

  return `${num}`;
}

export function formatWithCommas(value: number | string | undefined | null): string {
  // Used primarily for credit/currency amounts. Always show two digits after the
  // decimal point and include comma separators for thousands. This ensures a
  // consistent “2f” display everywhere credits are rendered.
  if (value === null || value === undefined) return "0.00";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Simple human-friendly relative time formatter
export function formatRelativeTime(ts: any): string {
  if (!ts) return 'Unknown';
  let date: Date;
  try {
    if (ts.toDate && typeof ts.toDate === 'function') date = ts.toDate();
    else if (typeof ts === 'number') date = new Date(ts);
    else if (ts.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);
  } catch (e) {
    return 'Unknown';
  }

  const diffMs = Date.now() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  // Older than a week, fall back to short date
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Username helpers
// Must start with a letter, then allow letters, numbers, dot, underscore, or hyphen. Total length 3-20.
const USERNAME_REGEX = /^[a-z][a-z0-9._-]{2,19}$/i;

// email validation used for login/other utilities. very permissive; firebase will
// still reject invalid addresses on auth calls but this keeps client logic simple.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const trimmed = username.trim();
  return USERNAME_REGEX.test(trimmed);
}

/**
 * Returns true when the string looks like an email address. This is intentionally
 * lightweight; we only need it to decide whether to treat a login identifier as
 * an email versus a username. Firebase will perform the real validation during
 * authentication.
 */
export function isEmail(str: string): boolean {
  if (!str) return false;
  return EMAIL_REGEX.test(str.trim());
}

// Returns a tailwind text color class for usernames based on roles
// Standard pack = purple, Pro pack = gold, Elite pack = pink
export function getUsernameColorClass(user?: {
  isAdmin?: boolean;
  isChatAdmin?: boolean;
  isMentor?: boolean;
  isMerchant?: boolean;
  isStaff?: boolean;
  mentorExpiry?: number;
  merchantExpiry?: number;
  merchantLevel?: string;
} | null): string {
  if (!user) return 'text-sky-500';
  const now = Date.now();
  const merchantActive = !!user.isMerchant && (!user.merchantExpiry || user.merchantExpiry > now);
  const mentorActive = !!user.isMentor && (!user.mentorExpiry || user.mentorExpiry > now);

  // Staff should always be shown in black and take precedence over other roles.
  if (user.isStaff) return '#a3e635';        // black for staff users
  if (user.isAdmin) return 'text-destructive'; // red for admins
  // chat admins are beneath full admins but above everyone else; give them a yellow hue
  if (user.isChatAdmin) return 'text-yellow-500';
  if (mentorActive) return 'text-pink-500';     // pink for mentors (Elite pack)
  if (merchantActive) {
    // Pro pack = gold, Standard pack = purple
    if (user.merchantLevel === 'pro') return '#4ade80';
    return 'text-violet-500'; // Standard pack = purple
  }
  return 'text-sky-500';                        // blue for regular users
}

// Presence helpers --------------------------------------------------------

/**
 * Convert a presence value into a tailwind background color class suitable for
 * an indicator dot. This is intentionally simple but centralizes the mapping
 * so it can be updated consistently across the UI.
 */
export function presenceToColorClass(presence: string | undefined): string {
  switch (presence) {
    case 'online':
      return 'bg-success';
    case 'away':
      return 'bg-yellow-400';
    case 'busy':
      return 'bg-destructive';
    case 'offline':
    default:
      return 'bg-muted-foreground';
  }
}

/**
 * Human‑readable label for a presence state. Used for tooltips/aria labels.
 */
export function presenceLabel(presence: string | undefined): string {
  switch (presence) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    case 'offline':
    default:
      return 'Offline';
  }
}

/**
 * Convenience helper used by multiple components when rendering friend buttons.
 * It returns true if `current` has already sent a request to `other` *or* if
 * the other user has the current user's id in their incoming friendRequests
 * list. Having both checks simplifies callers and insulates them from cache
 * staleness problems.
 */
export function isFriendRequestPending(current: { uid: string; sentFriendRequests?: string[] } | null | undefined, other: { uid: string; friendRequests?: string[] } | null | undefined): boolean {
  if (!current || !other) return false;
  const out = current.sentFriendRequests || [];
  const incoming = other.friendRequests || [];
  return incoming.includes(current.uid) || out.includes(other.uid);
}
