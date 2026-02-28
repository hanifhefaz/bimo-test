import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn, formatShortNumber } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  gradient?: 'primary' | 'gold' | 'accent' | 'success';
  delay?: number;
  onClick?: () => void;
}


const gradientStyles = {
  primary: 'from-primary/20 to-primary/5 border-primary/30',
  gold: 'from-gold/20 to-gold/5 border-gold/30',
  accent: 'from-accent/20 to-accent/5 border-accent/30',
  success: 'from-success/20 to-success/5 border-success/30',
};

const iconStyles = {
  primary: 'text-primary',
  gold: 'text-gold',
  accent: 'text-accent',
  success: 'text-success',
};

export function StatsCard({ icon: Icon, label, value, gradient = 'primary', delay = 0, onClick }: StatsCardProps) {
  const clickable = typeof onClick === 'function';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick && onClick();
              }
            }
          : undefined
      }
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br border",
        gradientStyles[gradient],
        clickable ? 'cursor-pointer hover:shadow-lg active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-offset-2' : ''
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-background/50", iconStyles[gradient])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{(() => {
            const isNumeric = typeof value === 'number' || (!isNaN(Number(value as any)) && value !== '');
            return isNumeric ? formatShortNumber(Number(value as any)) : String(value);
          })()}</p>
        </div>
      </div>
    </motion.div>
  );
}
