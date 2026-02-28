import { motion } from 'framer-motion';
import { UserPlus, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import { cn, presenceToColorClass, presenceLabel } from '@/lib/utils';
import { UserProfile } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserSearchCardProps {
  user: UserProfile;
  isFriend?: boolean;
  isPending?: boolean;
  onAddFriend?: () => void;
  delay?: number;
}

export function UserSearchCard({ user, isFriend = false, isPending = false, onAddFriend, delay = 0 }: UserSearchCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-muted/10 transition-colors"
    >
      <div className="relative">
        <CustomAvatar
          avatar={user.avatar}
          imageUrl={user.profileImageUrl}
          avatarItems={user.avatarItems}
          size="md"
          className="w-12 h-12"
        />
        <span className={cn(
          "absolute bottom-0 right-0 z-20 pointer-events-none w-3 h-3 rounded-full border-2 border-card",
          presenceToColorClass(user.presence || (user.isOnline ? 'online' : 'offline'))
        )} role="status" title={presenceLabel(user.presence || (user.isOnline ? 'online' : 'offline'))} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Username user={user} className="font-medium text-sm" />
        </div>
        <div className="text-xs text-muted-foreground">Level {user.level}</div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(`/user/${user.uid}`)}
        title="View Profile"
      >
        <Eye className="w-4 h-4" />
      </Button>

      {isFriend ? (
        <span className="text-xs text-success flex items-center gap-1">
          <Check className="w-3 h-3" /> Friend
        </span>
      ) : isPending ? (
        <span className="text-xs text-muted-foreground">Pending</span>
      ) : onAddFriend ? (
        <Button
          variant="accent"
          size="icon"
          className="h-8 w-8"
          onClick={onAddFriend}
          title="Add Friend"
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      ) : null}
    </motion.div>
  );
}

export default UserSearchCard;
