import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CustomAvatar } from '@/components/CustomAvatar';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoImg from '@/assets/icon.png';
import BrandImg from '@/assets/brand.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ContestModal from '@/components/chat/ContestModal';
import { formatShortNumber, formatWithCommas } from '@/lib/utils';

export function UserInfoBar() {
  const { userProfile, logout, contestAnnouncement, clearContestAnnouncement } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showContestModal, setShowContestModal] = useState(false);

  useEffect(() => {
    if (contestAnnouncement) {
      setShowContestModal(true);
    }
  }, [contestAnnouncement]);

  if (!userProfile) return null;

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border"
      >
        <div className="flex items-center justify-between h-14 w-full max-w-4xl mx-auto px-3 sm:px-4">
          {/* Left: App Logo */}
          <Link to="/" className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-16 w-16 rounded-md flex items-center justify-center text-white font-bold overflow-hidden">
                <motion.img
                  src={LogoImg}
                  alt="SocialSpark logo"
                  className="h-16 w-16 object-contain"
                  animate={{ scale: [1, 1.05, 1], opacity: [1, 0.98, 1] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
                />
              </div>
              <span className="font-semibold text-sm">
                bimo33
              </span>
            </div>
          </Link>

          {/* Right: Credits + Logout */}
          <div className="flex items-center gap-2">
            <motion.div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 border border-success/30"
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-xs font-semibold text-success">{formatWithCommas(userProfile.credits)} USD</span>
            </motion.div>

            {/* Theme picker (visible to everyone) */}
            <div className="flex items-center mr-1">
              <ThemeSwitcher />
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className='bg-destructive text-white' onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {contestAnnouncement && (
        <ContestModal
          contest={contestAnnouncement}
          open={showContestModal}
          onOpenChange={(open) => {
            setShowContestModal(open);
            if (!open) clearContestAnnouncement();
          }}
        />
      )}
    </>
  );
}
