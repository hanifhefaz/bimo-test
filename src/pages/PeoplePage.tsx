import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Eye } from 'lucide-react';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/contexts/AuthContext';
import { getBadgeForLevel } from '@/lib/badges';
import { presenceToColorClass, presenceLabel } from '@/lib/utils';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'admins', label: 'System Admins' },
  { id: 'chatAdmins', label: 'Global Admins' },
  { id: 'staff', label: 'Staff' },
  { id: 'merchants', label: 'Merchants' },
  { id: 'mentors', label: 'Mentors' },
];


export default function PeoplePage() {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [chatAdmins, setChatAdmins] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const navigate = useNavigate();

  // Helper to detect active merchant/mentor status
  const now = Date.now();
  const merchantActive = (u: UserProfile) => !!u.isMerchant && (!u.merchantExpiry || u.merchantExpiry > now);
  const mentorActive = (u: UserProfile) => !!u.isMentor && (!u.mentorExpiry || u.mentorExpiry > now);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(query(usersRef, orderBy('username')));
        const all: UserProfile[] = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) } as UserProfile));
        // regular/full admins should not include chat-only admins
        setAdmins(all.filter(u => u.isAdmin && !u.isChatAdmin));
        setChatAdmins(all.filter(u => u.isChatAdmin));
        setStaff(all.filter(u => u.isStaff));
        // merchants should exclude anyone who is also an active mentor
        setMerchants(all.filter(u => merchantActive(u) && !mentorActive(u)));
        setMentors(all.filter(mentorActive));
      } catch (err) {
        console.error('Failed to load People page users', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderUserList = (users: UserProfile[]) => {
    if (users.length === 0) {
      return <p className="p-3 text-sm text-muted-foreground">No users found</p>;
    }

    const listContent = (
      <div className="space-y-2">
        {users.map((user, index) => {
          const badge = getBadgeForLevel(user.level);
          const rankEmoji = index === 0 ? '1️⃣' : index === 1 ? '2️⃣' : index === 2 ? '3️⃣' : String(index + 1);

          return (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center gap-2 p-1 rounded-xl bg-primary/10 border border-primary/30`}
            >
              <span className="w-8 text-center font-bold text-xl">{rankEmoji}</span>
              <div className="relative inline-block mb-2">
                <div className="relative">
                  <CustomAvatar
                    avatar={user.avatar}
                    imageUrl={user.profileImageUrl}
                    avatarItems={user.avatarItems}
                    size="md"
                  />
                  <span
                    role="status"
                    title={presenceLabel(user.presence || (user.isOnline ? 'online' : 'offline'))}
                    className={`absolute bottom-0 right-0 z-20 pointer-events-none w-4 h-4 rounded-full border-2 border-background ${presenceToColorClass(user.presence || (user.isOnline ? 'online' : 'offline'))}`}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Username user={user} className="font-medium" />
                  <span className={`text-xs ${badge.color}`}>{badge.emoji}</span>
                </div>
              </div>
              <button
                className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-muted"
                onClick={() => navigate(`/user/${user.uid}`)}
                title="View Profile"
              >
                <Eye className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>
    );

    return (
      <ScrollArea className="max-h-[500px]">
        {listContent}
      </ScrollArea>
    );
  };

  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            People
          </h1>
          <p className="text-muted-foreground text-sm">
            Browse all user categories: admins, chat admins, staff, merchants, mentors.
          </p>
        </motion.div>
        <div className="divide-y divide-border">
          {categories.map((cat) => (
            <div key={cat.id} className="py-4">
              <h2 className="text-lg font-semibold p-2">{cat.label}</h2>
              {cat.id === 'admins' && renderUserList(admins)}
              {cat.id === 'chatAdmins' && renderUserList(chatAdmins)}
              {cat.id === 'staff' && renderUserList(staff)}
              {cat.id === 'merchants' && renderUserList(merchants)}
              {cat.id === 'mentors' && renderUserList(mentors)}
            </div>
          ))}
        </div>
      </div>
    </NewAppLayout>
  );
}
