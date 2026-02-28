import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/cards/StatsCard';
import { Button } from '@/components/ui/button';
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
import { STORE_ITEMS, collectDailyCredits } from '@/lib/firebaseOperations';
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

  if (!userProfile) return null;

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

  const ownedPets = STORE_ITEMS.filter(i => i.type === 'pet' && userProfile.pets.includes(i.id));
  const ownedAssets = STORE_ITEMS.filter(i => i.type === 'asset' && userProfile.assets.includes(i.id));
  const dailyCreditsAvailable = ownedAssets.reduce((sum, a) => sum + (a.dailyCredits || 0), 0);
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
                <p className="text-sm text-muted-foreground">
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
                        const quantity = userProfile.assetQuantities?.[asset.id] || 1;
                        return (
                          <motion.div
                            key={asset.id}
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            className="relative w-28 h-28 rounded-xl bg-primary/20 flex flex-col items-center justify-center border border-white/10"
                          >
                            {asset.animationData ? (
                              <PetAnimation animationData={asset.animationData} size={60} />
                            ) : (
                              <span className="text-5xl">{asset.emoji}</span>
                            )}
                            <span className="text-xs mt-1 text-muted-foreground">{asset.name}</span>
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
      </div>
    </AppLayout>
  );
}
