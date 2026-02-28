import { useAuth } from '@/contexts/AuthContext';
import { Coins, User, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LogoImg from '@/assets/icon.png';
import BrandImg from '@/assets/brand.png';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomAvatar } from '@/components/CustomAvatar';
import { formatShortNumber, formatWithCommas } from '@/lib/utils';

export function Header() {
  const { userProfile, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
      <div className="flex items-center justify-between h-14 w-full max-w-4xl mx-auto px-4">
        <Link to="/" className="flex items-center gap-2">
        <motion.div
          className="w-8 h-8" // adjust size as needed
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <img src={LogoImg} alt="Bimo Logo" className="w-full h-full object-contain" />
        </motion.div>
          <motion.div className="w-12 h-12 hidden sm:block">
            <img
              src={BrandImg}
              alt="Bimo Logo"
              className="w-full h-full object-contain"
            />
          </motion.div>

          {/* <span className="font-display font-bold text-lg text-gradient-primary">Bimo</span> */}
        </Link>

        {userProfile && (
          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/30"
              whileHover={{ scale: 1.05 }}
            >
              <Coins className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-success">{formatWithCommas(userProfile.credits)} USD</span>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <CustomAvatar
                    avatar={userProfile.avatar}
                    imageUrl={userProfile.profileImageUrl}
                    avatarItems={userProfile.avatarItems}
                    size="md"
                    className="w-8 h-8"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass border-white/10">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
