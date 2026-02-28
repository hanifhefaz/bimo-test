import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { Button } from '@/components/ui/button';
import { CustomAvatar } from '@/components/CustomAvatar';
import Username from '@/components/Username';
import FriendItem from '@/components/FriendItem';
import { UserSearchCard } from '@/components/cards/UserSearchCard';
import { Input } from '@/components/ui/input';
import {
  Search,
  UserPlus,
  Users,
  Bell,
  Check,
  X,
  Loader2,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  searchUsers,
  getUserById,
  getUsersByIds,
  getRecommendedUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  transferCredits,
  subscribeToFriendRequests,
  getPrivateConversationId
} from '@/lib/firebaseOperations';
import { UserProfile } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn, presenceToColorClass, presenceLabel, isFriendRequestPending } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FriendsPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendedUsers, setRecommendedUsers] = useState<UserProfile[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; friend?: UserProfile }>({ open: false });
  const [transferAmount, setTransferAmount] = useState('');
  const [transferUsername, setTransferUsername] = useState('');
  const [transferUsernameConfirm, setTransferUsernameConfirm] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Reload friends only when the friends list changes
  useEffect(() => {
    if (userProfile) {
      loadFriends();
    }
  }, [userProfile?.friends?.join(',')]);

  // Subscribe to friend requests when user id is available
  useEffect(() => {
    if (!userProfile) return;
    const unsubscribe = subscribeToFriendRequests(userProfile.uid, async (requestIds) => {
      const requestProfiles = await getUsersByIds(requestIds);
      setPendingRequests(requestProfiles);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const loadFriends = async () => {
    if (!userProfile) return;
    setLoadingFriends(true);
    try {
      const friendProfiles = await getUsersByIds(userProfile.friends || []);
      setFriends(friendProfiles);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadPendingRequests = async () => {
    if (!userProfile) return;
    const requestProfiles = await getUsersByIds(userProfile.friendRequests || []);
    setPendingRequests(requestProfiles);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !userProfile) return;
    setLoading(true);
    try {
      const results = await searchUsers(searchTerm, userProfile.uid);
      setSearchResults(results);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommended = async () => {
    if (!userProfile) return;
    setLoadingRecommended(true);
    try {
      const recs = await getRecommendedUsers(userProfile, 6);
      setRecommendedUsers(recs);
    } catch (e) {
      // non-fatal
      console.warn('Failed to load recommended users', e);
    } finally {
      setLoadingRecommended(false);
    }
  };

  // Load recommendations when switching to search tab or when profile changes
  useEffect(() => {
    if (tab === 'search') {
      loadRecommended();
    }
  }, [tab, userProfile?.uid, userProfile?.friends?.join(',')]);

  const handleSendRequest = async (userId: string) => {
    if (!userProfile) return;
    try {
      const result = await sendFriendRequest(userProfile.uid, userId);
      if (result.success) {
        toast.success(result.message);
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const [acceptingRequest, setAcceptingRequest] = useState<string | null>(null);

  const handleAcceptRequest = async (friendId: string) => {
    if (!userProfile) return;
    if (acceptingRequest === friendId) return; // Prevent double-click

    setAcceptingRequest(friendId);
    try {
      await acceptFriendRequest(userProfile.uid, friendId);
      // Immediately remove from local state to prevent re-clicking
      setPendingRequests(prev => prev.filter(u => u.uid !== friendId));
      toast.success('Friend added!');
      refreshProfile();
      loadFriends();
    } catch (error) {
      toast.error('Failed to accept request');
      // Reload pending requests on error to restore state
      loadPendingRequests();
    } finally {
      setAcceptingRequest(null);
    }
  };

  const handleDeclineRequest = async (friendId: string) => {
    if (!userProfile) return;
    try {
      await declineFriendRequest(userProfile.uid, friendId);
      toast.success('Request declined');
      refreshProfile();
      loadPendingRequests();
    } catch (error) {
      toast.error('Failed to decline request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!userProfile) return;
    try {
      await removeFriend(userProfile.uid, friendId);
      toast.success('Friend removed');
      refreshProfile();
      loadFriends();
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const handleMessage = (friend: UserProfile) => {
    if (!userProfile) return;
    const conversationId = getPrivateConversationId(userProfile.uid, friend.uid);
    navigate(`/messages/${conversationId}?friendId=${friend.uid}`);
  };

  const handleViewProfile = (friend: UserProfile) => {
    navigate(`/user/${friend.uid}`);
  };

  const handleTransferCredits = async () => {
    if (!userProfile || !transferDialog.friend) return;
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Safety check: username must be entered twice
    if (transferUsername !== transferUsernameConfirm) {
      toast.error('Usernames do not match');
      return;
    }

    if (transferUsername !== transferDialog.friend.username) {
      toast.error('Username does not match recipient');
      return;
    }

    try {
      const result = await transferCredits(userProfile.uid, transferDialog.friend.username, amount);
      if (result.success) {
        toast.success(result.message);
        setTransferDialog({ open: false });
        setTransferAmount('');
        setTransferUsername('');
        setTransferUsernameConfirm('');
        refreshProfile();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Transfer failed');
    }
  };

  if (!userProfile) return null;

  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold mb-4">Friends</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={tab === 'friends' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('friends')}
            >
              <Users className="w-4 h-4 mr-1" />
              Friends ({friends.length})
            </Button>
            <Button
              variant={tab === 'requests' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('requests')}
              className="relative"
            >
              <Bell className="w-4 h-4 mr-1" />
              Requests
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </Button>
            <Button
              variant={tab === 'search' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('search')}
            >
              <Search className="w-4 h-4 mr-1" />
              Find
            </Button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {tab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {loadingFriends ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm">Search for users to add them!</p>
                </div>
              ) : (
                friends.map((friend, i) => {
                  const conversationId = getPrivateConversationId(userProfile.uid, friend.uid);
                  const unreadCount = userProfile.unreadMessages?.[conversationId] || 0;

                  return (
                    <FriendItem
                      key={friend.uid}
                      friend={friend}
                      unreadCount={unreadCount}
                      onMessage={() => handleMessage(friend)}
                      onViewProfile={() => handleViewProfile(friend)}
                      onRemove={() => handleRemoveFriend(friend.uid)}
                      delay={i * 0.05}
                    />
                  );
                })
              )}
            </motion.div>
          )}

          {tab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                pendingRequests.map((user, i) => (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                  >
                    <div className="relative">
                      <CustomAvatar
                        avatar={user.avatar}
                        imageUrl={user.profileImageUrl}
                        avatarItems={user.avatarItems}
                        size="lg"
                      />
                      <span
                        role="status"
                        title={presenceLabel(user.presence || (user.isOnline ? 'online' : 'offline'))}
                        className={cn(
                          'absolute bottom-1 right-1 z-20 pointer-events-none w-3 h-3 rounded-full border-2 border-card',
                          presenceToColorClass(user.presence || (user.isOnline ? 'online' : 'offline'))
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium"><Username user={user} /></div>
                      <div className="text-xs text-muted-foreground">Level {user.level}</div>
                    </div>
                    <Button
                      variant="success"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleAcceptRequest(user.uid)}
                      disabled={acceptingRequest === user.uid}
                    >
                      {acceptingRequest === user.uid ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleDeclineRequest(user.uid)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {tab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Search username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Recommended for you</h3>
                  <Button variant="ghost" size="sm" onClick={loadRecommended} disabled={loadingRecommended}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {loadingRecommended ? 'Loading...' : 'Shuffle'}
                  </Button>
                </div>

                {loadingRecommended ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : (
                  recommendedUsers.map((user, i) => {
                    const isFriend = userProfile.friends.includes(user.uid);
                    const isPending = isFriendRequestPending(userProfile, user);

                    return (
                      <UserSearchCard
                        key={user.uid}
                        user={user}
                        isFriend={isFriend}
                        isPending={isPending}
                        onAddFriend={!isFriend && !isPending ? () => handleSendRequest(user.uid) : undefined}
                        delay={i * 0.05}
                      />
                    );
                  })
                )}

                <hr className="my-2" />

                {searchResults.map((user, i) => {
                  const isFriend = userProfile.friends.includes(user.uid);
                  const isPending = isFriendRequestPending(userProfile, user);

                  return (
                    <UserSearchCard
                      key={user.uid}
                      user={user}
                      isFriend={isFriend}
                      isPending={isPending}
                      onAddFriend={!isFriend && !isPending ? () => handleSendRequest(user.uid) : undefined}
                      delay={i * 0.05}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transfer Dialog with double username confirmation */}
        <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog({ open })}>
          <DialogContent className="glass border-white/10">
            <DialogHeader>
              <DialogTitle>Send Credits to <Username user={transferDialog.friend} /></DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="text-sm text-muted-foreground mb-2">
                For safety, please type the recipient's username twice.
              </div>
              <Input
                placeholder="Enter username"
                value={transferUsername}
                onChange={(e) => setTransferUsername(e.target.value)}
              />
              <Input
                placeholder="Confirm username"
                value={transferUsernameConfirm}
                onChange={(e) => setTransferUsernameConfirm(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              {transferUsername && transferUsernameConfirm && transferUsername !== transferUsernameConfirm && (
                <p className="text-xs text-destructive">Usernames do not match</p>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setTransferDialog({ open: false })}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleTransferCredits}
                  disabled={transferUsername !== transferUsernameConfirm || !transferUsername}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </NewAppLayout>
  );
}
