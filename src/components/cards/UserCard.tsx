import { motion } from 'framer-motion';
import { UserProfile } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserPlus, UserMinus, Heart } from 'lucide-react';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';

interface UserCardProps {
  user: UserProfile;
  isFriend?: boolean;
  isPending?: boolean;
  unreadCount?: number;
  onMessage?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onFeedPet?: () => void;
  delay?: number;  /** Render additional actions on the right side (aligned inline) */
  rightActions?: React.ReactNode;}

export function UserCard({
  user,
  isFriend,
  isPending,
  unreadCount = 0,
  onMessage,
  onAddFriend,
  onRemoveFriend,
  onFeedPet,
  delay = 0,
  rightActions
}: UserCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      <CustomAvatar
        avatar={user.avatar}
        imageUrl={user.profileImageUrl}
        avatarItems={user.avatarItems}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate"><Username user={user} /></span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
            {user.level}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {user.pets.length > 0 && (
            <span>{user.pets.length} 🐾</span>
          )}
          {user.assets.length > 0 && (
            <span>{user.assets.length} 💎</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isFriend && onMessage && (
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={onMessage} className="h-9 w-9">
              <MessageCircle className="w-4 h-4" />
            </Button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}

        {isFriend && user.pets.length > 0 && onFeedPet && (
          <Button variant="ghost" size="icon" onClick={onFeedPet} className="h-9 w-9 text-destructive">
            <Heart className="w-4 h-4" />
          </Button>
        )}

        {!isFriend && !isPending && onAddFriend && (
          <Button variant="accent" size="sm" onClick={onAddFriend}>
            <UserPlus className="w-4 h-4" />
          </Button>
        )}

        {isPending && (
          <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
            Pending
          </span>
        )}

        {isFriend && onRemoveFriend && (
          <Button variant="ghost" size="icon" onClick={onRemoveFriend} className="h-9 w-9 text-destructive">
            <UserMinus className="w-4 h-4" />
          </Button>
        )}

        {/* Additional right-side actions (aligned inline) */}
        {rightActions && (
          <div className="flex items-center gap-1">
            {rightActions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
