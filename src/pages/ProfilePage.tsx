import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { presenceToColorClass, presenceLabel } from '@/lib/utils';
import { StatsCard } from '@/components/cards/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Coins,
  Star,
  Gem,
  Trophy,
  Users,
  LogOut,
  Send,
  History,
  Gift,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Store,
  User,
  Wallet,
  Palette,
  Edit,
  Check,
  ThumbsUpIcon,
  PawPrint,
  Ticket,
  LucideTicket
} from 'lucide-react';
import PetAnimation from '@/components/PetAnimation';
import { Badge } from '@/components/ui/badge';
import { STORE_ITEMS, transferCredits, getTransactionHistory, Transaction, getXpProgress } from '@/lib/firebaseOperations';
import { getBadgeForLevel, getNextBadge, getLevelsUntilNextBadge } from '@/lib/badges';
import {
  AVATAR_ITEMS,
  computeFrameCss,
  needsSvgBorder,
  makeBorderPoints,
  BorderStyle
} from '@/lib/avatarItems';
import { CustomAvatar } from '@/components/CustomAvatar';
import { formatShortNumber, formatWithCommas } from '@/lib/utils';
import { getCountryByCode } from '@/lib/countries';
import { toast } from 'sonner';
import VoucherRedeem from '@/components/VoucherRedeem';
import GiftListDialog from '@/components/GiftListDialog';
import Username from '@/components/Username';

export default function ProfilePage() {
  const { userProfile, logout, refreshProfile, updateStatus, updateAvatarItems } = useAuth();
  const navigate = useNavigate();
  const PAGE_SIZE = 20;

  // border SVG points are generated via the shared helper; zigzag/spiked/ornate
  // shapes all come from `makeBorderPoints`.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferUsername, setTransferUsername] = useState('');
  const [confirmUsername, setConfirmUsername] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [showReceivedGifts, setShowReceivedGifts] = useState(false);
  const [showSentGifts, setShowSentGifts] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  // Cleanup object URL when preview changes or component unmounts
  useEffect(() => {
    const current = previewUrl;
    return () => {
      if (current) {
        try { URL.revokeObjectURL(current); } catch (e) { /* ignore */ }
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (userProfile) {
      loadTransactions();
      setNewStatus(userProfile.statusMessage || '');
    }
  }, [userProfile?.uid]);

  const loadTransactions = async () => {
    if (!userProfile) return;
    setLoadingTransactions(true);
    try {
      const txs = await getTransactionHistory(userProfile.uid);
      setTransactions(txs);
      setVisibleCount(PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleTransfer = async () => {
    if (!userProfile || !transferUsername.trim() || !transferAmount) {
      toast.error('Please enter username and amount');
      return;
    }

    if (transferUsername !== confirmUsername) {
      toast.error('Usernames do not match');
      return;
    }

    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setTransferring(true);
    try {
      const result = await transferCredits(userProfile.uid, transferUsername, amount);
      if (result.success) {
        toast.success(result.message);
        setTransferUsername('');
        setConfirmUsername('');
        setTransferAmount('');
        refreshProfile();
        loadTransactions();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleSaveStatus = async () => {
    setSavingStatus(true);
    try {
      await updateStatus(newStatus);
      setEditingStatus(false);
      toast.success('Status updated!');
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleEquipItem = async (itemId: string, type: string) => {
    if (!userProfile) return;
    const newItems = {
      ...userProfile.avatarItems,
      [type]: userProfile.avatarItems[type as keyof typeof userProfile.avatarItems] === itemId ? undefined : itemId
    };
    await updateAvatarItems(newItems);
  };


  if (!userProfile) return null;

  const ownedPets = STORE_ITEMS.filter(i => i.type === 'pet' && userProfile.pets.includes(i.id));
  const ownedAssets = STORE_ITEMS.filter(i => i.type === 'asset' && userProfile.assets.includes(i.id));
  const xpProgress = getXpProgress(userProfile.xp, userProfile.level).percent;
  const badge = getBadgeForLevel(userProfile.level);
  const nextBadge = getNextBadge(userProfile.level);
  const levelsUntilNext = getLevelsUntilNextBadge(userProfile.level);
  const country = getCountryByCode(userProfile.country);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full mb-2 bg-primary/30">
            <TabsTrigger value="general" className="flex-1">
              <User className="w-4 h-4 mr-1" />
              General
            </TabsTrigger>
            <TabsTrigger value="account" className="flex-1">
              <Wallet className="w-4 h-4 mr-1" />
              Account
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex-1">
              <Palette className="w-4 h-4 mr-1" />
              Avatar
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            {/* Hero Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl border border-border/50 bg-background/70 backdrop-blur-xl"
                >
                {/* Subtle Gradient Edge */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 pointer-events-none" />

                <div className="relative p-5 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">

                    {/* LEFT: Avatar + Presence */}
                    <div className="flex flex-col items-center md:items-start shrink-0">
                        <motion.div
                        whileHover={{ scale: 1.04 }}
                        className="relative"
                        >
                        <div className="p-1">
                            <CustomAvatar
                            avatar={userProfile.avatar}
                            imageUrl={userProfile.profileImageUrl}
                            avatarItems={userProfile.avatarItems}
                            size="xl"
                            className="w-28 h-28"
                            />
                        </div>

                        <span
                            role="status"
                            className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-background ${
                            presenceToColorClass(
                                userProfile.presence || (userProfile.isOnline ? 'online' : 'offline')
                            )
                            }`}
                        />
                        </motion.div>
                    </div>

                    {/* RIGHT: Info Section */}
                    <div className="flex-1 text-center md:text-left">

                        {/* Username + Roles */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-center md:justify-between">
                        <h1 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
                            <Username user={userProfile} />
                        </h1>

                        {/* Role Tags */}
                        <div className="flex flex-wrap justify-center md:justify-end gap-2">
                            {userProfile.merchantExpiry > Date.now() && (
                            <span className="px-3 py-1 text-xs rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/30">
                                Merchant · {userProfile.merchantLevel || 'standard'}
                            </span>
                            )}
                            {userProfile.mentorExpiry > Date.now() && (
                            <span className="px-3 py-1 text-xs rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/30">
                                Mentor · {userProfile.mentorLevel || 'elite'}
                            </span>
                            )}
                        </div>
                        </div>

                        {/* Status */}
                        <div className="mt-4">
                        {editingStatus ? (
                            <div className="flex gap-2 justify-center md:justify-start">
                            <Input
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                maxLength={100}
                                className="h-9 bg-background"
                            />
                            <Button
                                size="sm"
                                onClick={handleSaveStatus}
                                disabled={savingStatus}
                            >
                                {savingStatus
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Check className="w-4 h-4" />}
                            </Button>
                            </div>
                        ) : (
                            <div
                            onClick={() => setEditingStatus(true)}
                            className="cursor-pointer px-4 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition text-sm text-muted-foreground"
                            >
                            {userProfile.statusMessage || 'Tap to set status...'}
                            </div>
                        )}
                        </div>

                        {/* Meta Info Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm text-muted-foreground">
                        <div className="flex flex-col items-center md:items-start">
                            <span className="text-xs uppercase tracking-wide">Country</span>
                            <span className="font-medium text-foreground">
                            {country.flag} {country.name}
                            </span>
                        </div>

                        <div className="flex flex-col items-center md:items-start">
                            <span className="text-xs uppercase tracking-wide">Age</span>
                            <span className="font-medium text-foreground">
                            {userProfile.age}
                            </span>
                        </div>

                        <div className="flex flex-col items-center md:items-start">
                            <span className="text-xs uppercase tracking-wide">Level</span>
                            <span className="font-medium text-foreground">
                            {userProfile.level}
                            </span>
                        </div>

                        <div className="flex flex-col items-center md:items-start">
                        <span className="text-xs uppercase tracking-wide">Member Since</span>
                        <span className="font-medium text-foreground">
                            {userProfile.createdAt?.toDate
                            ? userProfile.createdAt.toDate().toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short'
                                })
                            : new Date(userProfile.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short'
                                })}
                        </span>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
                </motion.div>

            {/* XP Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Level {userProfile.level}</p>
                    <p className="text-xs text-muted-foreground">{userProfile.xp.toLocaleString()} XP</p>
                  </div>
                </div>
                {nextBadge && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{levelsUntilNext} levels to</p>
                    <p className="text-sm">{nextBadge.emoji} {nextBadge.name}</p>
                  </div>
                )}
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>


            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Statistics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <StatsCard icon={Coins} label="Credits" value={formatWithCommas(userProfile.credits)} gradient="primary" delay={0} />
                <StatsCard icon={Star} label="Level" value={userProfile.level} gradient="primary" delay={0.02} />
                <StatsCard icon={PawPrint} label="Pets" value={ownedPets.length} gradient="primary" delay={0.04} />
                <StatsCard icon={Gem} label="Assets" value={ownedAssets.length} gradient="primary" delay={0.06} />
                <StatsCard icon={Users} label="Friends" value={userProfile.friends.length} gradient="primary" delay={0.08} />
                <StatsCard icon={Trophy} label="Total XP" value={userProfile.xp} gradient="primary" delay={0.1} />
                <StatsCard icon={Gift} label="Sent" value={userProfile.giftsSent || 0} gradient="primary" delay={0.12} />
                <StatsCard icon={Gift} label="Received" value={userProfile.giftsReceived || 0} gradient="primary" delay={0.14} />
                <StatsCard icon={ThumbsUpIcon} label="Likes" value={userProfile.profileLikes || 0} gradient="primary" delay={0.16} />
              </div>
            </motion.div>

            {/* Pets Section */}
            <h3 className="font-semibold mb-3 flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-primary" />
                Your Pets
              </h3>

              {ownedPets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {ownedPets.map((pet) => (
                    <motion.div
                      key={pet.id}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="w-full aspect-square rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center border border-primary/20"
                    >
                      <PetAnimation animationData={pet.animationData} size={56} />
                      <span className="text-xs mt-1 text-muted-foreground">{pet.name}</span>
                    </motion.div>
                  ))}
                </div>

              ) : (
                <div className="text-center py-6">
                  <PawPrint className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No pets yet</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/store')}>
                    <Store className="w-4 h-4 mr-1" />
                    Visit Store
                  </Button>
                </div>
              )}

            {/* Assets Section */}
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Gem className="w-4 h-4 text-success" />
              Your Assets
            </h3>
              {ownedAssets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {ownedAssets.map((asset) => {
                    const quantity = userProfile.assetQuantities?.[asset.id] || 1;

                    return (
                      <motion.div
                        key={asset.id}
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="relative w-full aspect-square rounded-xl bg-gradient-to-br from-success/10 to-success/5 flex flex-col items-center justify-center border border-success/20"
                      >
                        {asset.animationData ? (
                          <PetAnimation animationData={asset.animationData} size={48} />
                        ) : (
                          <span className="text-4xl">{asset.emoji}</span>
                        )}

                        <span className="text-xs mt-1 text-muted-foreground">
                          {asset.name}
                        </span>

                        {quantity > 1 && (
                          <Badge
                            variant="default"
                            className="absolute -top-2 -right-2 h-5 min-w-5 text-xs"
                          >
                            {quantity}
                          </Badge>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Gem className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No assets yet</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/store')}>
                    <Store className="w-4 h-4 mr-1" />
                    Visit Store
                  </Button>
                </div>
              )}


            {/* Logout Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button variant="destructive" className="w-full" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
            >
              <Coins className="w-12 h-12 mx-auto mb-2 text-success" />
              <p className="text-center text-muted-foreground mb-2">Current Balance</p>
              <h2 className="text-3xl text-center font-bold text-success">{formatWithCommas(userProfile.credits)}</h2>
              <p className="text-xs text-muted-foreground mt-1 text-center">{formatWithCommas(userProfile.credits)} USD </p>
            </motion.div>

            <VoucherRedeem />


            {/* Transfer Section with username confirmation */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-accent" />
                Transfer Credits
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder="Username"
                  value={transferUsername}
                  onChange={(e) => setTransferUsername(e.target.value)}
                />
                <Input
                  placeholder="Confirm Username"
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                />
                {transferUsername && confirmUsername && transferUsername !== confirmUsername && (
                  <p className="text-xs text-destructive">Usernames do not match</p>
                )}
                <Input
                  type="number"
                  placeholder="Amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleTransfer}
                  disabled={transferring || transferUsername !== confirmUsername || !transferUsername}
                >
                  {transferring ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Credits
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Transaction History
                </h3>
              </div>
              <ScrollArea className="h-80">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {transactions.slice(0, visibleCount).map((tx, i) => {
                      const isOutgoing = tx.from === userProfile.uid;
                      return (
                        <div key={tx.id || i} className="p-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOutgoing ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
                            {isOutgoing ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {tx.description || tx.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.timestamp)}
                            </p>
                            <span className={`font-semibold ${isOutgoing ? 'text-destructive' : 'text-success'}`}>
                            {isOutgoing ? '-' : '+'}{tx.amount}
                          </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>


                )}
              </ScrollArea>
              <div className="p-3 border-t border-white/5 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(visibleCount, transactions.length)} of {transactions.length}
                </p>
                <div className="flex items-center gap-2">
                  {visibleCount < transactions.length && (
                    <Button size="sm" onClick={() => setVisibleCount(c => Math.min(c + PAGE_SIZE, transactions.length))}>
                      Load more
                    </Button>
                  )}
                  {visibleCount > PAGE_SIZE && (
                    <Button variant="ghost" size="sm" onClick={() => setVisibleCount(PAGE_SIZE)}>
                      Show less
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Avatar Tab */}
          <TabsContent value="avatar" className="space-y-4">
            {/* Avatar Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="relative inline-block">
                <div className="mx-auto">
                  <CustomAvatar
                    avatar={userProfile.avatar}
                    imageUrl={userProfile.profileImageUrl}
                    avatarItems={userProfile.avatarItems}
                    size="xl"
                    className="w-24 h-24 text-5xl mx-auto"
                  />
                </div>

              </div>
              <p className="text-sm text-muted-foreground mt-4">Click items below to equip/unequip</p>
            </motion.div>

            {/* Owned Avatar Items by Category */}
            {([
              'background',
              'face',
              'frame'
            ] as const).map((type) => {
              const ownedItems = AVATAR_ITEMS.filter(
                item => item.type === type && userProfile.ownedAvatarItems?.includes(item.id)
              );
              const equipped = userProfile.avatarItems?.[type as keyof typeof userProfile.avatarItems];

              if (ownedItems.length === 0) return null;

              const labelMap: Record<string, string> = {
                background: 'Backgrounds',
                face: 'Faces',
                frame: 'Frames'
              };

              return (
                <div key={type} className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <h3 className="font-semibold mb-3">{labelMap[type] || type}</h3>
                  <div className="flex flex-wrap gap-2 grid grid-cols-5">
                    {ownedItems.map((item) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEquipItem(item.id, type)}
                        className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl border-2 transition-colors ${
                          equipped === item.id
                            ? 'border-primary bg-primary/20'
                            : 'border-white/10 bg-secondary/50 hover:border-primary/50'
                        } ${item.type === 'frame' ? computeFrameCss(item, 2).className || '' : ''}`}
                        style={
                          item.type === 'background'
                            ? { background: item.cssValue }
                            : item.type === 'frame'
                            ? computeFrameCss(item, 2).style
                            : undefined
                        }
                      >
                        {item.type === 'frame' && needsSvgBorder(item.borderStyle) && item.cssValue && (
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 100 100"
                          >
                            <polygon
                              points={makeBorderPoints(item.borderStyle)}
                              fill="none"
                              stroke={item.cssValue}
                              strokeWidth="2"
                              strokeLinejoin="miter"
                            />
                          </svg>
                        )}
                        {item.emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {(!userProfile.ownedAvatarItems || userProfile.ownedAvatarItems.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No avatar items owned yet</p>
                <p className="text-sm">Visit the store to buy avatar items!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </NewAppLayout>
  );
}
