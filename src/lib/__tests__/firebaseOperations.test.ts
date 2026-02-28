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
  let spyGetDoc: any;
  let spyWriteBatch: any;
  let fakeBatch: any;

  beforeEach(() => {
    // stub out firestore helpers
    spyGetDoc = vi.spyOn(ops, 'getDoc');
    spyWriteBatch = vi.spyOn(ops, 'writeBatch');
    fakeBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(null),
    };
    spyWriteBatch.mockReturnValue(fakeBatch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not allow sending to yourself', async () => {
    const result = await ops.sendFriendRequest('a', 'a');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Cannot send a request to yourself/i);
  });

  it('should error when target user does not exist', async () => {
    spyGetDoc.mockResolvedValue({ exists: () => false });
    const result = await ops.sendFriendRequest('a', 'b');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/User not found/i);
  });

  it('should prevent duplicate requests or existing friends', async () => {
    spyGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ friends: ['a'], friendRequests: [] }),
    });

    let res = await ops.sendFriendRequest('a', 'b');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/already friends/i);

    spyGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ friends: [], friendRequests: ['a'] }),
    });

    res = await ops.sendFriendRequest('a', 'b');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/already sent/i);
  });

  it('should add entries to both documents on success', async () => {
    spyGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ friends: [], friendRequests: [] }),
    });

    const result = await ops.sendFriendRequest('a', 'b');
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/sent/i);

    expect(spyWriteBatch).toHaveBeenCalled();
    expect(fakeBatch.update).toHaveBeenCalledTimes(2);
    // second call should include sentFriendRequests union
    const calls = fakeBatch.update.mock.calls;
    expect(calls[1][1]).toHaveProperty('sentFriendRequests');
    expect(fakeBatch.commit).toHaveBeenCalled();
  });
});
