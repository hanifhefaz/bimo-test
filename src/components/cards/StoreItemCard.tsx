import { motion } from 'framer-motion';
import { StoreItem } from '@/lib/firebaseOperations';
import PetAnimation from '@/components/PetAnimation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Check, Plus, CheckCircle } from 'lucide-react';
import { formatShortNumber } from '@/lib/utils';

interface StoreItemCardProps {
  item: StoreItem;
  owned?: boolean;
  quantity?: number;
  expiryText?: string | null;
  onCardClick?: () => void;
  allowMultiple?: boolean;
  onPurchase?: () => void;
  delay?: number;
}

export function StoreItemCard({ item, owned, quantity = 0, expiryText = null, onCardClick, allowMultiple = false, onPurchase, delay = 0 }: StoreItemCardProps) {
  // Assets can be purchased multiple times, pets cannot
  const canBuyMore = allowMultiple || !owned;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-xl border transition-all flex flex-col ${
        owned && !allowMultiple
          ? 'bg-success/10 border-success/30'
          : 'bg-primary/10 border-white/5 hover:border-primary/20'
      } ${onCardClick ? 'cursor-pointer' : ''}`}
      onClick={onCardClick}
    >
      <div className="relative">
        <motion.div
          className="text-center mb-3"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          {item.animationData ? (
            <div className="mx-auto" style={{ width: 72, height: 72 }}>
              <PetAnimation animationData={item.animationData} size={72} />
            </div>
          ) : item.type === 'pet' ? (
            <div className="mx-auto" style={{ width: 72, height: 72 }}>
              <div className="w-full h-full rounded-lg bg-primary/10 flex items-center justify-center text-body text-muted-foreground">Pet</div>
            </div>
          ) : (
            <motion.div className="text-5xl">{item.emoji}</motion.div>
          )}
        </motion.div>

        {/* Quantity badge for owned items */}
        {quantity > 0 && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 h-6 min-w-6 flex items-center justify-center bg-primary text-primary-foreground"
          >
            {formatShortNumber(quantity)}
          </Badge>
        )}
      </div>

      <h3 className="font-semibold text-center mb-1 leading-tight break-words min-h-[2.2rem]">{item.name}</h3>

      {item.dailyCredits && (
        <div className="text-caption text-success/80 text-center mb-3">
          +{formatShortNumber(item.dailyCredits)} USD/day
        </div>
      )}

      {expiryText && (
        <div className="text-[11px] text-muted-foreground text-center mb-2">
          Expires: {expiryText}
        </div>
      )}

      {/* Show owned status for pets */}
      {owned && !allowMultiple && (
        <div className=" text-success text-center flex items-center justify-center mb-2">
          <CheckCircle className="w-6 h-6" />
        </div>
      )}

      {canBuyMore && (
        <Button
          variant="default"
          size="sm"
          className="w-full mt-auto mx-auto flex items-center justify-center gap-1"
          onClick={onPurchase}
        >
          {quantity > 0 ? (
            <Plus className="w-4 h-4" />
          ) : (
            <Coins className="w-4 h-4" />
          )}
          ${formatShortNumber(item.price)}
        </Button>
      )}
    </motion.div>
  );
}

