// helpers around weekly leaderboard resets
import { Timestamp } from 'firebase/firestore';

/**
 * Determine whether a user's weekly counters should be cleared.
 *
 * Accepts a Firestore `Timestamp` (serverTimestamp), a raw number (ms since epoch),
 * or any object with a `toMillis()` method.
 */
export function needsWeeklyReset(lastReset: any | null, nowMs: number = Date.now()): boolean {
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  if (!lastReset) return true;
  let lastMs: number;

  if (typeof lastReset === 'number') {
    lastMs = lastReset;
  } else if (lastReset instanceof Timestamp) {
    lastMs = lastReset.toMillis();
  } else if (typeof lastReset.toMillis === 'function') {
    lastMs = lastReset.toMillis();
  } else {
    // unknown shape, treat as needing reset
    return true;
  }

  return lastMs < nowMs - ONE_WEEK;
}
