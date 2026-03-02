import { Link, useLocation } from 'react-router-dom';
import { Home, Users, MessageCircle, Store, TrophyIcon, ShipWheelIcon, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/chatrooms', icon: MessageCircle, label: 'Rooms' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/store', icon: Store, label: 'Store' },
  { path: '/leaderboards', icon: TrophyIcon, label: 'Ranks' },
  { path: '/daily-spin', icon: ShipWheelIcon, label: 'Spin' },
  { path: '/help', icon: Globe, label: 'Help' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/10 md:hidden">
      <div className="flex items-center justify-around h-17 pb-[max(0.25rem,env(safe-area-inset-bottom))] w-full max-w-4xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="tap-target relative flex flex-col items-center justify-center w-full h-full min-h-[48px]"
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-colors duration-200 border",
                  isActive ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-1 bg-primary/5 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
