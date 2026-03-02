import { onValue, ref } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { useEffect, useMemo, useState } from 'react';

export type PresenceState = 'online' | 'away' | 'busy' | 'offline';

type PresenceLikeUser = {
  uid: string;
  presence?: string;
  isOnline?: boolean;
};

type StatusPayload = { presence?: string; isOnline?: boolean } | null;

type ListenerEntry = {
  count: number;
  unsubscribe: () => void;
};

const statusCache = new Map<string, PresenceState>();
const statusListeners = new Map<string, ListenerEntry>();
const subscribers = new Set<(uid: string, state: PresenceState) => void>();

export function resolvePresence(presence?: string, isOnline?: boolean): PresenceState {
  if (presence === 'online' || presence === 'away' || presence === 'busy' || presence === 'offline') {
    return presence;
  }
  return isOnline ? 'online' : 'offline';
}

function notify(uid: string, state: PresenceState) {
  subscribers.forEach((cb) => {
    try {
      cb(uid, state);
    } catch {
      // ignore individual subscriber failures
    }
  });
}

function attachUid(uid: string) {
  const existing = statusListeners.get(uid);
  if (existing) {
    existing.count += 1;
    statusListeners.set(uid, existing);
    return;
  }

  const statusRef = ref(rtdb, `status/${uid}`);
  const unsubscribe = onValue(statusRef, (snapshot) => {
    const data = snapshot.val() as StatusPayload;
    const state = resolvePresence(data?.presence, data?.isOnline);
    statusCache.set(uid, state);
    notify(uid, state);
  });

  statusListeners.set(uid, { count: 1, unsubscribe });
}

function detachUid(uid: string) {
  const entry = statusListeners.get(uid);
  if (!entry) return;
  if (entry.count > 1) {
    entry.count -= 1;
    statusListeners.set(uid, entry);
    return;
  }
  entry.unsubscribe();
  statusListeners.delete(uid);
}

export function useRealtimePresence(users: PresenceLikeUser[]): Record<string, PresenceState> {
  const { userIds, fallbackMap, depKey } = useMemo(() => {
    const uniq = new Map<string, PresenceState>();
    for (const user of users) {
      if (!user?.uid) continue;
      uniq.set(user.uid, resolvePresence(user.presence, user.isOnline));
    }
    const ids = Array.from(uniq.keys());
    return {
      userIds: ids,
      fallbackMap: Object.fromEntries(ids.map((uid) => [uid, uniq.get(uid) || 'offline'])) as Record<string, PresenceState>,
      depKey: ids.join('|'),
    };
  }, [users]);

  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceState>>(fallbackMap);

  useEffect(() => {
    setPresenceMap((prev) => {
      const next = { ...fallbackMap, ...prev };
      userIds.forEach((uid) => {
        const cached = statusCache.get(uid);
        if (cached) next[uid] = cached;
      });
      return next;
    });

    userIds.forEach(attachUid);

    const subscriber = (uid: string, state: PresenceState) => {
      if (!userIds.includes(uid)) return;
      setPresenceMap((prev) => ({ ...prev, [uid]: state }));
    };
    subscribers.add(subscriber);

    return () => {
      subscribers.delete(subscriber);
      userIds.forEach(detachUid);
    };
  }, [depKey]);

  return presenceMap;
}

