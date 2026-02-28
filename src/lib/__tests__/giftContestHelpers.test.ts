import { describe, it, expect } from 'vitest';
import { getContestLeaderboard, getContestRemainingTime } from '../giftContest';

describe('giftContest helpers', () => {
  it('leaderboard sorts correctly and limits to 10', () => {
    const contest: any = {
      id: 'c',
      roomId: 'r',
      roomName: 'room',
      startTime: 0,
      endTime: Date.now() + 10000,
      isActive: true,
      prizeCredits: 0,
      giftStats: {}
    };
    // generate 12 users with decreasing gifts
    for (let i = 0; i < 12; i++) {
      contest.giftStats[`u${i}`] = { username: `user${i}`, totalGifts: 12 - i, totalValue: (12 - i) * 10 };
    }

    const board = getContestLeaderboard(contest);
    expect(board.length).toBe(10);
    expect(board[0].totalGifts).toBe(12);
    expect(board[9].totalGifts).toBe(3);
  });

  it('remaining time returns non-negative values', () => {
    const now = Date.now();
    const contest: any = {
      id: 'c',
      roomId: 'r',
      roomName: 'room',
      startTime: now - 1000,
      endTime: now + 65000,
      isActive: true,
      prizeCredits: 0,
      giftStats: {}
    };
    const rem = getContestRemainingTime(contest);
    expect(rem.minutes).toBeGreaterThanOrEqual(1);
    expect(rem.seconds).toBeGreaterThanOrEqual(0);
  });
});
