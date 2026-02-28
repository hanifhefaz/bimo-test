import { useAuth } from "@/contexts/AuthContext";
import { CustomAvatar } from "@/components/CustomAvatar";
import { CreditDisplay } from "@/components/ui/CreditDisplay";
import { LevelBadge } from "@/components/ui/LevelBadge";
import Username from '@/components/Username';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const TopHeader = () => {
  const { userProfile, logout } = useAuth();

  if (!userProfile) return null;

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <CustomAvatar
            avatar={userProfile.avatar}
            imageUrl={userProfile.profileImageUrl}
            avatarItems={userProfile.avatarItems}
            size="md"
          />
          <div className="flex flex-col">
            <span className="font-display font-semibold">
              <Username user={userProfile} />
            </span>
            <LevelBadge level={userProfile.level} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CreditDisplay amount={userProfile.credits} />
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
