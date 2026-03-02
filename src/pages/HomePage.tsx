import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/cards/StatsCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import { Badge } from '@/components/ui/badge';
import {
  Coins,
  Star,
  Heart,
  Gem,
  Trophy,
  Sparkles,
  Gift,
  Loader2,
  Users,
  ThumbsUpIcon,
  PawPrint
} from 'lucide-react';
import {
  STORE_ITEMS,
  collectDailyCredits,
  getActivePetIds,
  getActiveAssetIds,
  getActiveAssetQuantity,
  getPetExpiryTimestamp,
  getAssetExpiryDisplayEntries
} from '@/lib/firebaseOperations';
import { formatWithCommas } from '@/lib/utils';
import PetAnimation from '@/components/PetAnimation';
import { getAvatarItemById, getAvatarItemsByType, AVATAR_ITEMS } from '@/lib/avatarItems';
import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [collecting, setCollecting] = useState(false);
  const [selectedAssetForExpiry, setSelectedAssetForExpiry] = useState<string | null>(null);
  const [assetExpiryPage, setAssetExpiryPage] = useState(1);
  const ASSET_EXPIRY_PAGE_SIZE = 10;

  if (!userProfile) return null;
  const now = Date.now();
  const fallbackExpiry = now + (365 * 24 * 60 * 60 * 1000);
  const formatExpiry = (expiry: number | null | undefined) =>
    new Date((expiry && Number.isFinite(expiry)) ? expiry : fallbackExpiry).toLocaleDateString();

  const handleCollectDaily = async () => {
    setCollecting(true);
    try {
      const result = await collectDailyCredits(userProfile.uid);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to collect credits');
    } finally {
      setCollecting(false);
    }
  };

  const ownedPets = STORE_ITEMS.filter(i => i.type === 'pet' && getActivePetIds(userProfile, now).includes(i.id));
  const ownedAssets = STORE_ITEMS.filter(i => i.type === 'asset' && getActiveAssetIds(userProfile, now).includes(i.id));
  const dailyCreditsAvailable = ownedAssets.reduce((sum, a) => {
    const qty = getActiveAssetQuantity(userProfile, a.id, now);
    return sum + ((a.dailyCredits || 0) * qty);
  }, 0);
  // Get equipped avatar items
  const equippedBackground = userProfile.avatarItems?.background ? getAvatarItemById(userProfile.avatarItems.background) : null;
  const equippedFace = userProfile.avatarItems?.face ? getAvatarItemById(userProfile.avatarItems.face) : null;
  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <motion.div
            className="text-6xl mb-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
              <div className="relative inline-block mb-2">
                <CustomAvatar
                  avatar={userProfile.avatar}
                  imageUrl={userProfile.profileImageUrl}
                  avatarItems={userProfile.avatarItems}
                  size="xl"
                  className="w-24 h-24 text-5xl"
                />
              </div>
          </motion.div>
          <h1 className="font-display text-2xl font-bold">
            Welcome, <Username user={userProfile} />!
          </h1>
          <p className="text-muted-foreground">
            Level {userProfile.level} • {userProfile.xp} XP
          </p>
        </motion.div>

        {/* Quick Actions: Daily Spin & Collect Profits */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/daily-spin')}>
            <Gift className="w-4 h-4 mr-2" />
            Daily Spin
          </Button>

          <Button
            variant="gold"
            className="flex-1"
            onClick={handleCollectDaily}
            disabled={collecting || dailyCreditsAvailable <= 0}
          >
            {collecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Trophy className="w-4 h-4 mr-2" />
                Collect Asset Profits
              </>
            )}
          </Button>
        </div>

        {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <StatsCard icon={Coins} label="Credits" value={formatWithCommas(userProfile.credits)} gradient="primary" delay={0.1} />
              <StatsCard icon={Star} label="Level" value={userProfile.level} gradient="primary" delay={0.15} />
              <StatsCard icon={Heart} label="Pets" value={ownedPets.length} gradient="primary" delay={0.2} />
              <StatsCard icon={Gem} label="Assets" value={ownedAssets.length} gradient="primary" delay={0.25} />
              <StatsCard icon={Users} label="Friends" value={userProfile.friends.length} gradient="primary" delay={0.3} />
              <StatsCard icon={Trophy} label="XP Total" value={userProfile.xp} gradient="primary" delay={0.35} />
              <StatsCard icon={Gift} label="Gifts Sent" value={userProfile.giftsSent || 0} gradient="primary" delay={0.4} />
              <StatsCard icon={Gift} label="Gifts Received" value={userProfile.giftsReceived || 0} gradient="primary" delay={0.45} />
              <StatsCard icon={ThumbsUpIcon} label="Likes" value={userProfile.profileLikes || 0} gradient="primary" delay={0.45} />
            </div>

        {/* Daily Collection */}
        {dailyCreditsAvailable > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl gradient-hero border border-primary/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Daily Asset Credits
                </h3>
                <p className="text-body text-muted-foreground">
                  {dailyCreditsAvailable} credits available
                </p>
              </div>
            </div>
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleCollectDaily}
              disabled={collecting}
            >
              {collecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Trophy className="w-5 h-5" />
                  Collect
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Owned Pets & Assets */}
        {(ownedPets.length > 0 || ownedAssets.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-4"
          >
                {ownedPets.length > 0 && (
                  <div className="p-4 rounded-xl gradient-card border border-primary/50">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-primary" />
                      Your Pets
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {ownedPets.map((pet) => (
                        <motion.div
                          key={pet.id}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-32 h-32 rounded-xl bg-primary/20 flex flex-col items-center justify-center border border-white/50"
                        >
                          <PetAnimation animationData={pet.animationData} size={80} className="rounded-md" />
                          <span className="text-xs mt-2">{pet.name}</span>
                          <span className="text-[11px] text-muted-foreground mt-1">
                            Expires: {formatExpiry(getPetExpiryTimestamp(userProfile, pet.id))}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {ownedAssets.length > 0 && (
                  <div className="p-4 rounded-xl gradient-card border border-primary/50">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Gem className="w-4 h-4 text-success" />
                      Your Assets
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {ownedAssets.map((asset) => {
                        const quantity = getActiveAssetQuantity(userProfile, asset.id, now);
                        const expiryEntries = getAssetExpiryDisplayEntries(userProfile, asset.id, now);
                        const singleExpiry = quantity === 1 ? expiryEntries[0]?.expiry ?? null : null;
                        return (
                          <motion.div
                            key={asset.id}
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            className={`relative w-28 h-28 rounded-xl bg-primary/20 flex flex-col items-center justify-center border border-white/10 ${quantity > 1 ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (quantity > 1) {
                                setSelectedAssetForExpiry(asset.id);
                                setAssetExpiryPage(1);
                              }
                            }}
                          >
                            {asset.animationData ? (
                              <PetAnimation animationData={asset.animationData} size={60} />
                            ) : (
                              <span className="text-5xl">{asset.emoji}</span>
                            )}
                            <span className="text-xs mt-1 text-muted-foreground">{asset.name}</span>
                            {quantity === 1 && (
                              <span className="text-[11px] text-muted-foreground mt-1">
                                Expires: {formatExpiry(singleExpiry)}
                              </span>
                            )}
                            {quantity > 1 && (
                              <Badge
                                variant="default"
                                className="absolute -top-2 -right-2 h-6 min-w-6 flex items-center justify-center bg-primary text-primary-foreground"
                              >
                                {quantity}
                              </Badge>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
          </motion.div>
        )}
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
                ? [...getAssetExpiryDisplayEntries(userProfile, selectedAssetForExpiry, now)]
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
      </div>
    </AppLayout>
  );
}

