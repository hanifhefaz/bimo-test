import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRoomTabs } from '@/contexts/RoomTabsContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  getUserById,
  getUsersByIds,
  getPrivateConversationId,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  recordMessageSent,
  clearUnreadMessages,
  ChatMessage as ChatMessageType
} from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PrivateMessagesPage() {
  // message type extended with merchant level so UI coloring can read it
  type ChatMessageWithLevel = ChatMessageType & { senderMerchantLevel?: string; senderIsStaff?: boolean };
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { openPrivateChatTab } = useRoomTabs();

  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userProfileRef = useRef(userProfile);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  // Load friend info when conversation opens (only when the conversation/friend changes)
  useEffect(() => {
    if (!conversationId || !friendId || !userProfileRef.current) return;
    // Avoid reloading if we already have the friend data for this id
    if (!friend || friend.uid !== friendId) {
      loadFriend();
    }

    // Clear unread messages when opening the conversation
    clearUnreadMessages(userProfileRef.current.uid, conversationId);
  }, [conversationId, friendId, friend]);

  // Subscribe to private messages for this conversation (do not resubscribe when userProfile changes)
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToPrivateMessages(conversationId, (msgs) => {
      // Enrich messages with sender role flags if missing so username colors render correctly
      (async () => {
        try {
          const missingIds = Array.from(new Set(msgs.filter(m => m.senderId && (m.senderIsMerchant === undefined && m.senderIsMentor === undefined && m.senderIsAdmin === undefined)).map(m => m.senderId)));
          if (missingIds.length > 0) {
            const profiles = await getUsersByIds(missingIds) as UserProfile[];
            const profileMap = new Map(profiles.map(p => [p.uid, p] as [string, UserProfile]));
            const enriched = msgs.map(m => {
              const p = profileMap.get(m.senderId);
              if (!p) return m;
              return {
                ...m,
                senderIsMerchant: p.isMerchant,
                senderIsMentor: p.isMentor,
                senderIsAdmin: p.isAdmin,
                senderMerchantLevel: (p as any).merchantLevel,
                senderIsStaff: p.isStaff
              } as typeof m;
            });
            setMessages(enriched);
          } else {
            setMessages(msgs);
          }
        } catch (e) {
          console.error('Failed to enrich private messages with roles:', e);
          setMessages(msgs);
        }

        scrollToBottom();
        // Clear unread when receiving new messages while in chat
        if (userProfileRef.current) clearUnreadMessages(userProfileRef.current.uid, conversationId);
      })();
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Register this chat as a tab when friend loads
  useEffect(() => {
    if (friend && conversationId && friendId) {
      openPrivateChatTab(conversationId, friend.username, friendId);
    }
  }, [friend, conversationId, friendId, openPrivateChatTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadFriend = async () => {
    if (!friendId) return;
    setLoading(true);
    try {
      const friendData = await getUserById(friendId);
      if (friendData) {
        setFriend(friendData);
      }
    } catch (error) {
      console.error('Failed to load friend:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!userProfile || !conversationId || !friendId) return;

    // Optimistically update UI (include role flags so color is immediate)
    const tempMessage: ChatMessageWithLevel = {
      id: `temp_${Date.now()}`,
      roomId: conversationId,
      senderId: userProfile.uid,
      senderName: userProfile.username,
      senderAvatar: userProfile.avatar,
      senderAvatarItems: userProfile.avatarItems,
      senderIsMerchant: userProfile.isMerchant,
      senderIsMentor: userProfile.isMentor,
      senderIsAdmin: userProfile.isAdmin,
      senderIsStaff: userProfile.isStaff,
      senderMerchantLevel: (userProfile as any).merchantLevel,
      content,
      type: 'message',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    // Send message in background (non-blocking)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendPrivateMessage(conversationId, {
      senderId: userProfile.uid,
      senderName: userProfile.username,
      senderAvatar: userProfile.avatar,
      senderAvatarItems: userProfile.avatarItems,
      senderIsMerchant: userProfile.isMerchant,
      senderIsMentor: userProfile.isMentor,
      senderIsAdmin: userProfile.isAdmin,
      senderIsStaff: userProfile.isStaff,
      senderMerchantLevel: (userProfile as any).merchantLevel,
      clientMessageId: tempMessage.id,
      content,
      type: 'message'
    } as any, friendId);

    // Record message and award 1 XP per 10 messages (non-blocking)
    recordMessageSent(userProfile.uid).catch(console.error);
  }, [userProfile, conversationId, friendId]);

  if (loading || !friend || !userProfile) {
    return (
      <NewAppLayout hideTabs>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </NewAppLayout>
    );
  }

  return (
    <NewAppLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col max-w-4xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <header className="h-12 glass-strong border-b border-border flex items-center px-4 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/friends')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 ml-2">
            <CustomAvatar
              avatar={friend.avatar}
              imageUrl={friend.profileImageUrl}
              avatarItems={friend.avatarItems}
              size="sm"
            />
            <div>
              <h1 className="font-semibold text-sm"><Username user={friend} /></h1>
              <p className="text-xs text-muted-foreground">Level {friend.level}</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-2 sm:p-4">
          <div className="w-full max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={(msg as any).clientMessageId ?? msg.id}
                  message={msg}
                  isOwn={msg.senderId === userProfile.uid}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-0 shrink-0">
          <ChatInput onSend={handleSendMessage} />
        </div>
      </div>
    </NewAppLayout>
  );
}
