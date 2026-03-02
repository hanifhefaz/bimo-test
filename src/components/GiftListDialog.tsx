import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Username from '@/components/Username';
import { CustomAvatar } from '@/components/CustomAvatar';
import { getGiftsReceived, getGiftsSent, getUsersByIds } from '@/lib/firebaseOperations';
import { Transaction } from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { formatRelativeTime } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GiftListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  mode: 'received' | 'sent';
}

export default function GiftListDialog({ open, onOpenChange, userId, mode }: GiftListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [gifts, setGifts] = useState<Transaction[]>([]);
  const [counterparts, setCounterparts] = useState<Record<string, UserProfile | null>>({});
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (open) {
      // load first page
      loadInitial();
    } else {
      setGifts([]);
      setCounterparts({});
      setLastTimestamp(null);
      setHasMore(true);
    }
  }, [open, userId, mode]);

  useEffect(() => {
    const ids = Array.from(new Set(
      gifts
        .map((tx) => (mode === 'received' ? (tx.from === 'system' ? null : tx.from) : (tx.to === 'all' ? null : tx.to)))
        .filter((id): id is string => !!id)
    ));
    const missing = ids.filter((id) => counterparts[id] === undefined);
    if (missing.length === 0) return;

    let mounted = true;
    (async () => {
      try {
        const users = await getUsersByIds(missing);
        const map: Record<string, UserProfile | null> = {};
        missing.forEach((id) => { map[id] = null; });
        users.forEach((u) => { map[u.uid] = u; });
        if (mounted) setCounterparts((prev) => ({ ...prev, ...map }));
      } catch {
        if (mounted) {
          const map: Record<string, UserProfile | null> = {};
          missing.forEach((id) => { map[id] = null; });
          setCounterparts((prev) => ({ ...prev, ...map }));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [gifts, mode, counterparts]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const res = mode === 'received' ? await getGiftsReceived(userId, 20) : await getGiftsSent(userId, 20);
      setGifts(res.gifts);
      setLastTimestamp(res.lastTimestamp || null);
      setHasMore(!!res.lastTimestamp);
    } catch (e) {
      console.warn('Failed to load gifts', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastTimestamp) return;
    setLoading(true);
    try {
      const res = mode === 'received' ? await getGiftsReceived(userId, 20, lastTimestamp) : await getGiftsSent(userId, 20, lastTimestamp);
      setGifts(prev => [...prev, ...res.gifts]);
      setLastTimestamp(res.lastTimestamp || null);
      setHasMore(!!res.lastTimestamp);
    } catch (e) {
      console.warn('Failed to load more gifts', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'received' ? 'Gifts Received' : 'Gifts Sent'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-auto mt-2">
          {loading && gifts.length === 0 ? (
            <div className="p-6 text-center text-body text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading gifts...
            </div>
          ) : gifts.length === 0 ? (
            <div className="p-6 text-center text-body text-muted-foreground">No gifts found</div>
          ) : (
            gifts.map((tx) => (
              <GiftListItem
                key={tx.id}
                tx={tx}
                mode={mode}
                other={counterparts[mode === 'received' ? tx.from : tx.to] || null}
              />
            ))
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {hasMore ? (
            <Button variant="default" onClick={loadMore} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Load more'}
            </Button>
          ) : (
            <div className="text-body text-muted-foreground">No more gifts</div>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GiftListItem({ tx, mode, other }: { tx: Transaction; mode: 'received' | 'sent'; other: UserProfile | null }) {
  // Display gift emoji + name (remove price display)
  const giftLabel = tx.giftName ? `${tx.giftEmoji || ''} ${tx.giftName}` : `${tx.giftEmoji || ''} Gift`;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-colors">
      <div>
        <CustomAvatar avatar={other?.avatar || '🎁'} imageUrl={other?.profileImageUrl} avatarItems={other?.avatarItems} size="md" className="w-10 h-10" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">
            {mode === 'received' ? (
              other ? (<><Username user={other} /> sent you</>) : 'Someone sent you'
            ) : (
              tx.to === 'all' ? `Shower to ${tx.recipientsCount || 'many'}` : (other ? <Username user={other} /> : 'Someone')
            )}
          </div>
          <div className="text-caption text-muted-foreground">· {formatRelativeTime(tx.timestamp)}</div>
        </div>
        <div className="text-body text-muted-foreground">{giftLabel}{tx.description ? ` • ${tx.description}` : ''}</div>
      </div>
    </div>
  );
}
