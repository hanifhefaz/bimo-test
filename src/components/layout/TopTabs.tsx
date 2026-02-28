import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MessageCircle, Store, Trophy, Compass, Gift, User, X, Mail, Star, List, BellRingIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRoomTabs } from '@/contexts/RoomTabsContext';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const mainTabs = [
  { id: 'home', path: '/', icon: Home, label: 'Home' },
  { id: 'friends', path: '/friends', icon: Users, label: 'Friends' },
  { id: 'chatrooms', path: '/chatrooms', icon: MessageCircle, label: 'Rooms' },
  { id: 'people', path: '/people', icon: List, label: 'People' },
  { id: 'contests', path: '/contests', icon: Star, label: 'Contests' },
  { id: 'store', path: '/store', icon: Store, label: 'Store' },
  { id: 'leaderboards', path: '/leaderboards', icon: Trophy, label: 'Ranks' },
  { id: 'profile', path: '/profile', icon: User, label: 'My Profile' },
  { id: 'news', path: '/news', icon: BellRingIcon, label: 'News' },
//   { id: 'daily', path: '/daily-spin', icon: Gift, label: 'Daily Spin' },
  { id: 'help', path: '/help', icon: Compass, label: 'Help' },
];

export function TopTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTabs, activeTab, setActiveTab, closeRoomTab, closePrivateChatTab } = useRoomTabs();
  const { userProfile } = useAuth();

  const handleTabClick = (tabId: string, path?: string) => {
    setActiveTab(tabId);
    if (path) {
      navigate(path);
    } else {
      // Check if it's a private chat tab
      const tab = openTabs.find(t => t.id === tabId);
      if (tab?.isPrivateChat && tab.friendId) {
        navigate(`/messages/${tabId}?friendId=${tab.friendId}`);
      } else {
        // It's a room tab
        navigate(`/chat/${tabId}`);
      }
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tab: typeof openTabs[0]) => {
    e.stopPropagation();

    if (tab.isPrivateChat) {
      // Close private chat tab
      closePrivateChatTab(tab.id);
    } else {
      // Close room tab - pass user info to leave the room properly
      if (userProfile) {
        closeRoomTab(tab.id, userProfile.uid, userProfile.username);
      } else {
        closeRoomTab(tab.id);
      }
    }
    navigate('/');
  };

  // Determine which tab is active based on current route
  const currentPath = location.pathname;
  const isRoomPath = currentPath.startsWith('/chat/');
  const isPrivateMessagePath = currentPath.startsWith('/messages/');
  const currentRoomId = isRoomPath ? currentPath.split('/chat/')[1] : null;
  const currentConversationId = isPrivateMessagePath ? currentPath.split('/messages/')[1]?.split('?')[0] : null;


  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <ScrollArea className="w-full">
        <div className="flex items-center h-11 w-full max-w-4xl mx-auto px-2 gap-1">
          {/* Main Navigation Tabs */}
          {mainTabs.map((tab) => {
            const isActive = !isRoomPath && !isPrivateMessagePath && (
              currentPath === tab.path ||
              (tab.path !== '/' && currentPath.startsWith(tab.path))
            );


            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.path)}
                className={cn(
                  "flex-1 md:flex-initial flex items-center gap-1 px-2 md:px-3 py-2 md:py-1.5 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap justify-center md:justify-start relative -mb-px",
                  isActive
                    ? "bg-primary text-primary-foreground border-b-2 border-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border-b-2 border-transparent"
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 md:w-3.5 md:h-3.5" />
                <span className={cn("ml-1 overflow-hidden transition-all", isActive ? "inline" : "hidden md:inline")}>{tab.label}</span>
              </button>
            );
          })}

          {/* Separator if there are room tabs */}
          {openTabs.length > 0 && (
            <div className="w-px h-6 bg-border mx-1" />
          )}

          {/* Dynamic Room & Private Chat Tabs */}
          <AnimatePresence>
            {openTabs.map((tab) => {
              const isActive = tab.isPrivateChat
                ? currentConversationId === tab.id
                : currentRoomId === tab.id;
              const Icon = tab.isPrivateChat ? Mail : MessageCircle;

              return (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, scale: 0.8, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={{ opacity: 0, scale: 0.8, width: 0 }}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "flex-1 md:flex-initial flex items-center gap-1 px-2 md:px-3 py-2 md:py-1.5 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap relative -mb-px",
                    isActive
                      ? tab.isPrivateChat
                        ? "bg-success/80 text-success-foreground border-b-2 border-success shadow-sm"
                        : "bg-accent text-accent-foreground border-b-2 border-accent shadow-sm"
                      : tab.hasUnread
                        ? "bg-primary/20 text-primary animate-pulse border-b-2 border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted border-b-2 border-transparent"
                  )}
                >
                  <Icon className="w-5 h-5 md:w-3.5 md:h-3.5" />
                  <span className={cn("ml-1 max-w-[80px] truncate overflow-hidden transition-all", isActive ? "inline" : "hidden md:inline")}>{tab.name}</span>
                  {/* Close button - always visible on mobile when active */}
                  <button
                    onClick={(e) => handleCloseTab(e, tab)}
                    className={cn(
                      "ml-1 p-0.5 rounded-full hover:bg-foreground/10",
                      isActive ? "inline-flex" : "hidden md:inline-flex"
                    )}
                    title={tab.isPrivateChat ? "Close Chat" : "Close & Leave Room"}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {tab.hasUnread && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
