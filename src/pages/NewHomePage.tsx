import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { useToast } from '@/hooks/use-toast';
import { presenceToColorClass, presenceLabel } from '@/lib/utils';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Bell,
  Heart,
  PawPrint,
  RefreshCw,
  Coins,
  ChevronRight,
  X,
  BadgeAlert,
  BellRingIcon,
  Ticket,
  Check,
  Trophy,
  Send,
  Mail,
  MessageCircle,
  MessageSquare
} from 'lucide-react';

import {
  getUnreadAlerts,
  getAllAlerts,
  markAlertsAsRead,
  UserAlert,
  STORE_ITEMS,
  getActiveAssetIds,
  getActiveAssetQuantity,
  collectDailyCredits,
  convertGiftsToCredits,
  calculateGiftConversion,
  createEmailInvite,
  getDailyMissionProgress,
  DailyMissionState
} from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { cn, formatWithCommas, isEmail } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { DailySpinSection } from '@/pages/DailySpinPage';

const MISSION_ORDER: Array<{
  id: keyof DailyMissionState['missions'];
  title: string;
}> = [
  { id: 'playMiniGames', title: 'Play any mini-game 2 times' },
  { id: 'winMiniGames', title: 'Win 5 mini games' },
  { id: 'sendGiftToFriend', title: 'Send 1 gift to a friend' },
  { id: 'feedFriendPet', title: "Feed a friend's pet 1 time" },
  { id: 'visitRooms', title: 'Visit 2 rooms' },
  { id: 'addNewFriend', title: 'Add a new friend' },
  { id: 'likeUserProfile', title: "Like any user's profile" }
];



export default function HomePage() {
  const { userProfile, refreshProfile, updatePresence } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [alertCounts, setAlertCounts] = useState({ likes: 0, petFeeds: 0, refunds: 0, dailyCredits: 0, contestWins: 0, total: 0 });
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [allAlerts, setAllAlerts] = useState<UserAlert[]>([]);
  const [convertingGifts, setConvertingGifts] = useState(false);
  const [collectingAssets, setCollectingAssets] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [generatedInviteText, setGeneratedInviteText] = useState('');
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [dailyMissions, setDailyMissions] = useState<DailyMissionState | null>(null);
  const [presence, setPresence] = useState<'online'|'away'|'busy'|'offline'>(
    userProfile ? (userProfile.presence || (userProfile.isOnline ? 'online' : 'offline')) : 'online'
  );

  // keep local presence in sync with profile updates
  useEffect(() => {
    if (userProfile) {
      setPresence(userProfile.presence || (userProfile.isOnline ? 'online' : 'offline'));
    }
  }, [userProfile]);

  const loadAlerts = useCallback(async () => {
    if (!userProfile) return;
    try {
      const unread = await getUnreadAlerts(userProfile.uid);
      setAlerts(unread);
      const likes = unread.filter(a => a.type === 'like').length;
      const petFeeds = unread.filter(a => a.type === 'pet_feed').length;
      const refunds = unread.filter(a => a.type === 'refund').length;
      const dailyCredits = unread.filter(a => a.type === 'daily_credits').length;
      const contestWins = unread.filter(a => a.type === 'contest_win').length;
      setAlertCounts({ likes, petFeeds, refunds, dailyCredits, contestWins, total: unread.length });
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }, [userProfile]);

  const loadDailyMissions = useCallback(async () => {
    if (!userProfile) return;
    setMissionsLoading(true);
    try {
      const res = await getDailyMissionProgress(userProfile.uid);
      setDailyMissions(res);
    } catch (e) {
      console.error('Failed to load daily missions:', e);
    } finally {
      setMissionsLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    loadDailyMissions();
  }, [loadDailyMissions]);

  const handleOpenAlerts = async () => {
    if (!userProfile) return;
    setAlertsOpen(true);
    try {
      const all = await getAllAlerts(userProfile.uid, 50);
      setAllAlerts(all);
      // Mark all as read
      const unreadIds = all.filter(a => !a.read).map(a => a.id!).filter(Boolean);
      if (unreadIds.length > 0) {
        await markAlertsAsRead(unreadIds);
        setAlertCounts({ likes: 0, petFeeds: 0, refunds: 0, dailyCredits: 0, contestWins: 0, total: 0 });
      }
    } catch (error) {
      console.error('Failed to load all alerts:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-destructive" />;
      case 'pet_feed': return <PawPrint className="w-4 h-4 text-primary" />;
      case 'refund': return <RefreshCw className="w-4 h-4 text-success" />;
      case 'daily_credits': return <Coins className="w-4 h-4 text-gold" />;
      case 'contest_win': return <Trophy className="w-4 h-4 text-gold" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAlertAction = (type: string) => {
    switch (type) {
      case 'like': return null;
      case 'pet_feed': return null;
      case 'refund': return null;
      case 'daily_credits': return { label: 'Collect', action: () => navigate('/profile') };
      case 'contest_win': return { label: 'View', action: () => navigate('/contests') };
      default: return null;
    }
  };

  const nowTs = Date.now();
  const ownedPets = userProfile ? STORE_ITEMS.filter(i => i.type === 'pet' && userProfile.pets.includes(i.id)) : [];
  const ownedAssets = userProfile ? STORE_ITEMS.filter(i => i.type === 'asset' && getActiveAssetIds(userProfile, nowTs).includes(i.id)) : [];

  const handleCollectDaily = async () => {
    if (!userProfile) return;
    if (collectingAssets) return;
    const dailyCreditsAvailable = ownedAssets.reduce((sum, a) => {
      const qty = getActiveAssetQuantity(userProfile, a.id, nowTs);
      return sum + ((a.dailyCredits || 0) * qty);
    }, 0);
    if (dailyCreditsAvailable <= 0) {
      toast({ title: 'No daily credits available', variant: 'destructive' });
      return;
    }
    setCollectingAssets(true);
    try {
      const result = await collectDailyCredits(userProfile.uid);
      if (result.success) {
        toast({ title: result.message });
        refreshProfile();
      } else {
        toast({ title: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Failed to collect credits', variant: 'destructive' });
    } finally {
      setCollectingAssets(false);
    }
  };

  const handleConvertGifts = async () => {
    if (!userProfile) return;
    if (convertingGifts) return;
    setConvertingGifts(true);
    try {
      const res = await convertGiftsToCredits(userProfile.uid);
      if (res.success) {
        toast({ title: res.message || 'Converted gifts to credits' });
      } else {
        toast({ title: res.message || 'Nothing to convert', variant: 'destructive' });
      }
      refreshProfile();
    } catch (e) {
      toast({ title: 'Conversion failed', variant: 'destructive' });
    } finally {
      setConvertingGifts(false);
    }
  };

  const handleSendInvite = async () => {
    if (!userProfile) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    if (!isEmail(email)) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setSendingInvite(true);
    try {
      const res = await createEmailInvite(
        userProfile.uid,
        userProfile.email,
        userProfile.username,
        email
      );

      if (!res.success) {
        toast({ title: res.message, variant: 'destructive' });
        return;
      }

      const appUrl = window.location.origin;
      const refLink = `${appUrl}/?ref=${encodeURIComponent(userProfile.username)}`;
      const inviteText = `You’re invited to Bimo33 by @${userProfile.username}! Chat in live rooms, make new friends, collect pets/assets, spin daily rewards, and join contests. Sign up with this email (${email}) here: ${refLink}`;
      setGeneratedInviteLink(refLink);
      setGeneratedInviteText(inviteText);
      toast({ title: 'Invite saved. You can copy the invite text below.' });
    } catch (error) {
      console.error('Invite failed:', error);
      toast({ title: 'Failed to send invite', variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleShareInvite = (channel: 'email' | 'whatsapp' | 'sms') => {
    if (!generatedInviteText) return;

    const encodedText = encodeURIComponent(generatedInviteText);
    if (channel === 'email') {
      const subject = encodeURIComponent('Join me on Bimo33');
      window.open(`mailto:?subject=${subject}&body=${encodedText}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank', 'noopener,noreferrer');
      return;
    }

    window.open(`sms:?&body=${encodedText}`, '_self');
  };




  const isProfileLoading = !userProfile;
  const missionCompletionCount = dailyMissions
    ? Object.values(dailyMissions.missions).filter((m) => m.completed).length
    : 0;
  const missionsTotal = dailyMissions ? Object.keys(dailyMissions.missions).length : MISSION_ORDER.length;
  const missionProgressPercent = Math.round((missionCompletionCount / missionsTotal) * 100);
  const resetInMs = dailyMissions ? Math.max(0, dailyMissions.resetAt - Date.now()) : 0;
  const resetHours = Math.floor(resetInMs / (1000 * 60 * 60));
  const resetMinutes = Math.floor((resetInMs % (1000 * 60 * 60)) / (1000 * 60));






  return (
    <NewAppLayout>
      <div className="p-4 md:p-5 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto space-y-5">
        {/* Profile Card moved from topbar */}
        {isProfileLoading ? (
          <div className="p-3 rounded-xl gradient-gold flex items-center gap-3 animate-pulse">
            <div className="rounded-full p-[2px] bg-white/70 w-10 h-10" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-muted-foreground/20 rounded w-32 mb-2" />
              <div className="h-3 bg-muted-foreground/10 rounded w-48" />
            </div>
            <div className="ml-auto h-7 w-12 bg-primary/60 rounded-full" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl gradient-gold flex items-center gap-3 border border-white/20 shadow-sm"
          >
          <Link to="/profile" className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative rounded-full p-[2px] bg-white/70">
              <CustomAvatar
                avatar={userProfile!.avatar}
                imageUrl={userProfile!.profileImageUrl}
                avatarItems={userProfile!.avatarItems}
                size="md"
                className="w-10 h-10 rounded-full"
              />
              <span
                role="status"
                title={presenceLabel(presence)}
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${presenceToColorClass(presence)}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-2 truncate whitespace-nowrap font-medium text-sm"
              >
                {userProfile.isMentor && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold shrink-0">
                    M
                  </span>
                )}

                {userProfile.isMerchant && !userProfile.isMentor && (
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-bold shrink-0 ${
                      userProfile.merchantLevel === 'pro' ? 'bg-gold' : 'bg-violet-500'
                    }`}
                  >
                    M
                  </span>
                )}

                <Username user={userProfile} className="truncate" />
              </span>

              </div>
              <div className="w-full overflow-hidden">
                <div className="relative w-full">
                  <span className="text-sm text-white/80 marquee-text">
                    {userProfile!.statusMessage || 'No status set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Level badge */}
            <span className="ml-auto px-3 py-1 rounded-full bg-primary/80 text-white font-semibold">
              {userProfile!.level}
            </span>
          </Link>

          {/* presence dropdown */}
          <div className="ml-2">
            <select
              className="bg-secondary/25 text-xs px-2.5 py-1.5 rounded-md min-h-[36px] border border-white/10"
              value={presence}
              onChange={async (e) => {
                const val = e.target.value as 'online'|'away'|'busy'|'offline';
                setPresence(val);
                try {
                  await updatePresence(val);
                  toast({ title: `Presence set to ${val}` });
                } catch (err) {
                  console.error('Failed to update presence', err);
                  toast({ title: 'Could not update presence', variant: 'destructive' });
                }
              }}
            >
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          </motion.div>
        )}
        {isProfileLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Bimo Alerts Section */}
            <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
              <SheetTrigger asChild>
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleOpenAlerts}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-success/25 to-primary/15 border border-primary/25 flex items-center justify-between mb-4 hover:from-primary/25 hover:to-accent/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <BellRingIcon className="w-5 h-5 text-primary" />
                      {alertCounts.total > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                          {alertCounts.total > 9 ? '9+' : alertCounts.total}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-sm heading-tight">Bimo Alerts</h3>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        {alertCounts.likes > 0 && <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {alertCounts.likes}</span>}
                        {alertCounts.petFeeds > 0 && <span className="flex items-center gap-1"><PawPrint className="w-3 h-3" /> {alertCounts.petFeeds}</span>}
                        {alertCounts.refunds > 0 && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {alertCounts.refunds}</span>}
                        {alertCounts.dailyCredits > 0 && <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {alertCounts.dailyCredits}</span>}
                        {alertCounts.contestWins > 0 && <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {alertCounts.contestWins}</span>}
                        {alertCounts.total === 0 && <span>No new alerts</span>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Bimo Alerts
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2 overflow-y-auto max-h-[55vh]">
                  {allAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No alerts yet</p>
                      <p className="text-xs mt-1">You'll receive alerts when someone likes your profile, feeds your pet, or when credits are refunded.</p>
                    </div>
                  ) : (
                    allAlerts.map((alert) => {
                      const action = getAlertAction(alert.type);
                      return (
                        <div
                          key={alert.id}
                          className={cn(
                            "p-3 rounded-lg border flex items-start gap-3",
                            alert.read ? "bg-secondary/20 border-white/5" : "bg-primary/10 border-primary/30"
                          )}
                        >
                          {getAlertIcon(alert.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{alert.message}</p>
                            <p className="text-caption text-muted-foreground mt-1">
                              {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </p>
                          </div>
                          {action && (
                            <Button size="sm" variant="accent" onClick={action.action}>
                              {action.label}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Gift Conversion & Asset Collection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">

            {/* Gift Conversion Card */}
            <div className="h-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-success" />
                </div>
                <div>
                    <p className="font-medium">Gift Conversion</p>
                    <p className="text-sm text-success">
                    {userProfile && formatWithCommas(
                        calculateGiftConversion(userProfile.unconvertedGifts || 0)
                    )} credits
                    </p>
                    <p className="text-caption text-muted-foreground">
                    From {userProfile && formatWithCommas(userProfile.unconvertedGifts || 0)} gift value
                    </p>
                </div>
                </div>

                <Button
                variant="accent"
                size="sm"
                onClick={handleConvertGifts}
                disabled={
                    !userProfile ||
                    convertingGifts ||
                    calculateGiftConversion(userProfile.unconvertedGifts || 0) === 0
                }
                >
                {convertingGifts ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    'Convert'
                )}
                </Button>
            </div>

            {/* Asset Profits Card */}
            {userProfile && (() => {
                const dailyCreditsAvailable = ownedAssets.reduce((sum, a) => {
                const qty = getActiveAssetQuantity(userProfile, a.id, nowTs);
                return sum + ((a.dailyCredits || 0) * qty);
                }, 0);

                let alreadyCollected = false;
                if (userProfile.lastDailyCollection) {
                const lastCollection = userProfile.lastDailyCollection.toDate
                    ? userProfile.lastDailyCollection.toDate()
                    : new Date(userProfile.lastDailyCollection);
                const hoursSince = (Date.now() - lastCollection.getTime()) / (1000 * 60 * 60);
                alreadyCollected = hoursSince < 24;
                }

                if (dailyCreditsAvailable <= 0) return null;

                return (
                <div className="h-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <p className="font-medium">Daily Asset Profits</p>
                        {alreadyCollected ? (
                        <p className="text-sm text-success">✓ Already collected today</p>
                        ) : (
                        <p className="text-sm text-gold">
                            {formatWithCommas(dailyCreditsAvailable)} credits
                        </p>
                        )}
                    </div>
                    </div>

                    <Button
                    variant="accent"
                    size="sm"
                    onClick={handleCollectDaily}
                    disabled={collectingAssets || alreadyCollected}
                    >
                    {collectingAssets ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : alreadyCollected ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        'Collect'
                    )}
                    </Button>
                </div>
                );
            })()}

            </div>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/5 p-4 mb-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="min-w-0">
                <p className="font-semibold text-sm">Daily Missions</p>
                <p className="text-caption text-muted-foreground">
                  {missionCompletionCount}/{missionsTotal} completed • {missionProgressPercent}% progress
                </p>
                <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${missionProgressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Resets in {resetHours}h {resetMinutes}m
                </p>
              </div>
              <Button
                variant="accent"
                onClick={async () => {
                  setMissionsOpen(true);
                  await loadDailyMissions();
                }}
              >
                <BadgeAlert className="w-4 h-4" />
                Track
              </Button>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/5 p-4 mb-4 flex items-center justify-between gap-3 shadow-sm">
              <div>
                <p className="font-semibold text-sm">Invite to Bimo33</p>
                <p className="text-caption text-muted-foreground">
                  Invite by email and earn 5.00 credits for each successful registration.
                </p>
              </div>
              <Button
                variant="accent"
                onClick={() => {
                  setInviteEmail('');
                  setGeneratedInviteLink('');
                  setGeneratedInviteText('');
                  setInviteModalOpen(true);
                }}
              >
                <Send className="w-4 h-4" />
                Invite
              </Button>
            </div>

            <Dialog
              open={inviteModalOpen}
              onOpenChange={(open) => {
                setInviteModalOpen(open);
                if (!open) {
                  setInviteEmail('');
                  setGeneratedInviteLink('');
                  setGeneratedInviteText('');
                }
              }}
            >
              <DialogContent className="glass border-white/10">
                <DialogHeader>
                  <DialogTitle>Invite Friend</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    type="email"
                    placeholder="friend@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={handleSendInvite}
                    disabled={sendingInvite || !inviteEmail.trim()}
                  >
                    {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Invite
                  </Button>

                  {generatedInviteLink && (
                    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <p className="text-caption text-muted-foreground break-all">
                        Link: {generatedInviteLink}
                      </p>
                      <p className="text-caption text-muted-foreground break-words">
                        {generatedInviteText}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(generatedInviteText);
                              toast({ title: 'Invite text copied.' });
                            } catch {
                              toast({ title: 'Failed to copy invite text', variant: 'destructive' });
                            }
                          }}
                        >
                          Copy Text
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => setInviteModalOpen(false)}
                        >
                          <X className="w-4 h-4" />
                          Close
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleShareInvite('email')}
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleShareInvite('whatsapp')}
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleShareInvite('sms')}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Text
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={missionsOpen}
              onOpenChange={setMissionsOpen}
            >
              <DialogContent className="glass border-white/10 max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Daily Missions</DialogTitle>
                </DialogHeader>
                {missionsLoading || !dailyMissions ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {MISSION_ORDER.map((missionMeta) => {
                      const mission = dailyMissions.missions[missionMeta.id];
                      const pct = Math.round((mission.progress / mission.target) * 100);
                      return (
                        <div key={missionMeta.id} className="rounded-lg border border-primary/20 p-3 bg-primary/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{missionMeta.title}</p>
                              <p className="text-caption text-muted-foreground">
                                {mission.progress}/{mission.target} • {mission.xp} XP
                              </p>
                            </div>
                            {mission.completed && (
                              <span className="text-xs px-2 py-1 rounded bg-success/20 text-success border border-success/30">
                                Completed
                              </span>
                            )}
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="rounded-lg border border-gold/30 bg-gold/10 p-3">
                      <p className="text-sm font-medium">All completed bonus</p>
                      <p className="text-caption text-muted-foreground">+100 XP once all missions are completed.</p>
                      <p className="text-caption mt-1">
                        Status: {dailyMissions.allCompletedRewarded ? 'Claimed' : (dailyMissions.allCompleted ? 'Ready to claim now' : 'In progress')}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-right">
                      Resets in {Math.floor(Math.max(0, dailyMissions.resetAt - Date.now()) / (1000 * 60 * 60))}h {Math.floor((Math.max(0, dailyMissions.resetAt - Date.now()) % (1000 * 60 * 60)) / (1000 * 60))}m
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Daily spin embedded on home page */}
            <section className="mb-6 rounded-2xl border border-border bg-card/40 p-2 sm:p-3">
              <DailySpinSection hideHeader showLabels={false} />
            </section>
          </>
        )}
      </div>
    </NewAppLayout>
  );
}
