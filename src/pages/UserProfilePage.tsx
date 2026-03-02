import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import PetAnimation from '@/components/PetAnimation';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  UserPlus,
  Loader2,
  Globe,
  Calendar,
  Store,
  Trophy,
  Gift,
  Users,
  Star,
  Gamepad,
  Crown,
  Sparkles,
  PawPrint,
  Coins,
  Gem,
  ThumbsUpIcon,
  BadgeIcon,
  Ticket
} from 'lucide-react';
import GiftListDialog from '@/components/GiftListDialog';
import {
  getUserById,
  likeProfile,
  hasLikedProfile,
  sendFriendRequest,
  getPrivateConversationId,
  STORE_ITEMS,
  feedPet,
  getActivePetIds,
  getActiveAssetIds,
  getActiveAssetQuantity,
  getPetExpiryTimestamp,
  getAssetExpiryDisplayEntries
} from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { getBadgeForLevel } from '@/lib/badges';
import { getCountryByCode } from '@/lib/countries';
import { getAvatarItemById } from '@/lib/avatarItems';
import { formatShortNumber, formatWithCommas, isFriendRequestPending } from '@/lib/utils';
import { toast } from 'sonner';
import { StatsCard } from '@/components/cards/StatsCard';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [feedingPet, setFeedingPet] = useState<string | null>(null);
  const [fedPets, setFedPets] = useState<Set<string>>(new Set());

  const [showReceived, setShowReceived] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const [selectedAssetForExpiry, setSelectedAssetForExpiry] = useState<string | null>(null);
  const [assetExpiryPage, setAssetExpiryPage] = useState(1);
  const ASSET_EXPIRY_PAGE_SIZE = 10;

  // Load the profile when the route changes. We purposely avoid
  // depending on `userProfile` here because updates to the logged-in
  // user's data (for example feeding a pet) were causing the entire
  // page to go into the loading state. That resulted in a blank screen
  // while the request completed. The only time we need to refetch is
  // when we navigate to a different user ID.
  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserById(userId);
      if (data) {
        setProfile(data);
      // Note: we no longer perform the "has liked" check here since
      // that logic is handled in a separate effect. This keeps profile
      // loading independent from authentication state updates.
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Sync liked state whenever the authenticated user or the profile we're
  // viewing changes. This is intentionally separate from the profile loading
  // effect so that we don't trigger a full page reload (and blank screen)
  // when the logged-in user's data updates (e.g. feeding a pet).
  useEffect(() => {
    const checkLike = async () => {
      if (!userProfile || !userId) {
        setHasLiked(false);
        return;
      }
      try {
        const liked = await hasLikedProfile(userProfile.uid, userId);
        setHasLiked(liked);
      } catch (e) {
        console.warn('Failed to check like status:', e);
        setHasLiked(false);
      }
    };
    checkLike();
  }, [userProfile, userId]);

  // Format member-since from Firestore Timestamp or number
  const formatMemberSince = (ts: any) => {
    if (!ts) return 'Unknown';
    try {
      let d: Date;
      if (ts.toDate && typeof ts.toDate === 'function') d = ts.toDate();
      else if (typeof ts === 'number') d = new Date(ts);
      else if (ts.seconds) d = new Date(ts.seconds * 1000);
      else d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Unknown';
    }
  };

  const handleLike = async () => {
    if (!userProfile || !userId || hasLiked) return;
    setLiking(true);
    try {
      const result = await likeProfile(userProfile.uid, userId);
      if (result.success) {
        setHasLiked(true);
        setProfile(prev => prev ? { ...prev, profileLikes: (prev.profileLikes || 0) + 1 } : null);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to like profile');
    } finally {
      setLiking(false);
    }
  };

  const handleMessage = () => {
    if (!userProfile || !userId) return;
    const conversationId = getPrivateConversationId(userProfile.uid, userId);
    navigate(`/messages/${conversationId}?friendId=${userId}`);
  };

  const handleAddFriend = async () => {
    if (!userProfile || !userId) return;
    try {
      const result = await sendFriendRequest(userProfile.uid, userId);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  const handleFeedPet = async (petId: string) => {
    if (!userProfile || !userId) return;
    setFeedingPet(petId);
    try {
      const result = await feedPet(userProfile.uid, userId, petId);
      if (result.success) {
        toast.success(result.message);
        // Mark this pet as fed to hide the button
        setFedPets(prev => new Set([...prev, petId]));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to feed pet');
    } finally {
      setFeedingPet(null);
    }
  };

  if (loading) {
    return (
      <NewAppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </NewAppLayout>
    );
  }

  if (!profile) {
    return (
      <NewAppLayout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </NewAppLayout>
    );
  }

  const badge = getBadgeForLevel(profile.level);
  const country = getCountryByCode(profile.country);
  const nowTs = Date.now();
  const fallbackExpiry = nowTs + (365 * 24 * 60 * 60 * 1000);
  const formatExpiry = (expiry: number | null | undefined) =>
    new Date((expiry && Number.isFinite(expiry)) ? expiry : fallbackExpiry).toLocaleDateString();
  const ownedPets = STORE_ITEMS.filter(i => i.type === 'pet' && getActivePetIds(profile, nowTs).includes(i.id));
  const ownedAssets = STORE_ITEMS.filter(i => i.type === 'asset' && getActiveAssetIds(profile, nowTs).includes(i.id));
  const equippedBackground = profile.avatarItems?.background ? getAvatarItemById(profile.avatarItems.background) : null;
  // determine if we are friends by checking either side's friend list
  const isFriend =
    (userProfile?.friends?.includes(userId || '')) ||
    (profile?.friends?.includes(userProfile?.uid || ''));

  // pending only if there is a request and we are not yet friends
  const isPendingRequest = !isFriend && isFriendRequestPending(userProfile, profile);
  const isSelf = userProfile?.uid === userId;

  // Get role status
  const now = Date.now();
  const isMerchant = profile.isMerchant && (!profile.merchantExpiry || profile.merchantExpiry > now);
  const isMentor = profile.isMentor && (!profile.mentorExpiry || profile.mentorExpiry > now);

  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">Profile</h1>
        </div>

        {/* Hero Card with Gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 border border-white/10"
        >

          <div className="relative p-6">
            {/* Avatar & Status Row */}
            <div className="flex items-start gap-4 mb-6">
              <div className="relative">
                <CustomAvatar
                  avatar={profile.avatar}
                  imageUrl={profile.profileImageUrl}
                  avatarItems={profile.avatarItems}
                  size="xl"
                  className="w-20 h-20 text-5xl"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isMentor && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white text-xs font-bold" title="Mentor">M</span>
                  )}
                  {isMerchant && !isMentor && (
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold ${
                      profile.merchantLevel === 'pro' ? 'bg-gold' : 'bg-violet-500'
                    }`} title="Merchant">M</span>
                  )}
                  <Username user={profile} className="text-xl font-bold" />
                  <span className={`text-lg ${badge.color}`}>{badge.emoji}</span>
                </div>

                {profile.statusMessage && (
                  <p className="text-body text-muted-foreground mt-1 italic">"{profile.statusMessage}"</p>
                )}

                <div className="flex items-center gap-3 mt-2 text-body text-muted-foreground">
                  {country && (
                    <span className="flex items-center gap-1">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                  )}
                </div>
                 <span className="flex items-center gap-1 mt-2 text-body text-muted-foreground"> Joined: {formatMemberSince(profile.createdAt)}
                  </span>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-4 h-4 text-gold" />
                </div>
                <p className="text-lg font-bold">{profile.level}</p>
                <p className="text-[10px] text-muted-foreground">Level</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-bold">{profile.friends?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Friends</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Gift className="w-4 h-4 text-success" />
                </div>
                <p className="text-lg font-bold">{formatShortNumber(profile.giftsSent || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Sent</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Heart className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-lg font-bold">{formatShortNumber(profile.profileLikes || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Likes</p>
              </div>
            </div>

            {/* Action Buttons */}
            {!isSelf && (
              <div className="flex gap-2">
                <Button
                  variant={hasLiked ? "secondary" : "destructive"}
                  size="sm"
                  onClick={handleLike}
                  disabled={hasLiked || liking}
                  className="flex-1"
                >
                  {liking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 mr-1" />}
                  {hasLiked ? 'Liked' : 'Like'}
                </Button>

                <Button variant="accent" size="sm" onClick={handleMessage} className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Message
                </Button>

                {!isFriend && !isPendingRequest && (
                  <Button variant="default" size="sm" onClick={handleAddFriend} className="flex-1">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
                {isPendingRequest && (
                  <Button variant="secondary" size="sm" disabled className="flex-1">
                    Pending
                  </Button>
                )}
                {isFriend && (
                  <Button variant="secondary" size="sm" disabled className="flex-1">
                    Friends
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 p-2 rounded-2xl bg-secondary/30 border border-white/5"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Statistics
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <StatsCard icon={Star} label="Level" value={profile.level} gradient="primary" delay={0.02} />
            <StatsCard icon={PawPrint} label="Pets" value={profile.pets.length} gradient="primary" delay={0.04} />
            <StatsCard icon={Gem} label="Assets" value={profile.assets.length} gradient="primary" delay={0.06} />
            <StatsCard icon={Users} label="Friends" value={profile.friends.length} gradient="primary" delay={0.08} />
            <StatsCard icon={Trophy} label="Total XP" value={profile.xp} gradient="primary" delay={0.1} />
            <StatsCard icon={Gift} label="Sent" value={profile.giftsSent || 0} gradient="primary" delay={0.12} />
            <StatsCard icon={Gift} label="Received" value={profile.giftsReceived || 0} gradient="primary" delay={0.14} />

            <StatsCard icon={ThumbsUpIcon} label="Likes" value={profile.profileLikes || 0} gradient="primary" delay={0.16} />
          </div>
        </motion.div>

        {/* Role Status */}
        {(isMerchant || isMentor) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-gold/10 to-pink-500/10 border border-gold/20"
          >
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              Premium Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {isMentor && (
                <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-500 text-sm font-medium">
                  👑 Mentor
                </span>
              )}
              {isMerchant && (
                <span className="px-3 py-1 rounded-full bg-gold/20 text-gold text-sm font-medium">
                  🏪 Merchant ({profile.merchantLevel || 'standard'})
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Pets Section */}
        {ownedPets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-primary" />
              <Username user={profile} /> Pets ({ownedPets.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ownedPets.map((pet) => {
                // Can feed if: not self, they are friends, AND visitor owns the same pet
                const visitorOwnsSamePet = userProfile?.pets?.includes(pet.id) || false;
                const canFeed = !isSelf && isFriend && visitorOwnsSamePet && !fedPets.has(pet.id);
                const isFeeding = feedingPet === pet.id;
                return (
                  <motion.div
                    key={pet.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl bg-secondary/30 border border-white/5 flex flex-col items-center gap-2"
                  >
                    <PetAnimation animationData={pet.animationData} size={60} />
                    <span className="font-medium text-sm">{pet.name}</span>
                    {isSelf && (
                      <span className="text-[11px] text-muted-foreground">
                        Expires: {formatExpiry(getPetExpiryTimestamp(profile, pet.id))}
                      </span>
                    )}
                    {canFeed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedPet(pet.id)}
                        disabled={isFeeding}
                        className="w-full mt-1 border-primary/30 hover:bg-primary/20"
                      >
                        {isFeeding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <><Heart className="w-3 h-3 mr-1" /> Feed</>
                        )}
                      </Button>
                    )}
                    {fedPets.has(pet.id) && (
                      <span className="text-[10px] text-success italic text-center">
                        ✓ Fed today
                      </span>
                    )}
                    {!isSelf && !isFriend && (
                      <span className="text-[10px] text-muted-foreground italic text-center">
                        Add friend to feed
                      </span>
                    )}
                    {!isSelf && isFriend && !visitorOwnsSamePet && (
                      <span className="text-[10px] text-muted-foreground italic text-center">
                        Own a {pet.name} to feed
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Assets Section */}
        {ownedAssets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <Username user={profile} /> Assets ({ownedAssets.length})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ownedAssets.map((asset) => {
                const quantity = getActiveAssetQuantity(profile, asset.id, nowTs);
                const expiryEntries = getAssetExpiryDisplayEntries(profile, asset.id, nowTs);
                const singleExpiry = quantity === 1 ? expiryEntries[0]?.expiry ?? null : null;
                return (
                  <motion.div
                    key={asset.id}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-3 rounded-xl bg-secondary/30 border border-white/5 flex flex-col items-center gap-1 ${isSelf && quantity > 1 ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (isSelf && quantity > 1) {
                        setSelectedAssetForExpiry(asset.id);
                        setAssetExpiryPage(1);
                      }
                    }}
                  >
                    <PetAnimation animationData={asset.animationData} size={60} />
                    <span className="font-medium text-xs text-center">{asset.name}</span>
                    {isSelf && quantity === 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        Expires: {formatExpiry(singleExpiry)}
                      </span>
                    )}
                    {quantity > 1 && (
                      <Badge
                        variant="default"
                        className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center bg-primary text-primary-foreground text-[10px]"
                      >
                        {quantity}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
        {isSelf && (
          <Dialog open={!!selectedAssetForExpiry} onOpenChange={(open) => { if (!open) { setSelectedAssetForExpiry(null); setAssetExpiryPage(1); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedAssetForExpiry
                    ? `${STORE_ITEMS.find((i) => i.id === selectedAssetForExpiry)?.name || 'Asset'} Expiry Dates`
                    : 'Asset Expiry Dates'}
                </DialogTitle>
              </DialogHeader>
              {(() => {
                const entries = selectedAssetForExpiry
                  ? [...getAssetExpiryDisplayEntries(profile, selectedAssetForExpiry, nowTs)]
                  : [];
                const sortedEntries = entries.sort((a, b) => {
                  if (a.active !== b.active) return a.active ? -1 : 1;
                  if (a.expiry == null && b.expiry == null) return 0;
                  if (a.expiry == null) return 1;
                  if (b.expiry == null) return -1;
                  return a.active ? a.expiry - b.expiry : b.expiry - a.expiry;
                });
                const totalPages = Math.max(1, Math.ceil(sortedEntries.length / ASSET_EXPIRY_PAGE_SIZE));
                const currentPage = Math.min(assetExpiryPage, totalPages);
                const start = (currentPage - 1) * ASSET_EXPIRY_PAGE_SIZE;
                const pageItems = sortedEntries.slice(start, start + ASSET_EXPIRY_PAGE_SIZE);
                return (
                  <>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {pageItems.map((entry, idx) => (
                  <div key={`${selectedAssetForExpiry}-${start + idx}`} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                    <span>#{start + idx + 1}</span>
                    <span className={entry.active ? 'text-foreground' : 'text-muted-foreground'}>
                      {formatExpiry(entry.expiry)}
                    </span>
                  </div>
                ))}
              </div>
              {sortedEntries.length > ASSET_EXPIRY_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between">
                  <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setAssetExpiryPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
                  <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setAssetExpiryPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </Button>
                </div>
              )}
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </NewAppLayout>
  );
}

