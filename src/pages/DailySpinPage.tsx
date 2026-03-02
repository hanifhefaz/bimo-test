import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { Loader2 } from 'lucide-react';
import SpinWheel from '@/components/DailySpin/SpinWheel';
import Confetti from '@/components/DailySpin/Confetti';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateCredits, STORE_ITEMS, txParticipants, addXP, triggerCompanionEvent } from '@/lib/firebaseOperations';

interface SpinReward {
  type: 'credits' | 'asset' | 'pet' | 'xp';
  amount?: number;
  assetId?: string;
  emoji: string;
  name: string;
}

// extend SpinReward to include weight for non-uniform probabilities
interface WeightedReward extends SpinReward {
  weight: number; // relative weight; probabilities normalized automatically
}

// 30% chance allocated between bicycle asset and 0.5 credits (15% each)
// remaining four outcomes share the other 70% equally (~17.5% each)
const SPIN_REWARDS: WeightedReward[] = [
  { type: 'asset', assetId: 'bicycle', emoji: '🚲', name: 'Bicycle', weight: 0.15 },
  { type: 'credits', amount: 0.5, emoji: '💰', name: '0.50 Credits', weight: 0.15 },
  { type: 'xp', amount: 100, emoji: '⭐', name: '100 XP', weight: 0.175 },
  { type: 'xp', amount: 250, emoji: '🌟', name: '250 XP', weight: 0.175 },
  { type: 'credits', amount: 0.05, emoji: '🪙', name: '0.05 Credits', weight: 0.175 },
  { type: 'credits', amount: 0.1, emoji: '💵', name: '0.10 Credits', weight: 0.175 }
];

// helper to pick one reward from a weighted list and return its index
export function pickWeighted<T extends { weight: number }>(items: T[]): { item: T; index: number } {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (r < item.weight) return { item, index: idx };
    r -= item.weight;
  }
  return { item: items[items.length - 1], index: items.length - 1 };
}

// Display names for the wheel segments
const getRewardDisplayName = (reward: SpinReward): string => {
  if (reward.type === 'credits') {
    // show two decimals for small amounts
    const amt = reward.amount || 0;
    return `${amt.toFixed(2)}`;
  }
  if (reward.type === 'xp') return `${reward.amount} XP`;
  if (reward.type === 'asset') return reward.name;
  return reward.name;
};

// extracted section component for reuse on homepage
export interface DailySpinSectionProps {
  /** hide title/description text above wheel (good for embedding on home) */
  hideHeader?: boolean;
  /** whether to display the per‑segment labels */
  showLabels?: boolean;
}

export function DailySpinSection({ hideHeader, showLabels = true }: DailySpinSectionProps) {
  const { userProfile, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<SpinReward | null>(null);
  const [localLockedAt, setLocalLockedAt] = useState<number | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEmbedded = !!hideHeader;

  if (!userProfile) return null;

  // ✅ single source of truth
  const canSpin = () => {
    const profileLastSpin = userProfile.lastDailySpin
      ? (userProfile.lastDailySpin.toDate?.()?.getTime?.() ?? new Date(userProfile.lastDailySpin).getTime())
      : 0;
    const lastSpinAt = Math.max(profileLastSpin || 0, localLockedAt || 0);
    if (!lastSpinAt) return true;
    return Date.now() - lastSpinAt >= 24 * 60 * 60 * 1000;
  };

  const spinAvailable = canSpin();
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const handleSpin = async () => {
    if (!spinAvailable || spinning) {
      toast.error('You can spin again in 24 hours!');
      return;
    }

    setSpinning(true);
    setReward(null);
    setLocalLockedAt(Date.now());

    try {
      // 🔒 lock immediately (prevents refresh abuse)
      await updateDoc(doc(db, 'users', userProfile.uid), {
        lastDailySpin: serverTimestamp(),
      });

      // prepare segment boundaries for weighted wheel
      const totalWeight = SPIN_REWARDS.reduce((sum, r) => sum + r.weight, 0);
      let acc = 0;
      const segments = SPIN_REWARDS.map(r => {
        const w = r.weight / totalWeight;
        const start = acc * 360;
        acc += w;
        const end = acc * 360;
        return { start, end };
      });

      const { item: pickedReward, index: pickedIndex } = pickWeighted(SPIN_REWARDS);
      const selectedReward = { ...pickedReward };

      // 🎡 rotation math using segment boundaries
      const baseRotation = 360 * 5;
      const seg = segments[pickedIndex];
      const randomOffset = Math.random() * (seg.end - seg.start);
      const targetAngle = seg.start + randomOffset;
      setRotation(prev => prev + baseRotation + (360 - targetAngle));

      // ⏳ wait for animation
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
      spinTimeoutRef.current = setTimeout(async () => {
        try {
          // 🎁 apply reward
          if (selectedReward.type === 'credits' && selectedReward.amount) {
            await updateCredits(userProfile.uid, selectedReward.amount);
            // Record transaction
            await addDoc(collection(db, 'transactions'), {
              from: 'system',
              to: userProfile.uid,
              participants: txParticipants('system', userProfile.uid),
              amount: selectedReward.amount,
              type: 'daily',
              description: 'Daily spin reward',
              timestamp: serverTimestamp()
            });
          } else if (selectedReward.type === 'xp' && selectedReward.amount) {
            // use centralized helper for XP/level calculations
            try {
              const { leveledUp, newLevel } = await addXP(userProfile.uid, selectedReward.amount!);
              if (leveledUp) {
                console.log(`Level up! New level: ${newLevel}`);
              }
            } catch (e) {
              console.error('Failed to award spin XP:', e);
              throw e;
            }
          } else if ((selectedReward.type === 'asset') && selectedReward.assetId) {
            const item = STORE_ITEMS.find(i => i.id === selectedReward.assetId);
            if (item) {
              const field = item.type === 'pet' ? 'pets' : 'assets';
              const currentItems = userProfile[field] || [];

              if (!currentItems.includes(selectedReward.assetId)) {
                await updateDoc(doc(db, 'users', userProfile.uid), {
                  [field]: [...currentItems, selectedReward.assetId],
                });
                // Record transaction for asset won
                await addDoc(collection(db, 'transactions'), {
                  from: 'system',
                  to: userProfile.uid,
                  participants: txParticipants('system', userProfile.uid),
                  amount: item.price, // Value of the asset
                  type: 'daily',
                  description: `Daily spin reward: ${item.name}`,
                  timestamp: serverTimestamp()
                });
                try {
                  await triggerCompanionEvent(userProfile.uid, 'rare_reward_obtained', { itemName: item.name });
                } catch (e) {
                  console.warn('Failed to trigger companion rare reward event (spin):', e);
                }
              } else {
                await updateCredits(userProfile.uid, 0.10);
                // Record transaction for duplicate reward converted to credits
                await addDoc(collection(db, 'transactions'), {
                  from: 'system',
                  to: userProfile.uid,
                  participants: txParticipants('system', userProfile.uid),
                  amount: 0.10,
                  type: 'daily',
                  description: 'Daily spin reward (duplicate converted)',
                  timestamp: serverTimestamp()
                });
                selectedReward.name = '0.10 Credits';
                selectedReward.emoji = '💰';
              }
            }
          }

          setReward(selectedReward);
          toast.success(`You won ${selectedReward.name}!`);
          refreshProfile();
        } catch {
          toast.error('Failed to apply reward');
        } finally {
          setSpinning(false);
          spinTimeoutRef.current = null;
        }
      }, 4000);
    } catch {
      setSpinning(false);
      toast.error('Spin failed');
    }
  };

  return (
    <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto text-center">
      {!hideHeader && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl font-bold mb-2">Daily Spin</h1>
          <p className="text-muted-foreground">
            Spin once every 24 hours for free rewards!
          </p>
        </motion.div>
      )}

      {/* 🎡 NEW WHEEL — Rebuilt using `SpinWheel` + Confetti */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto mb-8"
      >
        {/* Spin wheel component */}
        <div className="relative">
          {!hideHeader && (
            <div className="mb-4 text-body text-muted-foreground">
              Tap <strong>Spin</strong> on the wheel to play. You get one free spin every 24 hours.
            </div>
          )}

          <div className="flex justify-center">
            <div className="relative">
              <div className="relative">
                <SpinWheel rewards={SPIN_REWARDS} rotation={rotation} spinning={spinning} size={320} showLabels={showLabels} />

                {/* Center overlay button (click wheel center to spin) */}
                <button
                  onClick={handleSpin}
                  disabled={spinning || !spinAvailable}
                  aria-label="Spin"
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 rounded-full w-24 h-24 flex items-center justify-center font-semibold shadow-md transition-opacity ${spinning || !spinAvailable ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                  style={{ background: 'linear-gradient(180deg, #fff6, #fff0)' }}
                >
                  {spinning ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <div className="text-sm"></div>
                  )}
                </button>

                {/* Confetti on win */}
                {!isEmbedded && reward && !spinning && <Confetti />}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reward */}
      {!isEmbedded && reward && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-xl bg-gold/20 border border-gold/50"
        >
          <div className="text-4xl mb-2">{reward.emoji}</div>
          <h3 className="font-bold text-gold">You won!</h3>
          <p className="text-lg">{reward.name}</p>
        </motion.div>
      )}

      {/* bottom button removed; wheel center handles spin */}
      {!spinAvailable && !spinning && (
        <p className="text-body text-muted-foreground mt-4">
          Next spin available in 24 hours
        </p>
      )}
    </div>
  );
}

export default function DailySpinPage() {
  return (
    <NewAppLayout>
      <DailySpinSection />
    </NewAppLayout>
  );
}

