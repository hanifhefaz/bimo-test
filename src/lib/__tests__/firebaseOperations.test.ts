import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ops from '../firebaseOperations';
import { UserAlert } from '../firebaseOperations';

describe('firebaseOperations.getAlertCounts', () => {
  const sampleAlerts: UserAlert[] = [
    { userId: 'u1', type: 'like', message: 'm', read: false, createdAt: null },
    { userId: 'u1', type: 'contest_win', message: 'win', read: false, createdAt: null },
    { userId: 'u1', type: 'contest_win', message: 'win2', read: false, createdAt: null },
  ];

  beforeEach(() => {
    vi.spyOn(ops, 'getUnreadAlerts').mockResolvedValue(sampleAlerts);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should count each category and include contest wins', async () => {
    const counts = await ops.getAlertCounts('u1');
    expect(counts.likes).toBe(1);
    expect(counts.contestWins).toBe(2);
    expect(counts.total).toBe(3);
  });
});

// --- new tests for friend requests ---
describe('firebaseOperations.sendFriendRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not allow sending to yourself', async () => {
    const result = await ops.sendFriendRequest('a', 'a');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Cannot send a request to yourself/i);
  });
});
