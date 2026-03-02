import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Gift, Loader2, Gamepad, Ticket, Eye, ThumbsUpIcon } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTopUsersLast7Days } from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { getBadgeForLevel } from '@/lib/badges';
import { presenceToColorClass, presenceLabel } from '@/lib/utils';
import { getAvatarItemById, getAvatarItemsByType, AVATAR_ITEMS } from '@/lib/avatarItems';
import { useAuth } from '@/contexts/AuthContext';
import { CustomAvatar } from '@/components/CustomAvatar';
import { formatShortNumber } from '@/lib/utils';
import { useRealtimePresence, resolvePresence } from '@/hooks/useRealtimePresence';
import Username from '@/components/Username';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
export default function LeaderboardsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topByLevel, setTopByLevel] = useState<UserProfile[]>([]);
  const [topByGames, setTopByGames] = useState<UserProfile[]>([]);
  const [topBySent, setTopBySent] = useState<UserProfile[]>([]);
  const [topByLikes, setTopByLikes] = useState<UserProfile[]>([]);
  const [topByReceived, setTopByReceived] = useState<UserProfile[]>([]);
  const [topByRedeems, setTopByRedeems] = useState<UserProfile[]>([]);
  const [showAllLevels, setShowAllLevels] = useState(true);
  const { userProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const presenceMap = useRealtimePresence([
    ...topByLevel,
    ...topByGames,
    ...topBySent,
    ...topByLikes,
    ...topByReceived,
    ...topByRedeems,
  ]);
  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');

      const [levelSnap, sentSnap, likesSnap, receivedSnap] = await Promise.all([
        getDocs(query(usersRef, orderBy('level', 'desc'), limit(5))),
        getDocs(query(usersRef, orderBy('giftsSent', 'desc'), limit(5))),
        getDocs(query(usersRef, orderBy('profileLikes', 'desc'), limit(5))),
        getDocs(query(usersRef, orderBy('giftsReceived', 'desc'), limit(5)))
      ]);

      setTopByLevel(levelSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setTopBySent(sentSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setTopByLikes(likesSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setTopByReceived(receivedSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));

      try {
        // attempt sliding-window queries; may fail if security rules prohibit
        const [gamesUsers, redeemsUsers] = await Promise.all([
          getTopUsersLast7Days('game', 5),
          getTopUsersLast7Days('redeem', 5)
        ]);
        setTopByGames(gamesUsers);
        setTopByRedeems(redeemsUsers);
      } catch (innerErr) {
        console.warn('Sliding-window leaderboards not available, falling back to stored counters:', innerErr);
        toast({
          title: 'Unable to load recent leaderboard',
          description: 'Permissions prevent querying event history; using weekly counters instead.',
          variant: 'destructive'
        });
        // if we hit a permissions error or missing collections, fallback to the
        // original field-based leaderboard so that the page still renders.
        const [gamesSnap, redeemsSnap] = await Promise.all([
          getDocs(query(usersRef, orderBy('gamesPlayedWeekly', 'desc'), limit(5))),
          getDocs(query(usersRef, orderBy('redeemsThisWeek', 'desc'), limit(5)))
        ]);
        setTopByGames(gamesSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setTopByRedeems(redeemsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      }
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };
const renderLeaderboard = (users: UserProfile[], valueKey: 'level' | 'gamesPlayedWeekly' | 'giftsSent' | 'redeemsThisWeek' | 'profileLikes' | 'giftsReceived', icon: React.ReactNode, navigate: any, noScroll = false) => {
    if (!users || users.length === 0) {
      return <div className="p-3 text-body text-muted-foreground">No users found</div>;
    }

    const listContent = (
      <div className="space-y-2.5">
        {users.map((user, index) => {
        const badge = getBadgeForLevel(user.level);
        const value = (user as any)[valueKey] || 0;
        const rankEmoji = index === 0 ? '1️⃣' : index === 1 ? '2️⃣' : index === 2 ? '3️⃣' : index === 3 ? '4️⃣' : index === 4 ? '5️⃣' : String(index + 1);

        const presence = presenceMap[user.uid] || resolvePresence(user.presence, user.isOnline);
        return (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/70 border border-border hover:border-primary/30 transition-colors"
          >
            <span className={`w-8 text-center font-bold text-xl`}>
              {rankEmoji}
            </span>


            <div className="relative inline-block">
              <div className="relative">
                <CustomAvatar
                  avatar={user.avatar}
                  imageUrl={user.profileImageUrl}
                  avatarItems={user.avatarItems}
                  size="md"
                />

                {/* Presence indicator */}
                <span
                  role="status"
                  title={presenceLabel(presence)}
                  className={`absolute bottom-0 right-0 z-20 pointer-events-none w-4 h-4 rounded-full border-2 border-background ${presenceToColorClass(presence)}`}
                />
              </div>
            </div>


            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Username user={user} className="font-medium" />
                <span className={`text-xs ${badge.color}`}>{badge.emoji}</span>
              </div>
              <p className="text-caption text-muted-foreground mt-0.5">{valueKey === 'level' ? `Level ${user.level}`
                  : valueKey === 'gamesPlayedWeekly' ? `${value} games this month`
                  : valueKey === 'redeemsThisWeek' ? `${value} redeems this month`
                  : valueKey === 'profileLikes' ? `${value} likes`
                  : valueKey === 'giftsReceived' ? `${value} gifts received`
                  : `${value} gifts sent`}</p>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(`/user/${user.uid}`)}
              title="View Profile"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </motion.div>
        );
      })}
      </div>
    );

    return noScroll ? listContent : (
      <ScrollArea className="max-h-[460px]">
        {listContent}
      </ScrollArea>
    );
  };

  return (
    <NewAppLayout>
      <div className="p-4 md:p-5 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 heading-tight">
            <Trophy className="w-6 h-6 text-gold" />
            Leaderboards
          </h1>
          <p className="text-muted-foreground text-body">Top 5 users per category, refreshed from live app stats.</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 md:p-4 rounded-2xl border border-border bg-card/40">
              <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 mr-1" />
                <h2 className="text-lg font-semibold heading-tight">Top Levels</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowAllLevels(v => !v)}>
                {showAllLevels ? 'Collapse' : 'Show all'}
              </Button>
            </div>
            {renderLeaderboard(topByLevel, 'level', <Star className="w-4 h-4 text-gold" />, navigate, showAllLevels)}
            </div>

            <div className="p-3 md:p-4 rounded-2xl border border-border bg-card/40">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad className="w-4 h-4 mr-1" />
                <h2 className="text-lg font-semibold heading-tight">Top Games (last 30 days)</h2>
              </div>
              {renderLeaderboard(topByGames, 'gamesPlayedWeekly', <Gamepad className="w-4 h-4 text-accent" />, navigate)}
            </div>

            <div className="p-3 md:p-4 rounded-2xl border border-border bg-card/40">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 mr-1" />
                <h2 className="text-lg font-semibold heading-tight">Top Gift Senders</h2>
              </div>
              {renderLeaderboard(topBySent, 'giftsSent', <Gift className="w-4 h-4 text-success" />, navigate)}
            </div>

            {/* new likes leaderboard */}
            <div className="p-3 md:p-4 rounded-2xl border border-border bg-card/40">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUpIcon className="w-4 h-4 mr-1" />
                <h2 className="text-lg font-semibold heading-tight">Top Profile Likes</h2>
              </div>
              {renderLeaderboard(topByLikes, 'profileLikes', <ThumbsUpIcon className="w-4 h-4 text-pink-500" />, navigate)}
            </div>

            {/* new gift receivers leaderboard */}
            <div className="p-3 md:p-4 rounded-2xl border border-border bg-card/40">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 mr-1" />
                <h2 className="text-lg font-semibold heading-tight">Top Gift Receivers</h2>
              </div>
              {renderLeaderboard(topByReceived, 'giftsReceived', <Gift className="w-4 h-4 text-purple-500" />, navigate)}
            </div>

            <div className="p-3 md:p-4 rounded-2xl border border-border bg-card/40">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="w-4 h-4 mr-1" />
                <h2 className="text-lg font-semibold heading-tight">Top Redeemers (last 30 days)</h2>
              </div>
              {renderLeaderboard(topByRedeems, 'redeemsThisWeek', <Ticket className="w-4 h-4 text-accent" />, navigate)}
            </div>
          </div>
        )}
      </div>
    </NewAppLayout>
  );
}

