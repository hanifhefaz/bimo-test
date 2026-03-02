import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MessageCircle, Store, Trophy, Compass, User, X, Mail, Star, List, BellRingIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRoomTabs } from '@/contexts/RoomTabsContext';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const mainTabs = [
  { id: 'home', path: '/', icon: Home, label: 'Home' },
  { id: 'chatrooms', path: '/chatrooms', icon: MessageCircle, label: 'Rooms' },
  { id: 'friends', path: '/friends', icon: Users, label: 'Friends' },
  { id: 'people', path: '/people', icon: List, label: 'People' },
  { id: 'contests', path: '/contests', icon: Star, label: 'Contests' },
  { id: 'store', path: '/store', icon: Store, label: 'Store' },
  { id: 'leaderboards', path: '/leaderboards', icon: Trophy, label: 'Ranks' },
  { id: 'news', path: '/news', icon: BellRingIcon, label: 'News' },
  { id: 'profile', path: '/profile', icon: User, label: 'Profile' },
  { id: 'help', path: '/help', icon: Compass, label: 'Help' },
];

export function TopTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTabs, activeTab, setActiveTab, markTabAsRead, closeRoomTab, closePrivateChatTab } = useRoomTabs();
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
        markTabAsRead(tabId);
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
    <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border/80">
      <ScrollArea className="w-full">
        <div className="flex items-center h-12 w-full max-w-4xl mx-auto px-2 gap-1">
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
                  "tap-target group flex-initial flex items-center gap-1.5 px-2.5 md:px-3 py-2 md:py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap justify-center md:justify-start relative min-h-[44px]",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                <span
                  className={cn(
                    "ml-1 transition-all",
                    isActive ? "inline-block max-w-[120px] truncate" : "hidden md:inline"
                  )}
                >
                  {tab.label}
                </span>
                {isActive && <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary" />}
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
                  "tap-target flex-initial flex items-center gap-1 px-2.5 md:px-3 py-2 md:py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap relative min-h-[44px]",
                  isActive
                      ? tab.isPrivateChat
                        ? "bg-success/15 text-success border border-success/30 shadow-sm"
                        : "bg-accent/15 text-accent border border-accent/30 shadow-sm"
                      : (tab.hasUnread && !tab.isPrivateChat)
                        ? "bg-orange-500/20 text-orange-600 border border-orange-500/50 animate-pulse"
                        : tab.hasUnread
                          ? "bg-primary/15 text-primary border border-primary/30 animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                )}
              >
                  <Icon className="w-5 h-5 md:w-3.5 md:h-3.5 shrink-0" />
                  <span
                    className={cn(
                      "ml-1 max-w-[96px] truncate overflow-hidden transition-all",
                      isActive ? "inline-block" : "hidden md:inline"
                    )}
                  >
                    {tab.name}
                  </span>
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
                  {tab.hasUnread && !isActive && tab.isPrivateChat && (
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
