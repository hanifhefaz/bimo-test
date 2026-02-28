import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Shield, UserPlus, UserMinus, Save, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserByUsername, Chatroom } from '@/lib/firebaseOperations';

interface RoomSettingsProps {
  room: Chatroom;
  onUpdate: () => void;
}

export function RoomSettings({ room, onUpdate }: RoomSettingsProps) {
  const { userProfile } = useAuth();
  const [topic, setTopic] = useState(room.topic || '');
  const [description, setDescription] = useState((room as any).description || '');
  const [newModUsername, setNewModUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingMod, setAddingMod] = useState(false);

  const isOwner = userProfile?.uid === room.ownerId;
  const isMod = room.moderators?.includes(userProfile?.uid || '');
  const isGlobalAdmin = !!userProfile?.isAdmin;
  const isChatAdmin = !!userProfile?.isChatAdmin;
  // Detect system rooms - rooms with ownerId 'system' or without an owner
  const isSystemRoom = room.ownerId === 'system' || !room.ownerId;
  // Global admins or chat‑admins can edit any room; owners and mods can edit their own
  const canEdit = isOwner || isMod || isGlobalAdmin || isChatAdmin;
  // Only owners (or admins for system rooms) can manage moderators
  const canManageModerators = isOwner || (isGlobalAdmin && isSystemRoom) || (isChatAdmin && isSystemRoom);

  if (!canEdit) return null;

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const roomRef = doc(db, 'chatrooms', room.id);
      await updateDoc(roomRef, {
        topic,
        description
      });
      toast.success('Room settings updated!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModerator = async () => {
    if (!newModUsername.trim()) return;
    
    setAddingMod(true);
    try {
      const user = await getUserByUsername(newModUsername.trim());
      if (!user) {
        toast.error('User not found');
        return;
      }

      if (room.moderators?.includes(user.uid)) {
        toast.error('User is already a moderator');
        return;
      }

      const roomRef = doc(db, 'chatrooms', room.id);
      await updateDoc(roomRef, {
        moderators: arrayUnion(user.uid)
      });

      // Send announcement to room
      const { sendMessage } = await import('@/lib/firebaseOperations');
      sendMessage(room.id, {
        roomId: room.id,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🛡️',
        content: `${newModUsername} has been promoted to moderator by ${userProfile?.username}`,
        type: 'system'
      });

      toast.success(`${newModUsername} is now a moderator`);
      setNewModUsername('');
      onUpdate();
    } catch (error) {
      toast.error('Failed to add moderator');
    } finally {
      setAddingMod(false);
    }
  };

  const handleRemoveModerator = async (modId: string, modUsername?: string) => {
    try {
      const roomRef = doc(db, 'chatrooms', room.id);
      await updateDoc(roomRef, {
        moderators: arrayRemove(modId)
      });

      // Send announcement to room
      const { sendMessage } = await import('@/lib/firebaseOperations');
      sendMessage(room.id, {
        roomId: room.id,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🛡️',
        content: `${modUsername || 'A user'} has been removed from moderators by ${userProfile?.username}`,
        type: 'system'
      });

      toast.success('Moderator removed');
      onUpdate();
    } catch (error) {
      toast.error('Failed to remove moderator');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="glass border-white/10">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Room Settings
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Room Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Room Information</h3>
              
              <div>
                <label className="text-sm text-muted-foreground">Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Room topic..."
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Room description..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              <Button 
                variant="gradient" 
                className="w-full"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>

            {/* Moderators (Owner or Admin for system rooms) */}
            {canManageModerators && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Moderators
                </h3>

                {/* Add moderator */}
                <div className="flex gap-2">
                  <Input
                    value={newModUsername}
                    onChange={(e) => setNewModUsername(e.target.value)}
                    placeholder="Username..."
                  />
                  <Button 
                    variant="accent"
                    onClick={handleAddModerator}
                    disabled={addingMod || !newModUsername.trim()}
                  >
                    {addingMod ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Moderator list */}
                <div className="space-y-2">
                  {(!room.moderators || room.moderators.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No moderators assigned
                    </p>
                  ) : (
                    room.moderators.map((modId) => (
                      <div
                        key={modId}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                      >
                        <span className="text-sm">{modId}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveModerator(modId)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Admin Commands Info */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-white/5">
              <h4 className="font-medium mb-2">Moderator Commands</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>/kick [username]</code> - Remove user (10 min ban)</li>
                <li>• <code>/mute [username]</code> - Mute user for 5 minutes</li>
                <li>• <code>/warn [username]</code> - Send warning to user</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
