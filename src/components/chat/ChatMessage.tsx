import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/lib/firebaseOperations';
import { CustomAvatar } from '@/components/CustomAvatar';
import PetAnimation from '@/components/PetAnimation';
import { STORE_ITEMS } from '@/lib/firebaseOperations';
import { Store, Check, CheckCheck, Clock, Shield } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType & { senderRole?: 'user' | 'merchant' | 'mentor' | 'admin' | 'staff'; senderIsAdmin?: boolean; senderIsMentor?: boolean };
  isOwn: boolean;
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
function getUsernameColor(message: ChatMessageProps['message'] & { senderMerchantLevel?: string; senderIsStaff?: boolean; senderRole?: 'user' | 'merchant' | 'mentor' | 'admin' | 'staff' }): string {
  // staff first
  if (message.senderIsStaff || message.senderRole === 'staff') return 'text-black';
  if (message.senderIsAdmin || message.senderRole === 'admin') return 'text-destructive';
  if (message.senderIsMentor || message.senderRole === 'mentor') return 'text-pink-500';
  if (message.senderIsMerchant || message.senderRole === 'merchant') {
    // Pro merchant = gold, standard merchant = purple
    if ((message as any).senderMerchantLevel === 'pro') return 'text-gold';
    return 'text-violet-500';
  }
  return 'text-sky-500';
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isAdmin = message.senderIsAdmin || message.senderRole === 'admin';
  const isMerchant = message.senderIsMerchant || message.senderRole === 'merchant';

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
              {
                // Parse rest for <pet:petId> and <asset:assetId> tokens and render inline animations
                (() => {
                  const parts: React.ReactNode[] = [];
                  const tokenRegex = /<(pet|asset):([a-z0-9-_]+)>/ig;
                  let lastIndex = 0;
                  let m: RegExpExecArray | null;
                  while ((m = tokenRegex.exec(rest)) !== null) {
                    const idx = m.index;
                    const token = m[0];
                    const type = m[1];
                    const id = m[2];
                    if (idx > lastIndex) {
                      parts.push(<span key={`t-${lastIndex}`}>{rest.slice(lastIndex, idx)}</span>);
                    }

                    if (type === 'pet') {
                      const pet = STORE_ITEMS.find(i => i.id === id && i.type === 'pet');
                      if (pet && pet.animationData) {
                        parts.push(
                          <span key={`pet-${id}`} className="inline-flex items-center mx-1 align-middle">
                            <PetAnimation animationData={pet.animationData} size={24} />
                          </span>
                        );
                      } else {
                        parts.push(<span key={`pet-${id}`}>{pet ? pet.name : id}</span>);
                      }
                    } else {
                      const asset = STORE_ITEMS.find(i => i.id === id && i.type === 'asset');
                      if (asset && asset.animationData) {
                        parts.push(
                          <span key={`asset-${id}`} className="inline-flex items-center mx-1 align-middle">
                            <PetAnimation animationData={asset.animationData} size={24} />
                          </span>
                        );
                      } else {
                        parts.push(<span key={`asset-${id}`}>{asset ? asset.name : id}</span>);
                      }
                    }

                    lastIndex = idx + token.length;
                  }
                  if (lastIndex < rest.length) parts.push(<span key={`t-end`}>{rest.slice(lastIndex)}</span>);
                  return parts;
                })()
              }
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
        <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
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
          {message.content}
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
    const isPrivate = (message as any).targetUserId !== undefined;
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
                ? "bg-muted/30 border border-muted/50 text-muted-foreground italic"
                : "bg-secondary/10"
            )}
          >
            {isPrivate && <span className="text-xs mr-1">🔒</span>}
            <div
              className="text-sm break-words"
              style={{ color: isPrivate ? '#db2777' : '#2d7d95', whiteSpace: 'normal' }}
            >
              <span
                className="font-semibold break-words"
                style={{ color: isPrivate ? '#db2777' : '#84ae35' }}
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

  // A message is considered private if it has a targetUserId property
  const isPrivateMessage = (message as any).targetUserId !== undefined;

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
            // private messages should look muted and pink
            isPrivateMessage && "bg-muted/30 border border-muted/50 italic"
          )}
        >
          {/* Icons removed: use color only for admin/merchant distinction */}

          <span className={cn("text-xs font-semibold whitespace-nowrap", usernameColor)}>
            {message.senderName.toLowerCase()}:
          </span>

          <span
            className={cn(
              "text-sm break-words",
              isPrivateMessage ? "text-pink-500" : "text-foreground",
              !isOwn && "ml-1"
            )}
          >
            {message.content}
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
