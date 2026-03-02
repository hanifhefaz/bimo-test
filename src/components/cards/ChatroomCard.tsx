import { motion } from 'framer-motion';
import { Chatroom, joinChatroom, sendMessage, getMostExpensivePet, getMostExpensiveAsset, COMPANION_ITEMS } from '@/lib/firebaseOperations';
import { Button } from '@/components/ui/button';
import { Users, Lock, Settings, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getBadgeForLevel } from '@/lib/badges';

interface ChatroomCardProps {
  room: Chatroom;
  isOwner?: boolean;
  isMember?: boolean;
  onJoin?: () => void;
  onSettings?: () => void;
  delay?: number;
}

const COMPANION_GREETING_LINES = [
  'we just arrived and already improved the room stats.',
  'hello chat, keep it fun and stack those wins.',
  'new entrance unlocked. vibes increased instantly.',
  'we are here. confidence level: absolutely illegal.'
];

export function ChatroomCard({
  room,
  isOwner,
  isMember,
  onJoin,
  onSettings,
  delay = 0
}: ChatroomCardProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const handleEnter = () => {
    navigate(`/chat/${room.id}`);
  };

  const handleJoinAndEnter = async () => {
    if (!userProfile) return;

    try {
      const wasNewlyAdded = await joinChatroom(room.id, userProfile.uid);
      if (wasNewlyAdded) {
        // Get badge and most expensive pet/asset for announcement
        const badge = getBadgeForLevel(userProfile.level);
        const expensivePet = getMostExpensivePet(userProfile.pets);
        const expensiveAsset = getMostExpensiveAsset(userProfile.assets);
        const equippedCompanion = COMPANION_ITEMS.find((c) => c.id === userProfile.equippedCompanionId);

        // Build announcement message in requested format
        let announcement = `(${badge.name}) ${userProfile.username} (${userProfile.level}) has entered the room`;
        if (expensiveAsset) {
          // embed an asset token for inline animation
          announcement += ` using a <asset:${expensiveAsset.asset.id}>`;
        }
        if (expensivePet) {
          // embed pet token for inline animation
          announcement += ` with a <pet:${expensivePet.pet.id}>`;
        }
        if (equippedCompanion) {
          announcement += ` and accompanied by <companion:${equippedCompanion.id}>`;
        }
        announcement += '!';

        // Send join announcement
        sendMessage(room.id, {
          roomId: room.id,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '📢',
          content: announcement,
          type: 'system'
        });

        if (equippedCompanion) {
          const line = COMPANION_GREETING_LINES[Math.floor(Math.random() * COMPANION_GREETING_LINES.length)];
          sendMessage(room.id, {
            roomId: room.id,
            senderId: 'system',
            senderName: `${userProfile.username}'s companion`,
            senderAvatar: equippedCompanion.emoji,
            content: `${userProfile.username}'s companion <companion:${equippedCompanion.id}> ${equippedCompanion.name}: ${line}`,
            type: 'action'
          });
        }
      }

      toast.success('Joined chatroom!');
      navigate(`/chat/${room.id}`);
    } catch (error) {
      toast.error('Failed to join room');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-4 rounded-xl gradient-card border border-white/5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{room.name}</h3>
              {room.isPrivate && <Lock className="w-3 h-3 text-muted-foreground" />}
            </div>
            <p className="text-caption text-muted-foreground">by {room.ownerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-caption text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{room.participants.length}</span>
        </div>
      </div>

      {room.topic && (
        <p className="text-body text-muted-foreground mb-3 line-clamp-2">{room.topic}</p>
      )}

      <div className="flex gap-2">
        {isMember ? (
          <Button variant="gradient" size="sm" onClick={handleEnter} className="flex-1">
            Enter Chat
          </Button>
        ) : (
          <Button variant="accent" size="sm" onClick={handleJoinAndEnter} className="flex-1">
            <LogIn className="w-4 h-4 mr-1" />
            Join
          </Button>
        )}

        {isOwner && onSettings && (
          <Button variant="ghost" size="icon" onClick={onSettings} className="h-9 w-9">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}


