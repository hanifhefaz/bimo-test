import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Globe,
  Lock,
  Loader2,
  Clock,
  Star,
  Home,
  Gamepad,
  Flame,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';


import { Skeleton } from '@/components/ui/skeleton';
import {
  getChatrooms,
  getUserChatrooms,
  createChatroom,
  joinChatroom,
  sendMessage,
  Chatroom,
  initializeDefaultRooms,
  getMostExpensivePet,
  getMostExpensiveAsset,
  COMPANION_ITEMS
} from '@/lib/firebaseOperations';

// helper for testing and reuse
export function getHotRooms(rooms: Chatroom[]) {
  return rooms.filter(r => (r.participants?.length || 0) > 0);
}

import { getBadgeForLevel } from '@/lib/badges';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const MAX_ROOM_USERS = 25;
const COMPANION_GREETING_LINES = [
  'we just arrived and already improved the room stats.',
  'hello chat, keep it fun and stack those wins.',
  'new entrance unlocked. vibes increased instantly.',
  'we are here. confidence level: absolutely illegal.'
];

export default function ChatroomsPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [allRooms, setAllRooms] = useState<Chatroom[]>([]);
  const [myRooms, setMyRooms] = useState<Chatroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Collapsible states
  const [recentOpen, setRecentOpen] = useState(true);
  const [hotOpen, setHotOpen] = useState(true);
  const [favoriteOpen, setFavoriteOpen] = useState(true);
  const [officialOpen, setOfficialOpen] = useState(true);
  const [gamesOpen, setGamesOpen] = useState(true);
  const [myRoomsOpen, setMyRoomsOpen] = useState(true);

  useEffect(() => {
    loadRooms();
    // Initialize default rooms on first load
    initializeDefaultRooms().catch(console.error);
  }, [userProfile?.uid]);

  const loadRooms = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        getChatrooms(),
        getUserChatrooms(userProfile.uid)
      ]);
      setAllRooms(all);
      setMyRooms(mine);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !userProfile) return;

    setCreating(true);
    try {
      const roomId = await createChatroom(
        newRoomName.trim(),
        userProfile.uid,
        userProfile.username,
        newRoomPrivate
      );
      toast.success('Chatroom created!');
      setCreateOpen(false);
      setNewRoomName('');
      setNewRoomPrivate(false);
      loadRooms();
      navigate(`/chat/${roomId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (room: Chatroom) => {
    if (!userProfile) return;

    // Check if room is full
    if (room.participants.length >= MAX_ROOM_USERS) {
      toast.error('This room is full (25/25 users)');
      return;
    }

    // If already a member, just enter
    if (room.participants.includes(userProfile.uid)) {
      navigate(`/chat/${room.id}`);
      return;
    }

    try {
      const wasNewlyAdded = await joinChatroom(room.id, userProfile.uid);

      // Only send announcement if user was newly added (prevents duplicate announcements on multiple clicks)
      if (wasNewlyAdded) {
        // Get badge and most expensive pet/asset for announcement
        const badge = getBadgeForLevel(userProfile.level);
        const expensivePet = getMostExpensivePet(userProfile.pets);
        const expensiveAsset = getMostExpensiveAsset(userProfile.assets);
        const equippedCompanion = COMPANION_ITEMS.find((c) => c.id === userProfile.equippedCompanionId);

        // Build announcement message in requested format
        let announcement = ` ${room.name}:  ${userProfile.username} [${userProfile.level}] (${badge.name}) has entered the room`;
        if (expensiveAsset) {
          // embed an asset token; the chat renderer will replace this with an inline animation
          announcement += ` using a <asset:${expensiveAsset.asset.id}>`;
        }
        if (expensivePet) {
          // embed a pet token; the chat renderer will replace this with an inline animation
          announcement += ` with a <pet:${expensivePet.pet.id}>`;
        }
        if (equippedCompanion) {
          announcement += ` and accompanied by <companion:${equippedCompanion.id}>`;
        }
        announcement += '!';

        // Send join announcement
        sendMessage(room.id, {
          roomId: room.id,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '📢',
          content: announcement,
          type: 'system'
        });
        if (equippedCompanion) {
          const line = COMPANION_GREETING_LINES[Math.floor(Math.random() * COMPANION_GREETING_LINES.length)];
          sendMessage(room.id, {
            roomId: room.id,
            senderId: 'system',
            senderName: `${userProfile.username}'s companion`,
            senderAvatar: equippedCompanion.emoji,
            content: `${userProfile.username}'s companion <companion:${equippedCompanion.id}> ${equippedCompanion.name}: ${line}`,
            type: 'action'
          });
        }
      }

      navigate(`/chat/${room.id}`);
    } catch (error) {
      toast.error('Failed to join room');
    }
  };

  if (!userProfile) return null;

  // Filter and categorize rooms
  const searchedRooms = searchTerm.trim()
    ? allRooms.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const recentRooms = allRooms
    .filter(r => userProfile.recentRooms?.includes(r.id))
    .slice(0, 5);

  const favoriteRooms = allRooms
    .filter(r => userProfile.favoriteRooms?.includes(r.id))
    .slice(0, 5);

  // Official rooms: only the Newbies room
  const officialRooms = allRooms
    .filter(r => r.name === 'Newbies')
    .slice(0, 5);

  // Game rooms heuristic: names or topics containing game-related keywords (exclude user-created rooms)
  const gamesRooms = allRooms
    .filter(r => {
      const n = (r.name || '').toLowerCase();
      const t = (r.topic || '').toLowerCase();
      const isGameRoom = n.includes('game') || n.includes('dice') || n.includes('bimo') || n.includes('lowcard') || n.includes('luckynumber') || n.includes('higherlower') || t.includes('game');
      // Exclude user-created rooms from games section
      return isGameRoom && r.ownerId !== userProfile?.uid;
    })
    .slice(0, 5);

  // Hot rooms: any room with at least one participant
  const hotRooms = allRooms.filter(r => (r.participants?.length || 0) > 0);

  // My own rooms - rooms created by the current user
  const myOwnRooms = myRooms.filter(r => r.ownerId === userProfile?.uid);

  // hot list limitations
  const [hotLimit, setHotLimit] = useState(5);
  const loadMoreHot = () => setHotLimit(prev => prev + 5);

  // if available hot room count drops below our current limit, reset
  useEffect(() => {
    if (hotLimit > hotRooms.length) {
      setHotLimit(5);
    }
  }, [hotRooms.length]);

  // Room list item component
  const RoomListItem = ({ room }: { room: Chatroom }) => {
    const isFull = room.participants.length >= MAX_ROOM_USERS;

    return (
      <button
        onClick={() => handleJoinRoom(room)}
        disabled={isFull}
        className={`w-full text-left py-2 px-3 rounded-lg transition-colors flex items-center justify-between ${
          isFull
            ? 'text-muted-foreground cursor-not-allowed opacity-60'
            : 'hover:bg-muted cursor-pointer'
        }`}
      >
        <span className="flex items-center gap-2">
          {room.isPrivate && <Lock className="w-3 h-3 text-muted-foreground" />}
          <span className="font-medium text-sm">{room.name}</span>
        </span>
        <span className={`text-caption ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
          {room.participants.length}/{MAX_ROOM_USERS}
        </span>
      </button>
    );
  };

  const RoomSection = ({
    title,
    icon,
    rooms,
    emptyText,
    isOpen,
    onToggle
  }: {
    title: string;
    icon: React.ReactNode;
    rooms: Chatroom[];
    emptyText: string;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="mb-4">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between py-2 px-1 bg-primary/30 rounded-lg transition-colors">
          <span className="font-semibold text-sm flex items-center gap-2 text-white-foreground">
            {icon}
            {title}
            <span className="text-caption">({rooms.length})</span>
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {rooms.length === 0 ? (
          <p className="text-caption text-muted-foreground/50 text-center py-3 px-3">{emptyText}</p>
        ) : (
          <div className="mt-1">
            {rooms.map((room) => (
              <RoomListItem key={room.id} room={room} />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <h1 className="font-display heading-tight text-2xl font-bold">Chatrooms</h1>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="w-4 h-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/10">
              <DialogHeader>
                <DialogTitle>Create Chatroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <Label htmlFor="private" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Private Room
                  </Label>
                  <Switch
                    id="private"
                    checked={newRoomPrivate}
                    onCheckedChange={setNewRoomPrivate}
                  />
                </div>
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={creating || !newRoomName.trim()}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative mb-6"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : searchTerm.trim() ? (
          // Search Results
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3 className="heading-tight font-semibold text-body mb-3 text-muted-foreground">
                Search Results ({searchedRooms.length})
              </h3>
              {searchedRooms.length === 0 ? (
                <p className="text-body text-center py-8 text-muted-foreground">No rooms found</p>
              ) : (
                <div>
                  {searchedRooms.map((room) => (
                    <RoomListItem key={room.id} room={room} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          // Categorized Rooms with Collapsible sections
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <RoomSection
              title="Recent Rooms"
              icon={<Clock className="w-4 h-4" />}
              rooms={recentRooms}
              emptyText="No recent rooms"
              isOpen={recentOpen}
              onToggle={() => setRecentOpen(!recentOpen)}
            />

            {/* hot rooms with load more */}
            <Collapsible open={hotOpen} onOpenChange={() => setHotOpen(!hotOpen)} className="mb-4">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between py-2 px-1 bg-primary/30 rounded-lg transition-colors">
                  <span className="font-semibold text-sm flex items-center gap-2 text-white-foreground">
                    <Flame className="w-4 h-4" />
                    <span className="flex items-center gap-1">
                      Hot Rooms
                    </span>
                    <span className="text-caption">({hotRooms.length})</span>
                  </span>
                  {hotOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {hotRooms.length === 0 ? (
                  <p className="text-caption text-muted-foreground/50 text-center py-3 px-3">No hot rooms</p>
                ) : (
                  <div className="mt-1">
                    {hotRooms.slice(0, hotLimit).map((room) => (
                      <RoomListItem key={room.id} room={room} />
                    ))}
                    {hotLimit < hotRooms.length && (
                      <button
                        onClick={loadMoreHot}
                        className="mt-2 text-sm text-primary underline"
                      >
                        Load more
                      </button>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <RoomSection
              title="Favorites"
              icon={<Star className="w-4 h-4" />}
              rooms={favoriteRooms}
              emptyText="No favorites"
              isOpen={favoriteOpen}
              onToggle={() => setFavoriteOpen(!favoriteOpen)}
            />

            <RoomSection
              title="Official Rooms"
              icon={<Globe className="w-4 h-4" />}
              rooms={officialRooms}
              emptyText="No official rooms"
              isOpen={officialOpen}
              onToggle={() => setOfficialOpen(!officialOpen)}
            />

            <RoomSection
              title="Game Rooms"
              icon={<Gamepad className="w-4 h-4" />}
              rooms={gamesRooms}
              emptyText="No game rooms"
              isOpen={gamesOpen}
              onToggle={() => setGamesOpen(!gamesOpen)}
            />

            <RoomSection
              title="My Own Rooms"
              icon={<Home className="w-4 h-4" />}
              rooms={myOwnRooms}
              emptyText="You haven't created any rooms yet"
              isOpen={myRoomsOpen}
              onToggle={() => setMyRoomsOpen(!myRoomsOpen)}
            />
          </motion.div>
        )}
      </div>
    </NewAppLayout>
  );
}
