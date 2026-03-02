import { motion } from 'framer-motion';
import { MessageCircle, Eye, X, MinusCircle, UserMinusIcon, UserMinus2, CircleUserRound, UserRoundSearchIcon } from 'lucide-react';
import { presenceToColorClass, presenceLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/contexts/AuthContext';
import { useRealtimePresence, resolvePresence } from '@/hooks/useRealtimePresence';

interface FriendItemProps {
  friend: UserProfile;
  unreadCount?: number;
  onMessage?: () => void;
  onViewProfile?: () => void;
  onRemove?: () => void;
  delay?: number;
}

export function FriendItem({ friend, unreadCount = 0, onMessage, onViewProfile, onRemove, delay = 0 }: FriendItemProps) {
  const presenceMap = useRealtimePresence([friend]);
  const presence = presenceMap[friend.uid] || resolvePresence(friend.presence, friend.isOnline);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="surface-card flex items-center gap-2 p-2.5 hover:border-primary/30 transition-colors"
    >
      <div className="relative">
        <CustomAvatar
          avatar={friend.avatar}
          imageUrl={friend.profileImageUrl}
          avatarItems={friend.avatarItems}
          size="md"
          className="w-10 h-10"
        />
        <span className={cn(
          "absolute bottom-0 right-0 z-20 pointer-events-none w-4 h-4 rounded-full border-2 border-card",
          presenceToColorClass(presence)
        )} role="status" title={presenceLabel(presence)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 min-w-0">
          {/* Role icon */}
          {friend.isMentor && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold shrink-0" title="Mentor">M</span>
          )}
          {friend.isMerchant && !friend.isMentor && (
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-bold shrink-0 ${
              friend.merchantLevel === 'pro' ? 'bg-gold' : 'bg-violet-500'
            }`} title="Merchant">M</span>
          )}
          <Username user={friend} className="font-medium text-body whitespace-nowrap" />

          <div className="w-full overflow-hidden">
            <div className="relative w-full">
              <span className="text-caption text-muted-foreground marquee-text">
                {friend.statusMessage ? friend.statusMessage : 'No status set...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {onViewProfile && (
        <Button
          variant="outline"
          size="icon"
          className="tap-target h-9 w-9"
          onClick={onViewProfile}
          title="View Profile"
        >
          <UserRoundSearchIcon className="w-8 h-8" />
        </Button>
      )}

      {onMessage && (
        <Button
          variant="outline"
          size="icon"
          className="tap-target h-9 w-9 relative"
          onClick={onMessage}
        >
          <MessageCircle className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      )}

      {onRemove && (
        <Button
          variant="outline"
          size="icon"
          className="tap-target h-9 w-9 text-destructive"
          onClick={onRemove}
          title="Remove Friend"
        >
          <UserMinus2 className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
}

export default FriendItem;
