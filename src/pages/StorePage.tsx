import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { StoreItemCard } from '@/components/cards/StoreItemCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  STORE_ITEMS,
  COMPANION_ITEMS,
  CREDIT_PACKS,
  XP_BOOSTS,
  EMOTICON_PACKS,
  purchaseItem,
  purchaseAvatarItem,
  purchaseXPBoost,
  purchaseCreditPack,
  sellPackToUser,
  purchaseEmoticonPack,
  purchaseCompanion,
  hasActivePet,
  getActiveAssetQuantity,
  getPetExpiryTimestamp,
  getAssetExpiryDisplayEntries
} from '@/lib/firebaseOperations';
import {
  getAvatarItemsByType,
  AVATAR_ITEM_TYPES,
  AvatarItem,
  computeFrameCss,
  needsSvgBorder,
  makeBorderPoints
} from '@/lib/avatarItems';
import { toast } from 'sonner';
import { ShoppingBag, Heart, Gem, Store, Palette, Loader2, Coins, Zap, Smile, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VoucherGenerator from '@/components/admin/VoucherGenerator';
import { useState, useEffect } from 'react';
import { formatWithCommas } from '@/lib/utils';
import LogoImg from '@/assets/icon.png';
// payment method images (add these files to your assets folder)
import BinancePayImg from '@/assets/binance-pay.png';
import BinanceUsdtImg from '@/assets/binance-usdt.jpg';
import UsdtLogo from '@/assets/usdt.png';

export default function StorePage() {
  const { userProfile, refreshProfile } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [adminPack, setAdminPack] = useState<string>(CREDIT_PACKS[0]?.id || '');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminSelling, setAdminSelling] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [selectedAssetForExpiry, setSelectedAssetForExpiry] = useState<string | null>(null);
  const [assetExpiryPage, setAssetExpiryPage] = useState(1);
  const ASSET_EXPIRY_PAGE_SIZE = 10;

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!userProfile) return null;
  const now = Date.now();
  const fallbackExpiry = now + (365 * 24 * 60 * 60 * 1000);
  const formatExpiry = (expiry: number | null | undefined) =>
    new Date((expiry && Number.isFinite(expiry)) ? expiry : fallbackExpiry).toLocaleDateString();

  const pets = STORE_ITEMS.filter(i => i.type === 'pet');
  const assets = STORE_ITEMS.filter(i => i.type === 'asset');

  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId);
    try {
      const result = await purchaseItem(userProfile.uid, itemId);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseAvatarItem = async (itemId: string) => {
    setPurchasing(itemId);
    try {
      const result = await purchaseAvatarItem(userProfile.uid, itemId);
      if (result.success) {
        toast.success(result.message);
        // Delay profile refresh slightly to avoid UI flash
        setTimeout(() => refreshProfile(), 100);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseBoost = async (boostId: string) => {
    setPurchasing(boostId);
    try {
      const result = await purchaseXPBoost(userProfile.uid, boostId);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseEmoticonPack = async (packId: string) => {
    setPurchasing(packId);
    try {
      const result = await purchaseEmoticonPack(userProfile.uid, packId);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseCompanion = async (companionId: string) => {
    setPurchasing(companionId);
    try {
      const result = await purchaseCompanion(userProfile.uid, companionId);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

// we no longer need a custom zigzag helper – use `makeBorderPoints` from
// the shared avatarItems utilities which covers zigzag, spiked and ornate.

const AvatarItemCard = ({ item, owned }: { item: AvatarItem; owned: boolean }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.03 }}
    transition={{ duration: 0.2 }}
    className={`
      p-2 sm:p-3 md:p-4
      rounded-xl
      border
      flex flex-col items-center
      transition-colors duration-200
      ${owned ? 'bg-success/10 border-success/30' : 'bg-card/70 border-border/70'}
    `}
  >
    <div
      className={
        // base layout classes + optional frame-specific helper class
        `
        w-full
        aspect-square
        ${
          item.type === 'frame'
            ? isRectFrameStyle(item.borderStyle)
              ? 'rounded-lg'
              : 'rounded-full'
            : 'rounded-lg'
        }
        flex items-center justify-center
        mb-2 sm:mb-3
        text-3xl sm:text-4xl md:text-5xl
        relative
      ${item.type === 'frame' ? computeFrameCss(item, 2, '#000000').className || '' : ''}
      `
      }
      style={
        item.type === 'background'
          ? { background: item.cssValue || 'var(--secondary)' }
          : item.type === 'frame'
          ? computeFrameCss(item, 2, '#000000').style
          : undefined
      }
    >
      {item.type === 'frame' && needsSvgBorder(item.borderStyle) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
        >
          <polygon
            points={makeBorderPoints(item.borderStyle)}
            fill="none"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="miter"
          />
        </svg>
      )}
      {item.emoji}
    </div>

    <h4 className="font-medium text-xs sm:text-sm md:text-base truncate">
      {item.name}
    </h4>

    <p className="text-[10px] sm:text-xs md:text-body text-muted-foreground truncate">
      {item.description}
    </p>

    <div className="flex items-center justify-center mt-2 sm:mt-3 w-full">
      {owned ? (
        <span className="text-success flex items-center justify-center">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </span>
      ) : (
        <Button
          size="sm"
          className="text-xs sm:text-sm px-2 sm:px-3 flex items-center justify-center w-full min-w-[80px]"
          onClick={() => handlePurchaseAvatarItem(item.id)}
          disabled={purchasing === item.id || userProfile.credits < item.price}
        >
          {purchasing === item.id ? (
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
          ) : (
            `$ ${item.price}`
          )}
        </Button>
      )}
    </div>
  </motion.div>
);


  const categoryLabels: Record<string, string> = {
    background: '🖼️ Backgrounds',
    face: '🐾 Faces',
    frame: '🖼️ Frames'
  };

  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
              <div className="w-full rounded-md flex items-center text-muted-foreground justify-center font-bold overflow-hidden">
                <motion.img
                  src={LogoImg}
                  alt="SocialSpark logo"
                  className="h-16 w-16 object-contain"
                  animate={{ scale: [1, 1.05, 1], opacity: [1, 0.98, 1] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
                />Store
              </div>
          <p className="text-muted-foreground text-body">
            Purchase pets, assets, emoticons, avatar items, credits, and boosts
          </p>
        </motion.div>

        <Tabs defaultValue="pets" className="w-full">
          <TabsList className="w-full mb-4 bg-primary/30 grid grid-cols-4 sm:grid-cols-7 h-auto gap-1 p-1">
            <TabsTrigger value="pets" className="text-caption h-10 flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span>Pets</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-caption h-10 flex items-center gap-1.5">
              <Gem className="w-4 h-4" />
              <span>Assets</span>
            </TabsTrigger>
            <TabsTrigger value="companions" className="text-caption h-10 flex items-center gap-1.5">
              <span>🤖</span>
              <span>Companion</span>
            </TabsTrigger>
            <TabsTrigger value="emoticons" className="text-caption h-10 flex items-center gap-1.5">
              <Smile className="w-4 h-4" />
              <span>Emoticons</span>
            </TabsTrigger>
            <TabsTrigger value="avatar" className="text-caption h-10 flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              <span>Avatar</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="text-caption h-10 flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              <span>Credits</span>
            </TabsTrigger>
            <TabsTrigger value="boosts" className="text-caption h-10 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Boosts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pets">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
            >
              {pets.map((pet, i) => (
                <StoreItemCard
                  key={pet.id}
                  item={pet}
                  owned={hasActivePet(userProfile, pet.id, now)}
                  expiryText={formatExpiry(getPetExpiryTimestamp(userProfile, pet.id))}
                  onPurchase={() => handlePurchase(pet.id)}
                  delay={i * 0.05}
                />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="assets">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
            >
              {assets.map((asset, i) => (
                (() => {
                  const quantity = getActiveAssetQuantity(userProfile, asset.id, now);
                  const entries = getAssetExpiryDisplayEntries(userProfile, asset.id, now);
                  const singleExpiry = quantity === 1 ? entries[0]?.expiry ?? null : null;
                  return (
                <StoreItemCard
                  key={asset.id}
                  item={asset}
                  owned={quantity > 0}
                  quantity={quantity}
                  expiryText={formatExpiry(singleExpiry)}
                  onCardClick={quantity > 1 ? () => { setSelectedAssetForExpiry(asset.id); setAssetExpiryPage(1); } : undefined}
                  allowMultiple={true}
                  onPurchase={() => handlePurchase(asset.id)}
                  delay={i * 0.05}
                />
                  );
                })()
              ))}
            </motion.div>
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
          </TabsContent>

          <TabsContent value="companions">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <h3 className="font-semibold mb-1">Companions</h3>
                <p className="text-body text-muted-foreground">Buy one or more companions. Equip one in Profile. They react via toast and major chatroom moments.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMPANION_ITEMS.map((companion) => {
                  const owned = (userProfile.ownedCompanions || []).includes(companion.id);
                  return (
                    <div key={companion.id} className={`rounded-xl border p-4 ${owned ? 'bg-success/10 border-success/30' : 'bg-primary/10 border-primary/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{companion.emoji}</span>
                          <div>
                            <div className="font-semibold">{companion.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{companion.style}</div>
                          </div>
                        </div>
                        {owned ? <CheckCircle className="w-5 h-5 text-success" /> : <span className="font-semibold">${formatWithCommas(companion.price)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{companion.description}</p>
                      {!owned && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handlePurchaseCompanion(companion.id)}
                          disabled={purchasing === companion.id || userProfile.credits < companion.price}
                        >
                          {purchasing === companion.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy Companion'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>

          {/* Emoticon Packs Tab */}
          <TabsContent value="emoticons">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-4">
                <h3 className="font-semibold text-primary mb-2">😀 Emoticon Packs</h3>
                <p className="text-body text-muted-foreground">
                  Buy emoticon packs to use fun emojis in chat! Once purchased, an emoticon button will appear in the chat input.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EMOTICON_PACKS.map((pack, i) => {
                  const isOwned = (userProfile as any).ownedEmoticonPacks?.includes(pack.id) || false;
                  return (
                    <motion.div
                      key={pack.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-4 rounded-xl border ${
                        isOwned ? 'bg-success/10 border-success/30' : 'bg-primary/10 border border-primary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold">{pack.name}</h4>
                          <p className="text-caption text-muted-foreground">{pack.description}</p>
                        </div>
                        {isOwned ? (
                          <span className="px-2 py-1 text-success text-xs rounded-full"><CheckCircle/></span>
                        ) : (
                          <span className="text-primary font-bold">${formatWithCommas(pack.price)}</span>
                        )}
                      </div>

                      {/* Preview emoticons */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pack.emoticons.slice(0, pack.emoticons.length).map((e, idx) => (
                          <span key={idx} className="text-lg">{e}</span>
                        ))}
                        {/* {pack.emoticons.length > 10 && (
                          <span className="text-caption text-muted-foreground self-center">+{pack.emoticons.length - 10} more</span>
                        )} */}
                      </div>

                      {!isOwned && (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full"
                          onClick={() => handlePurchaseEmoticonPack(pack.id)}
                          disabled={purchasing === pack.id || userProfile.credits < pack.price}
                        >
                          {purchasing === pack.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy Pack'}
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="avatar">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pr-2"
            >
              {AVATAR_ITEM_TYPES.map((type) => {
                const items = getAvatarItemsByType(type);
                return (
                  <div key={type}>
                    <h3 className="font-semibold mb-3 text-body">
                      {categoryLabels[type] || type}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {items.map((item, i) => {
                        const owned = userProfile.ownedAvatarItems?.includes(item.id) || false;

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.03 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                            className={`
                              p-2 sm:p-3 md:p-4
                              rounded-xl
                              border
                              min-h-[220px] flex flex-col items-center justify-between
                              transition-colors duration-200
                              ${owned ? 'bg-success/10 border-success/30' : 'bg-card/70 border-border/70'}
                            `}
                          >
                            <div
                              className={`
                                w-full
                                aspect-square
                                ${item.type === 'frame'
                                  ? isRectFrameStyle(item.borderStyle)
                                    ? 'rounded-lg'
                                    : 'rounded-full'
                                  : 'rounded-lg'}
                                flex items-center justify-center
                                mb-2 sm:mb-3
                                text-3xl sm:text-4xl md:text-5xl
                                relative
                                ${item.type === 'frame' ? computeFrameCss(item, 2, '#000000').className || '' : ''}
                              `}
                              style={
                                item.type === 'background'
                                  ? { background: item.cssValue || 'var(--secondary)' }
                                  : item.type === 'frame'
                                  ? computeFrameCss(item, 2, '#000000').style
                                  : undefined
                              }
                            >
                              {item.type === 'frame' && needsSvgBorder(item.borderStyle) && (
                                <svg
                                  className="absolute inset-0 w-full h-full pointer-events-none"
                                  viewBox="0 0 100 100"
                                >
                                  <polygon
                                    points={makeBorderPoints(item.borderStyle)}
                                    fill="none"
                                    stroke="#000000"
                                    strokeWidth="2"
                                    strokeLinejoin="miter"
                                  />
                                </svg>
                              )}
                              {item.emoji}
                            </div>

                            <h4 className="font-medium text-caption sm:text-body text-center leading-tight break-words w-full min-h-[2.25rem]">
                              {item.name}
                            </h4>

                            <p className="text-caption text-muted-foreground text-center leading-snug break-words w-full min-h-[2.6rem]">
                              {item.description}
                            </p>

                            <div className="flex items-center justify-center mt-2 sm:mt-3 w-full">
                              {owned ? (
                                <span className="text-success flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  className="text-xs sm:text-sm px-2 sm:px-3 flex items-center justify-center w-full min-w-[80px]"
                                  onClick={() => handlePurchaseAvatarItem(item.id)}
                                  disabled={purchasing === item.id || userProfile.credits < item.price}
                                >
                                  {purchasing === item.id ? (
                                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                  ) : (
                                    `$ ${item.price}`
                                  )}
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </TabsContent>

          {/* Credit Packs Tab */}
          <TabsContent value="credits">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl bg-sky-400/10 border border-sky-500/30 mb-4">
                <h3 className="font-semibold text-sky-500 mb-2">💰 Buy Credits</h3>
                <p className="text-body text-muted-foreground">
                  Purchase credit packs to use in the app. Pro grants Merchant status and Elite grants Mentor status automatically when purchased.
                </p>

                {/* Current role status */}
                {(userProfile.merchantExpiry || userProfile.mentorExpiry) && (
                  <div className="mt-3 p-2 rounded-lg bg-secondary/20 text-sm">
                    {userProfile.merchantExpiry ? (
                      userProfile.merchantExpiry > Date.now() ? (
                        <div className="text-violet-500">Merchant ({userProfile.merchantLevel || 'standard'}) until {new Date(userProfile.merchantExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                      ) : (
                        <div className="text-muted-foreground">Merchant expired {new Date(userProfile.merchantExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                      )
                    ) : null}

                    {userProfile.mentorExpiry ? (
                      userProfile.mentorExpiry > Date.now() ? (
                        <div className="text-pink-500">Mentor ({userProfile.mentorLevel || 'elite'}) until {new Date(userProfile.mentorExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                      ) : (
                        <div className="text-muted-foreground">Mentor expired {new Date(userProfile.mentorExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                      )
                    ) : null}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {CREDIT_PACKS.map((pack, i) => (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-xl border ${
                      pack.popular ? 'bg-primary/30 border-default/30' : 'bg-card/70 border-border/70'
                    } text-center relative`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gold text-gold-foreground text-xs rounded-full">
                        Popular
                      </span>
                    )}
                    <div className="text-3xl mb-2">{pack.emoji}</div>
                    <h4 className="font-bold text-sm mb-1">{pack.name || pack.id}</h4>
                    <h4 className="font-bold text-lg text-sky-500">{formatWithCommas(pack.credits)}</h4>
                    <p className="text-caption text-muted-foreground mb-3">credits</p>
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <img
                        src={UsdtLogo}
                        alt="USDT"
                        className="h-4 w-4 object-contain"
                      />
                      <span>{pack.price}</span>
                    </div>

                    {/* Special notes for automatic roles */}
                    {pack.id === 'pack_standard' && (
                      <>
                        <p className="text-caption text-muted-foreground mt-2">Includes <strong>Merchant</strong> status (<span className='text-violet-500'>purple</span> username)</p>
                        {userProfile.merchantExpiry && userProfile.merchantExpiry > Date.now() && (userProfile.merchantLevel === 'basic' || userProfile.merchantLevel === 'standard' as any) && (
                          <p className="text-xs text-violet-500 mt-1">Active until {new Date(userProfile.merchantExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        )}
                      </>
                    )}
                    {pack.id === 'pack_pro' && (
                      <>
                        <p className="text-caption text-muted-foreground mt-2">Includes <strong>Merchant</strong> status (<span className='text-gold'>gold</span> username)</p>
                        {userProfile.merchantExpiry && userProfile.merchantExpiry > Date.now() && userProfile.merchantLevel === 'pro' && (
                          <p className="text-xs text-gold mt-1">Active until {new Date(userProfile.merchantExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        )}
                      </>
                    )}
                    {pack.id === 'pack_elite' && (
                      <>
                        <p className="text-caption text-muted-foreground mt-2">Includes <strong>Mentor</strong> status (<span className='text-pink-500'>pink</span> username)</p>
                        {userProfile.mentorExpiry && userProfile.mentorExpiry > Date.now() && userProfile.mentorLevel === 'elite' && (
                          <p className="text-xs text-pink-500 mt-1">Active until {new Date(userProfile.mentorExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        )}
                      </>
                    )}

                    <p className="text-caption text-muted-foreground mt-3">Contact an admin to purchase this pack.</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6"
            >
              <div className="rounded-2xl border border-border bg-card/70 p-6">

                {/* Header */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    💳 Payment Methods
                  </h3>
                  <p className="text-body text-muted-foreground mt-1 max-w-xl">
                    Purchase credit packs via Binance Pay or deposit USDT using supported networks.
                  </p>
                </div>

                <div className="h-px bg-border/70 my-6" />

                {/* Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Binance Pay */}
                  <a
                    href="https://www.binance.com/en/pay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl border border-secondary/30 bg-background/40 hover:bg-background/60 transition-all duration-300 p-5 flex flex-col items-center text-center"
                  >
                    {/* Portrait Image Wrapper */}
                    <div className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[220px] 
                                    aspect-[9/16] 
                                    rounded-xl overflow-hidden 
                                    border border-secondary/20 
                                    shadow-sm bg-black/5 
                                    flex items-center justify-center">

                      <img
                        src={BinancePayImg}
                        alt="Binance Pay ID"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <h4 className="mt-4 font-medium">Binance Pay</h4>
                    <p className="text-caption text-muted-foreground mt-1">
                      Use the provided Pay ID to complete your payment.
                    </p>

                  </a>

                  {/* USDT Deposit */}
                  <a
                    href="https://www.binance.com/en/deposit-usdt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl border border-secondary/30 bg-background/40 hover:bg-background/60 transition-all duration-300 p-5 flex flex-col items-center text-center"
                  >
                    <div className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[220px] 
                                    aspect-[9/16] 
                                    rounded-xl overflow-hidden 
                                    border border-secondary/20 
                                    shadow-sm bg-black/5 
                                    flex items-center justify-center">

                      <img
                        src={BinanceUsdtImg}
                        alt="USDT Deposit Networks"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <h4 className="mt-4 font-medium">USDT Deposit</h4>
                    <p className="text-caption text-muted-foreground mt-1">
                      Deposit USDT via supported blockchain networks.
                    </p>
                  </a>

                </div>

                <p className="text-caption text-muted-foreground mt-6 text-center md:text-left">
                  Use the Pay ID or deposit wallet details shown above when completing your transaction.
                </p>

              </div>
            </motion.section>

            <div className='p-2 text-center text-muted-foreground mt-4'>
              <p className='bg-gold/30 rounded p-2'> Please contact user @bimo33 for more information</p>
            </div>
          </TabsContent>

          {/* XP Boosts Tab */}
          <TabsContent value="boosts">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 mb-4">
                <h3 className="font-semibold text-sky-500 mb-2">⚡ XP Boosts</h3>
                <p className="text-body text-muted-foreground">
                  Boost your XP gain for a limited time! Only one boost can be active at a time.
                </p>
                {userProfile.xpBoostMultiplier && userProfile.xpBoostMultiplier > 1 && userProfile.xpBoostEndTime && userProfile.xpBoostEndTime > Date.now() && (
                  <div className="mt-2 p-2 bg-sky-300/20 rounded-lg text-sm text-sky-500">
                    Active: {userProfile.xpBoostMultiplier}x XP boost - {Math.ceil((userProfile.xpBoostEndTime - Date.now()) / 60000)} minutes remaining
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {XP_BOOSTS.map((boost, i) => {
                  const hasActiveBoost = userProfile.xpBoostEndTime && userProfile.xpBoostEndTime > Date.now();
                  return (
                    <motion.div
                      key={boost.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-card/70 border border-border/70 text-center"
                    >
                      <div className="text-3xl mb-2">{boost.emoji}</div>
                      <h4 className="font-bold text-accent">{boost.name}</h4>
                      <div className="text-destructive font-semibold mb-2">$ {formatWithCommas(boost.price)} </div>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={() => handlePurchaseBoost(boost.id)}
                        disabled={purchasing === boost.id || userProfile.credits < boost.price || hasActiveBoost}
                      >
                        {purchasing === boost.id ? <Loader2 className="w-3 h-3 animate-spin" /> : hasActiveBoost ? 'Active Boost' : 'Buy'}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>


        </Tabs>

        {/* Admin Sale (admins only) */}
        {userProfile.isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-xl bg-card/70 border border-border/70">
            <h3 className="font-semibold mb-2 text-sky-500">Admin — Sell Credit Pack</h3>
            <p className="text-body text-muted-foreground mb-3">Select a pack and enter the recipient username to sell a pack directly to a user.</p>

            <div className="flex items-center gap-2 mb-3">
              <select className="rounded px-2 py-1 bg-background border" value={adminPack} onChange={(e) => setAdminPack(e.target.value)}>
                {CREDIT_PACKS.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {formatWithCommas(p.credits)} USD</option>
                ))}
              </select>

              <input className="rounded px-2 py-1 bg-background border flex-1" placeholder="recipient username" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />

              <Button size="sm" variant="accent" onClick={async () => {
                if (!adminPack || !adminUsername.trim()) { toast.error('Select a pack and enter a username'); return; }
                setAdminSelling(true);
                try {
                  const res = await sellPackToUser(userProfile.uid, adminPack, adminUsername.trim());
                  if (res.success) { toast.success(res.message); refreshProfile(); setAdminUsername(''); }
                  else toast.error(res.message);
                } catch (e) {
                  toast.error('Sale failed');
                } finally { setAdminSelling(false); }
              }} disabled={adminSelling}>
                {adminSelling ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sell'}
              </Button>
            </div>

          </motion.div>
        )}

        {/* Admin Voucher Generator */}
        {userProfile.isAdmin && (
          <VoucherGenerator />
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-xl bg-card/70 border border-border/70"
        >
          <div className="flex items-start gap-3">
            <ShoppingBag className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">About the Store</h4>
              <p className="text-body text-muted-foreground">
                • Pets can be fed by friends who own the same pet<br />
                • Assets generate daily credits (collect on home)<br />
                • Avatar items customize your profile appearance<br />
                • XP boosts multiply your experience gain<br />
                • Mentors get pink usernames in chat<br />
                • Purchase credits from the Credits tab (contact admins to complete purchase)
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </NewAppLayout>
  );
}

function isRectFrameStyle(style?: string): boolean {
  return style === 'square'
    || style === 'rounded-rectangle';
}
