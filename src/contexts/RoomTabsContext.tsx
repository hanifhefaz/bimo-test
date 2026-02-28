import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveChatroom, sendMessage, subscribeToMessages, ChatMessage as ChatMessageType, getUsersByIds } from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { ref, remove } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { toast } from 'sonner';

export interface RoomTab {
  id: string;
  name: string;
  hasUnread: boolean;
  isPrivateChat?: boolean;
  friendId?: string;
}

interface RoomTabsContextType {
  openTabs: RoomTab[];
  activeTab: string;
  openRoomTab: (roomId: string, roomName: string) => void;
  openPrivateChatTab: (conversationId: string, friendName: string, friendId: string) => void;
  closeRoomTab: (roomId: string, userId?: string, username?: string) => void;
  closePrivateChatTab: (conversationId: string) => void;
  setActiveTab: (tabId: string) => void;
  markTabAsRead: (roomId: string) => void;
  markTabAsUnread: (roomId: string) => void;
  getRoomMessages: (roomId: string) => ChatMessageType[];
  clearRoomCache: (roomId: string) => void;
}

const RoomTabsContext = createContext<RoomTabsContextType | undefined>(undefined);

export function RoomTabsProvider({ children }: { children: ReactNode }) {
  const [openTabs, setOpenTabs] = useState<RoomTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessageType[]>>({});
  const subsRef = useRef<Record<string, () => void>>({});
  const joinTimesRef = useRef<Record<string, number>>({});
  const { userProfile } = useAuth();
  const activeTabRef = useRef<string>(activeTab);
  const isMountedRef = useRef<boolean>(true);

  // keep ref in sync for subscription handlers
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up all subscriptions on unmount
      Object.values(subsRef.current).forEach(unsub => {
        try { unsub(); } catch (e) { /* ignore */ }
      });
      subsRef.current = {};
    };
  }, []);

  const openRoomTab = useCallback((roomId: string, roomName: string) => {
    setOpenTabs(prev => {
      const exists = prev.find(t => t.id === roomId);
      if (exists) return prev;
      return [...prev, { id: roomId, name: roomName, hasUnread: false }];
    });
    setActiveTab(roomId);

    // Subscribe to messages for this room and cache them
    if (!subsRef.current[roomId]) {
      // Record join time for this subscription (used to avoid showing earlier history)
      // Subtract a small grace period so announcements sent just before navigation (e.g., join announcements)
      // are still visible to the joining user.
      joinTimesRef.current[roomId] = Date.now() - 5000; // 5s grace window

      const unsubscribe = subscribeToMessages(roomId, async (msgs) => {
        if (!isMountedRef.current) return;

        const joinTime = joinTimesRef.current[roomId] || 0;
        let filtered = msgs.filter(m => {
          if (m.timestamp < joinTime) return false;
          // If message has a targetUserId (private) ignore unless it's for us
          const anyM = m as any;
          if (anyM.targetUserId && userProfile && anyM.targetUserId !== userProfile.uid) return false;
          return true;
        });

        // Enrich with role flags if missing (merchant/admin/mentor/staff and merchantLevel)
        try {
          const missingIds = Array.from(new Set(filtered
            .filter(m => m.senderId && (m.senderIsMerchant === undefined && m.senderIsMentor === undefined && m.senderIsAdmin === undefined && m.senderIsStaff === undefined))
            .map(m => m.senderId)));
          if (missingIds.length > 0) {
            const profiles = await getUsersByIds(missingIds) as UserProfile[];
            const profileMap = new Map(profiles.map(p => [p.uid, p] as [string, UserProfile]));
            filtered = filtered.map(m => {
              const p = profileMap.get(m.senderId);
              if (!p) return m;
              return {
                ...m,
                senderIsMerchant: p.isMerchant,
                senderIsMentor: p.isMentor,
                senderIsAdmin: p.isAdmin,
                senderIsStaff: p.isStaff,
                senderMerchantLevel: (p as any).merchantLevel
              } as typeof m;
            });
          }
        } catch (e) {
          console.error('Failed to enrich room messages with roles:', e);
        }

        // Update cache and detect new private messages for popups (game/gift)
        setMessagesCache(prev => {
          if (!isMountedRef.current) return prev;

          const prevMsgs = prev[roomId] || [];
          const prevIds = new Set(prevMsgs.map(m => m.id));

          for (const m of filtered) {
            const anyM = m as any;
            if (!prevIds.has(m.id) && anyM.targetUserId && userProfile && anyM.targetUserId === userProfile.uid) {
              // Only show popup for game or gift private messages
              if (m.type === 'game') {
                toast.success(m.content || 'You won! 🎉');
              } else if (m.type === 'gift') {
                toast.success(m.content || 'You received a gift! 🎁');
              } else {
                // generic private notification
                toast.success(m.content || 'New notification');
              }
            }
          }

          return { ...prev, [roomId]: filtered };
        });

        // Mark unread if not active — do not auto-clear unread when user switches back.
        if (isMountedRef.current && activeTabRef.current !== roomId) {
          setOpenTabs(prev => prev.map(t => t.id === roomId ? { ...t, hasUnread: true } : t));
        }
      });

      subsRef.current[roomId] = unsubscribe;
    }
  }, [activeTab, userProfile]);

  const closeRoomTab = useCallback(async (roomId: string, userId?: string, username?: string) => {
    // If user info is provided, leave the room
    if (userId && username) {
      try {
        await leaveChatroom(roomId, userId);
        const tab = openTabs.find(t => t.id === roomId);
        const roomName = tab?.name || 'Room';
        sendMessage(roomId, {
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '📢',
          content: `${roomName}: ${username} [${userProfile.level}] left the room`,
          type: 'system'
        });

        // Clear the bot notification marker for this user so they will be reminded
        // again only after they fully leave and rejoin the room later.
        try {
          const noteRef = ref(rtdb, `botNotifications/${roomId}/${userId}`);
          await remove(noteRef);
        } catch (e) { /* ignore */ }
      } catch (error) {
        console.error('Failed to leave room:', error);
      }
    }

    // Unsubscribe and clear cached messages
    if (subsRef.current[roomId]) {
      try { subsRef.current[roomId](); } catch (e) { /* ignore */ }
      delete subsRef.current[roomId];
    }
    setMessagesCache(prev => {
      const copy = { ...prev };
      delete copy[roomId];
      return copy;
    });

    setOpenTabs(prev => prev.filter(t => t.id !== roomId));
    setActiveTab(prev => prev === roomId ? 'home' : prev);
  }, [openTabs]);

  // Open private chat as a tab
  const openPrivateChatTab = useCallback((conversationId: string, friendName: string, friendId: string) => {
    setOpenTabs(prev => {
      const exists = prev.find(t => t.id === conversationId);
      if (exists) return prev;
      return [...prev, {
        id: conversationId,
        name: friendName,
        hasUnread: false,
        isPrivateChat: true,
        friendId
      }];
    });
    setActiveTab(conversationId);
  }, []);

  // Update private chat tab unread status based on userProfile.unreadMessages
  useEffect(() => {
    if (!userProfile?.unreadMessages) return;

    setOpenTabs(prev => prev.map(tab => {
      if (tab.isPrivateChat) {
        const unreadCount = userProfile.unreadMessages?.[tab.id] || 0;
        const isCurrentlyActive = activeTabRef.current === tab.id;
        // Mark as unread if there are unread messages and the tab is not active
        return { ...tab, hasUnread: unreadCount > 0 && !isCurrentlyActive };
      }
      return tab;
    }));
  }, [userProfile?.unreadMessages]);

  // Close private chat tab (no room leave needed)
  const closePrivateChatTab = useCallback((conversationId: string) => {
    setOpenTabs(prev => prev.filter(t => t.id !== conversationId));
    setActiveTab(prev => prev === conversationId ? 'home' : prev);
  }, []);

  const markTabAsRead = useCallback((roomId: string) => {
    setOpenTabs(prev => prev.map(t =>
      t.id === roomId ? { ...t, hasUnread: false } : t
    ));
  }, []);

  const markTabAsUnread = useCallback((roomId: string) => {
    setOpenTabs(prev => prev.map(t =>
      t.id === roomId ? { ...t, hasUnread: true } : t
    ));
  }, []);

  const getRoomMessages = useCallback((roomId: string) => {
    return messagesCache[roomId] || [];
  }, [messagesCache]);

  const clearRoomCache = useCallback((roomId: string) => {
    // Unsubscribe if present then remove cache
    if (subsRef.current[roomId]) {
      try { subsRef.current[roomId](); } catch (e) { /* ignore */ }
      delete subsRef.current[roomId];
    }
    setMessagesCache(prev => {
      const copy = { ...prev };
      delete copy[roomId];
      return copy;
    });
  }, []);

  // Navigate helper (stable identity from react-router)
  const navigate = useNavigate();

  // Listen for global logout events to ensure tabs are cleared and user is navigated away
  useEffect(() => {
    const handler = () => {
      // Clear subscriptions and cached messages
      Object.values(subsRef.current).forEach(unsub => {
        try { unsub(); } catch (e) { /* ignore */ }
      });
      subsRef.current = {};
      setMessagesCache({});
      setOpenTabs([]);
      setActiveTab('home');
      joinTimesRef.current = {};

      // Navigate to home page
      try {
        navigate('/');
      } catch (e) {
        // fallback: update history
        try { window.history.replaceState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) { /* ignore */ }
      }
    };

    window.addEventListener('app:logout', handler);
    return () => window.removeEventListener('app:logout', handler);
  }, [navigate]);

  return (
    <RoomTabsContext.Provider value={{
      openTabs,
      activeTab,
      openRoomTab,
      openPrivateChatTab,
      closeRoomTab,
      closePrivateChatTab,
      setActiveTab,
      markTabAsRead,
      markTabAsUnread,
      getRoomMessages,
      clearRoomCache
    }}>
      {children}
    </RoomTabsContext.Provider>
  );
}

export function useRoomTabs() {
  const context = useContext(RoomTabsContext);
  if (!context) {
    throw new Error('useRoomTabs must be used within a RoomTabsProvider');
  }
  return context;
}
