import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Users, MessageCircle, Shield, Crown, Eye, UserPlus, UserCheck } from 'lucide-react';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import PetAnimation from '@/components/PetAnimation';
import { getUserById, getPrivateConversationId, subscribeToRoomParticipants, getMostExpensivePet, sendFriendRequest } from '@/lib/firebaseOperations';
import { presenceToColorClass, presenceLabel, isFriendRequestPending } from '@/lib/utils';
import { UserProfile } from '@/contexts/AuthContext';
import { getBadgeForLevel } from '@/lib/badges';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { toast } from 'sonner';

interface RoomUsersListProps {
  roomId: string;
  participants: string[];
  ownerId: string;
  moderators: string[];
}

interface PresenceMap {
  [key: string]: 'online' | 'away' | 'busy' | 'offline';
}

export function RoomUsersList({ roomId, participants: initialParticipants, ownerId, moderators }: RoomUsersListProps) {
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [participants, setParticipants] = useState<string[]>(initialParticipants);
  const [onlineStatus, setOnlineStatus] = useState<PresenceMap>({});
  const [loading, setLoading] = useState(true);
  const [sendingRequests, setSendingRequests] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Subscribe to real-time participant updates
    const unsubscribe = subscribeToRoomParticipants(roomId, (updatedParticipants) => {
      setParticipants(updatedParticipants);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    loadUsers();
    // Subscribe to online status
    const statusRefs: { [key: string]: any } = {};

    participants.forEach(uid => {
      const statusRef = ref(rtdb, `status/${uid}`);
      statusRefs[uid] = statusRef;
      onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        const presenceVal: 'online'|'away'|'busy'|'offline' = data?.presence || (data?.isOnline ? 'online' : 'offline');
        setOnlineStatus(prev => ({
          ...prev,
          [uid]: presenceVal
        }));
      });
    });

    return () => {
      Object.values(statusRefs).forEach(statusRef => off(statusRef));
    };
  }, [participants]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userPromises = participants.map(uid => getUserById(uid));
      const loadedUsers = await Promise.all(userPromises);
      setUsers(loadedUsers.filter(u => u !== null) as UserProfile[]);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateChat = (userId: string) => {
    if (!userProfile) return;
    const conversationId = getPrivateConversationId(userProfile.uid, userId);
    navigate(`/messages/${conversationId}?friendId=${userId}`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleAddFriend = async (targetId: string) => {
    if (!userProfile) return;
    setSendingRequests(prev => ({ ...prev, [targetId]: true }));

    try {
      const result = await sendFriendRequest(userProfile.uid, targetId);
      if (result.success) {
        toast.success(result.message);
        // update our own profile immediately so UI elsewhere can flip to pending
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      console.error('Failed to send friend request:', e);
      toast.error('Failed to send friend request');
    } finally {
      setSendingRequests(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    // Owner first
    if (a.uid === ownerId) return -1;
    if (b.uid === ownerId) return 1;
    // Then moderators
    if (moderators.includes(a.uid) && !moderators.includes(b.uid)) return -1;
    if (!moderators.includes(a.uid) && moderators.includes(b.uid)) return 1;
    // Then by presence order
    const order: Record<string, number> = { online: 0, away: 1, busy: 2, offline: 3 };
    const pa = onlineStatus[a.uid] || (a.isOnline ? 'online' : 'offline');
    const pb = onlineStatus[b.uid] || (b.isOnline ? 'online' : 'offline');
    if (order[pa] !== order[pb]) return order[pa] - order[pb];
    // Then by level
    return b.level - a.level;
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="glass border-white/10">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Room Members ({participants.length})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-2">
            {sortedUsers.map((user, index) => {
              const badge = getBadgeForLevel(user.level);
              const isOwner = user.uid === ownerId;
              const isMod = moderators.includes(user.uid);
              const presenceVal = onlineStatus[user.uid] || (user.isOnline ? 'online' : 'offline');
              const isSelf = user.uid === userProfile?.uid;
              const expensivePet = getMostExpensivePet(user.pets);

              return (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isOwner ? 'bg-gold/10 border border-gold/30' :
                    isMod ? 'bg-primary/10 border border-primary/30' :
                    'bg-secondary/30'
                  }`}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <CustomAvatar
                      avatar={user.avatar}
                      imageUrl={user.profileImageUrl}
                      avatarItems={user.avatarItems}
                      size="md"
                      className="w-10 h-10 text-lg"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                      presenceToColorClass(presenceVal)
                    }`} />
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {isOwner && <Crown className="w-3 h-3 text-gold" />}
                      {isMod && !isOwner && <Shield className="w-3 h-3 text-primary" />}
                      <Username user={user} className="font-medium truncate" />
                      <span className={`text-xs ${badge.color}`}>{badge.emoji}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{user.level}</span>
                      {expensivePet && (
                        <div className="flex items-center gap-1">
                          <div style={{ width: 20, height: 20 }}>
                            <PetAnimation animationData={expensivePet.pet.animationData} size={20} />
                          </div>
                          <span className="text-xs">{expensivePet.pet.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isSelf && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewProfile(user.uid)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePrivateChat(user.uid)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>

                      {/* Add Friend Button (shows pending/friend states) */}
                      {(() => {
                        const isFriend = userProfile?.friends?.includes(user.uid);
                        const requestSent = isFriendRequestPending(userProfile, user);

                        if (isFriend) {
                          return (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                              <UserCheck className="w-4 h-4 text-success" />
                            </Button>
                          );
                        }

                        if (requestSent) {
                          return (
                            <Button variant="ghost" size="icon" className="h-8 w-20" disabled>
                              <span className="text-xs">Pending</span>
                            </Button>
                          );
                        }

                        return (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleAddFriend(user.uid)}
                            disabled={!!sendingRequests[user.uid]}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        );
                      })()}

                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
