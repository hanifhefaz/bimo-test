import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/lib/firebaseOperations';
import { CustomAvatar } from '@/components/CustomAvatar';
import PetAnimation from '@/components/PetAnimation';
import { STORE_ITEMS, COMPANION_ITEMS } from '@/lib/firebaseOperations';
import { Store, Check, CheckCheck, Clock, Shield } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType & {
    senderRole?: 'user' | 'merchant' | 'mentor' | 'admin' | 'staff' | 'chatadmin';
    senderIsAdmin?: boolean;
    senderIsMentor?: boolean;
    senderIsChatAdmin?: boolean;
  };
  isOwn: boolean;
  isMentionedToMe?: boolean;
}

function MessageDeliveryStatus({ status }: { status?: string }) {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-muted-foreground/50" />;
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-primary" />;
    default:
      return <Check className="w-3 h-3 text-muted-foreground" />;
  }
}

// Get username color based on role - universal across all chats
function getUsernameColor(message: ChatMessageProps['message'] & { senderMerchantLevel?: string; senderIsStaff?: boolean; senderRole?: 'user' | 'merchant' | 'mentor' | 'admin' | 'staff' | 'chatadmin' }): string {
  // staff first
  if (message.senderIsStaff || message.senderRole === 'staff') return 'text-accent';
  if (message.senderIsAdmin || message.senderRole === 'admin') return 'text-destructive';
  if (message.senderIsChatAdmin || message.senderRole === 'chatadmin') return 'text-yellow-500';
  if (message.senderIsMentor || message.senderRole === 'mentor') return 'text-pink-500';
  if (message.senderIsMerchant || message.senderRole === 'merchant') {
    // Pro merchant = gold, standard merchant = purple
    if ((message as any).senderMerchantLevel === 'pro') return 'text-violet-700';
    return 'text-violet-500';
  }
  return 'text-sky-500';
}

function renderMessageContentWithMentions(content: string, mentionUsernames: string[] = []): React.ReactNode {
  if (!mentionUsernames.length) return content;

  const uniqueUsernames = Array.from(new Set(mentionUsernames.filter(Boolean)));
  const pattern = uniqueUsernames.map((username) => username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!pattern) return content;

  const splitRegex = new RegExp(`(@(?:${pattern}))`, 'gi');
  const matchRegex = new RegExp(`^@(?:${pattern})$`, 'i');
  const parts = content.split(splitRegex);

  return parts.map((part, index) => {
    if (matchRegex.test(part)) {
      return (
        <span key={`mention-${index}`} className="font-semibold text-primary">
          {part}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

export function ChatMessage({ message, isOwn, isMentionedToMe = false }: ChatMessageProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isAdmin = message.senderIsAdmin || message.senderRole === 'admin';
  const isChatAdmin = message.senderIsChatAdmin || message.senderRole === 'chatadmin';
  const isMerchant = message.senderIsMerchant || message.senderRole === 'merchant';
  const isPrivateMessage = (message as any).targetUserId !== undefined;
  const isPrivateBotMessage = isPrivateMessage && message.senderId === 'bot';

  const renderInlineTokens = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const tokenRegex = /<(pet|asset|companion):([a-z0-9-_]+)>/ig;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(text)) !== null) {
      const idx = m.index;
      const token = m[0];
      const type = m[1].toLowerCase();
      const id = m[2];
      if (idx > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, idx)}</span>);
      }

      if (type === 'pet') {
        const pet = STORE_ITEMS.find(i => i.id === id && i.type === 'pet');
        if (pet?.animationData) {
          parts.push(
            <span key={`pet-${id}-${idx}`} className="inline-flex items-center mx-1 align-middle">
              <PetAnimation animationData={pet.animationData} size={24} />
            </span>
          );
        } else {
          parts.push(<span key={`pet-${id}-${idx}`}>{pet ? pet.name : id}</span>);
        }
      } else if (type === 'asset') {
        const asset = STORE_ITEMS.find(i => i.id === id && i.type === 'asset');
        if (asset?.animationData) {
          parts.push(
            <span key={`asset-${id}-${idx}`} className="inline-flex items-center mx-1 align-middle">
              <PetAnimation animationData={asset.animationData} size={24} />
            </span>
          );
        } else {
          parts.push(<span key={`asset-${id}-${idx}`}>{asset ? asset.name : id}</span>);
        }
      } else {
        const companion = COMPANION_ITEMS.find(i => i.id === id);
        if (companion?.animationData) {
          parts.push(
            <span key={`companion-${id}-${idx}`} className="inline-flex items-center mx-1 align-middle">
              <PetAnimation animationData={companion.animationData} size={24} />
            </span>
          );
        } else {
          parts.push(
            <span key={`companion-${id}-${idx}`}>
              {companion ? `${companion.emoji} ${companion.name}` : id}
            </span>
          );
        }
      }

      lastIndex = idx + token.length;
    }
    if (lastIndex < text.length) parts.push(<span key="t-end">{text.slice(lastIndex)}</span>);
    return parts;
  };

  if (message.type === 'system') {
    // If the system message looks like "RoomName: Announcement...", render it left-aligned
    const match = (message.content || '').toString().match(/^\s*(.+?):\s*(.*)$/);
    if (match) {
      const roomName = match[1];
      const rest = match[2];
      return (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 px-2 flex justify-start"
          dir="ltr"
        >
          <div className="inline-block rounded-xl px-3 py-2 bg-secondary/30 border border-white/5 max-w-[90%] break-words">
            <span className="text-xs font-semibold text-destructive mr-2 whitespace-nowrap">{roomName}:</span>
            <span className="text-sm text-foreground break-words">
              {renderInlineTokens(rest)}
            </span>
          </div>
        </motion.div>
      );
    }

    // Fallback: center generic system messages
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <span className="text-caption text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </motion.div>
    );
  }

  if (message.type === 'action') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <span className="text-sm text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
          {renderInlineTokens(String(message.content || ''))}
        </span>
      </motion.div>
    );
  }

  if (message.type === 'gift') {
    const isPrivate = (message as any).targetUserId !== undefined;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-3"
      >
      <div className={cn(
        "px-4 py-2 rounded-xl text-center",
        isPrivate ? "bg-muted/30 border border-muted/50 text-muted-foreground italic" : "bg-secondary/10"
      )}>
        {isPrivate && <span className="text-xs mr-1">🔒</span>}
        <span className="text-pink-500">{message.content}</span>
      </div>
      </motion.div>
    );
  }

  if (message.type === 'game') {
    const isPrivate = isPrivateMessage;
    const isBotPrivate = isPrivate && message.senderId === 'bot';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: isBotPrivate ? 1.3 : 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center my-2"
      >
          <div
            className={cn(
              "px-4 py-2 rounded-xl text-sm whitespace-pre-line max-w-[80vw] break-words",
              isPrivate
                ? (isBotPrivate ? "bg-secondary/10 border border-primary/20" : "bg-muted/30 border border-muted/50 text-muted-foreground italic")
                : "bg-secondary/10"
            )}
          >
            {isPrivate && <span className="text-xs mr-1">🔒</span>}
            <div
              className="text-sm break-words"
              style={{ color: isBotPrivate ? '#2d7d95' : (isPrivate ? '#db2777' : '#2d7d95'), whiteSpace: 'normal' }}
            >
              <span
                className="font-semibold break-words"
                style={{ color: isBotPrivate ? '#84ae35' : (isPrivate ? '#db2777' : '#84ae35') }}
              >
                {message.senderName}:
              </span>{' '}
              {message.content}
            </div>
          </div>
      </motion.div>
    );
  }

  const usernameColor = getUsernameColor(message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2 px-2 flex justify-start"
    >
      <div className="flex inline-flex gap-2 items-end">

        {/* 🔧 FIXED OWN MESSAGE LAYOUT */}
        <div
          className={cn(
            isOwn
              ? "inline-flex items-baseline gap-1.5 rounded-xl"
              : "inline-block rounded-xl",
            isPrivateBotMessage
              ? "bg-secondary/10 border border-primary/20"
              : (isPrivateMessage ? "bg-muted/30 border border-muted/50 italic" : "")
          )}
        >
          {/* Icons removed: use color only for admin/merchant distinction */}

          <span className={cn("text-xs font-semibold whitespace-nowrap", usernameColor)}>
            {message.senderName.toLowerCase()}:
          </span>

          <span
            className={cn(
              "break-words",
              isMentionedToMe ? "text-base font-semibold text-primary" : "text-sm",
              isPrivateBotMessage ? "text-[#2d7d95]" : (isPrivateMessage ? "text-pink-500" : "text-foreground"),
              !isOwn && "ml-1"
            )}
          >
            {renderMessageContentWithMentions(message.content, message.mentionUsernames || [])}
          </span>
        </div>

        {isOwn && (
          <div className="flex items-center gap-1 mt-0.5">
            <MessageDeliveryStatus status={(message as any).status || 'sent'} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

