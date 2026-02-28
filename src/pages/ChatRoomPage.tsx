import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRoomTabs } from '@/contexts/RoomTabsContext';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { RoomUsersList } from '@/components/chat/RoomUsersList';
import { RoomSettings } from '@/components/chat/RoomSettings';
import { GiftContestBanner } from '@/components/chat/GiftContestBanner';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Loader2, Star, StarOff } from 'lucide-react';
import {
  getChatroomById,
  sendMessage,
  leaveChatroom,
  updateCredits,
  recordMessageSent,
  GIFTS,
  FREE_COMMANDS,
  recordGift,
  recordGiftShower,
  tryConsumeGiftCooldown,
  tryConsumeShowerCooldown,
  getUserByUsername,
  getUserById,
  getUsersByIds,
  ChatMessage as ChatMessageType,
  Chatroom,
  addToRecentRooms,
  toggleFavoriteRoom,
  subscribeToRoomParticipants
} from '@/lib/firebaseOperations';

import { gameBotManager } from '@/lib/games';
import { getActiveContest, recordContestGift, GiftShowerContest } from '@/lib/giftContest';
import { muteUser, isUserMuted, getMuteTimeRemaining, kickUser, canUserJoinRoom } from '@/lib/moderation';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ref, get, onValue, off, push } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

// Message word limit
const MESSAGE_WORD_LIMIT = 100;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function truncateToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '...';
}

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const { openRoomTab, markTabAsRead, closeRoomTab, getRoomMessages } = useRoomTabs();

  const [room, setRoom] = useState<Chatroom | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<any>(null);
  const [botsState, setBotsState] = useState<any>(null);
  const [botActive, setBotActive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeContest, setActiveContest] = useState<GiftShowerContest | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [muteTimeLeft, setMuteTimeLeft] = useState(0);
  const [activeRedeemCode, setActiveRedeemCode] = useState<string | null>(null);
  const [joinMessages, setJoinMessages] = useState<ChatMessageType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // timers are managed by the bot service in RTDB

  useEffect(() => {
    if (!roomId || !userProfile) return;

    // Check if user was kicked and cannot rejoin
    const checkKickStatus = async () => {
      const { canJoin, minutesRemaining } = await canUserJoinRoom(roomId, userProfile.uid);
      if (!canJoin) {
        toast.error(`You were kicked from this room. You can rejoin in ${minutesRemaining} minutes.`);
        navigate('/chatrooms');
        return false;
      }
      return true;
    };

    checkKickStatus().then(canJoin => {
      if (!canJoin) return;

      loadRoom();
      checkBotStatus();
      checkActiveContest();
      checkMuteStatus();
      addToRecentRooms(userProfile.uid, roomId);

      // Check if favorite
      setIsFavorite(userProfile.favoriteRooms?.includes(roomId) || false);

      // Set up interval to check contest end (every 5 seconds) - only for Newbies room
      let contestInterval: NodeJS.Timeout | null = null;
      getChatroomById(roomId).then(roomData => {
        if (roomData?.name === 'Newbies') {
          contestInterval = setInterval(() => {
            checkActiveContest();
          }, 5000);
        }
      });

      return () => {
        if (contestInterval) clearInterval(contestInterval);
      };
    });

    // Messages are subscribed and cached in RoomTabsContext so they remain
    // available when switching tabs. We record join time in the tab provider
    // when opening the tab (so older history is not shown to this client).

    // Subscribe to game state in RTDB
    const gameRef = ref(rtdb, `games/${roomId}`);
    const unsubscribeGame = onValue(gameRef, (snapshot) => {
      setGameState(snapshot.val());
    });

    // Subscribe to bots state so we can show active bot info in the header and notify the user privately
    const botsRef = ref(rtdb, `bots/${roomId}`);
    const unsubscribeBots = onValue(botsRef, (snapshot) => {
      const val = snapshot.val();
      setBotsState(val);

      // If a bot is active and user is present, send private notification of bot presence (only once per user is enforced server-side)
      if (val && userProfile) {
        for (const type of Object.keys(val)) {
          if (val[type]?.active) {
            // fire-and-forget notify
            gameBotManager.notifyUserBotPresent(roomId!, userProfile.uid).catch(() => {});
            break;
          }
        }
      }
    });

    // Load room to get participants for welcome message
    getChatroomById(roomId).then(async roomData => {
      if (roomData) {
        const participantCount = roomData.participants.length;
        const isNewbiesRoom = roomData.name === 'Newbies';

        // Build welcome message with room owner info
        let welcomeContent = `Welcome! This room is managed by ${roomData.ownerName}.\n\nThere are ${participantCount} members in this room.`;
        if (isNewbiesRoom) {
          welcomeContent += '\n\n💎 Use /redeem <CODE> to claim bonus USD when codes appear!';
        }
        if (userProfile.isAdmin) {
          welcomeContent += '\n\n📋 Admin: Start gift contests with /startcontest <minutes> <prize>';
        }

        // Send personal join messages visible only to this user
        try {
            const profiles = await getUsersByIds(roomData.participants || []);
            const users = profiles.map(p => p.username || p.uid);
          const ownerLine = `${roomData.name}: This room is managed by ${roomData.ownerName}!`;
          const participantsLine = `${roomData.name}: Currently in the room: ${users.join(', ')}`;

          const msg1: ChatMessageType = {
            id: 'join_owner_' + Date.now(),
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '📢',
            content: ownerLine,
            type: 'system',
            timestamp: Date.now()
          };

          const msg2: ChatMessageType = {
            id: 'join_participants_' + (Date.now() + 1),
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '📢',
            content: participantsLine,
            type: 'system',
            timestamp: Date.now() + 1
          };

          setJoinMessages([msg1, msg2]);
        } catch (e) {
          setJoinMessages([{
            id: 'join_' + Date.now(),
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '📢',
            content: welcomeContent,
            type: 'system',
            timestamp: Date.now()
          }]);
        }

        // For Newbies room, set up code generation with fixed 5-minute interval
        if (isNewbiesRoom) {
          const { subscribeToRedeemCodes, checkAndGenerateCode } = await import('@/lib/redeemCodes');

          // Subscribe to code updates
          const unsubscribeCodes = subscribeToRedeemCodes(roomId, (code) => {
            // display active code until it expires; redeemable by any number of users
            if (code && Date.now() < code.expiresAt) {
              setActiveRedeemCode(code.code);
            } else {
              setActiveRedeemCode(null);
            }
          });

          // Set up periodic code generation check (every 30 seconds to ensure we catch the 5-minute window)
          // The actual generation is controlled by server-side timing, this just triggers the check
          const codeInterval = setInterval(async () => {
            const generatedCode = await checkAndGenerateCode(roomId);
            if (generatedCode) {
              sendMessage(roomId, {
                roomId,
                senderId: 'system',
                senderName: 'System',
                senderAvatar: '🎟️',
                content: `🎟️ NEW CODE: ${generatedCode.code} Worth: ${generatedCode.credits} USD\n⏰ Expires in 1 minute!\n\nType /redeem <CODE> to claim!`,
                type: 'system'
              });
            }
          }, 60 * 2 * 1000); // Check every 2 minutes

          // Cleanup on unmount
          return () => {
            unsubscribeCodes();
            clearInterval(codeInterval);
          };
        }
      }
    });

    // Subscribe to mute status changes
    const muteRef = ref(rtdb, `moderation/mutes/${roomId}/${userProfile.uid}`);
    const unsubscribeMute = onValue(muteRef, async (snapshot) => {
      if (snapshot.exists()) {
        const muteData = snapshot.val();
        const now = Date.now();
        if (now < muteData.expiresAt) {
          setIsMuted(true);
          setMuteTimeLeft(Math.ceil((muteData.expiresAt - now) / 1000));
        } else {
          setIsMuted(false);
          setMuteTimeLeft(0);
        }
      } else {
        setIsMuted(false);
        setMuteTimeLeft(0);
      }
    });

    // Subscribe to kick status - auto-leave if kicked
    const kickRef = ref(rtdb, `moderation/kicks/${roomId}/${userProfile.uid}`);
    const unsubscribeKick = onValue(kickRef, async (snapshot) => {
      if (snapshot.exists()) {
        const kickData = snapshot.val();
        const now = Date.now();
        if (now < kickData.canRejoinAt) {
          // User was kicked - force leave
          toast.error('You have been kicked from this room!');
          navigate('/chatrooms');
        }
      }
    });

    return () => {
      off(gameRef, 'value', unsubscribeGame);
      off(botsRef, 'value', unsubscribeBots);
      off(muteRef, 'value', unsubscribeMute);
      off(kickRef, 'value', unsubscribeKick);
    };
  }, [roomId, userProfile?.uid, navigate]);

  // keep a separate live copy of the participant list for gift/shower calculations
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoomParticipants(roomId, (updated) => {
      setParticipants(updated);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId]);

  // whenever participants change, merge into room state so any code still
  // referencing `room.participants` sees the fresh list as well
  useEffect(() => {
    if (room) {
      setRoom(prev => prev ? { ...prev, participants } as Chatroom : prev);
    }
  }, [participants, room]);

  useEffect(() => {
    const cached = getRoomMessages(roomId || '');
    // scroll when cached messages change or join messages set
    scrollToBottom();
  }, [roomId, getRoomMessages(roomId || ''), JSON.stringify(joinMessages)]);

  // Countdown timer for mute

  const cached = getRoomMessages(roomId || '');
  const messagesToRender = (joinMessages && joinMessages.length > 0) ? [...joinMessages, ...cached] : cached;
  useEffect(() => {
    if (!isMuted || muteTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setMuteTimeLeft(prev => {
        if (prev <= 1) {
          setIsMuted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMuted, muteTimeLeft]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkBotStatus = async () => {
    if (!roomId) return;
    try {
      const isActive = await gameBotManager.isBotActive(roomId);
      setBotActive(isActive);

      // If a bot exists in RTDB but this client doesn't have a local listener, adopt it so commands like !start work
      if (isActive) {
        try {
          const activeType = await gameBotManager.getActiveBotType(roomId);
          if (activeType) {
            try {
              await gameBotManager.addBot(roomId, activeType);
            } catch (e) {
              // Ignore adoption errors - can happen if another client concurrently owns controller
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // If a bot is active, privately notify this user that the bot is present
      if (isActive && userProfile) {
        try {
          await gameBotManager.notifyUserBotPresent(roomId, userProfile.uid);
        } catch (e) {
          // non-fatal
        }
      }
    } catch (error) {
      console.error('Failed to check bot status:', error);
    }
  };

  const checkActiveContest = async () => {
    if (!roomId) return;
    try {
      const { getActiveContest, endContest } = await import('@/lib/giftContest');
      const contest = await getActiveContest(roomId);

      // Contest ended handling and announcement are performed server-side by endContest/getActiveContest. No client-side action required here.

      setActiveContest(contest);
    } catch (error) {
      console.error('Failed to check contest:', error);
    }
  };

  const checkMuteStatus = async () => {
    if (!roomId || !userProfile) return;
    try {
      const muted = await isUserMuted(roomId, userProfile.uid);
      setIsMuted(muted);
      if (muted) {
        const remaining = await getMuteTimeRemaining(roomId, userProfile.uid);
        setMuteTimeLeft(remaining);
      }
    } catch (error) {
      console.error('Failed to check mute status:', error);
    }
  };

  const loadRoom = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const roomData = await getChatroomById(roomId);
      if (roomData) {
        setRoom(roomData);
        setParticipants(roomData.participants || []);
        // Register room as a tab (do not auto-mark as read on open; unread should persist until leaving)
        openRoomTab(roomId, roomData.name);
      } else {
        toast.error('Room not found');
        navigate('/chatrooms');
      }
    } catch (error) {
      toast.error('Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userProfile || !roomId) return;
    try {
      await toggleFavoriteRoom(userProfile.uid, roomId);
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      refreshProfile();
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!userProfile || !roomId) return;

    // Handle commands (moderators can always use commands even if muted)
    if (content.startsWith('/')) {
      await handleCommand(content);
      return;
    }

    // Check if user is muted before sending regular messages
    if (isMuted) {
      const minutes = Math.ceil(muteTimeLeft / 60);
      const seconds = muteTimeLeft % 60;
      toast.error(`You are muted. ${minutes > 0 ? `${minutes}m ` : ''}${seconds}s remaining.`);
      return;
    }

    // Game commands (starting with '!') are sent to bot-specific RTDB path and not broadcast to chat
    if (content.startsWith('!')) {
      try {
        // Ensure a bot is active in the room — otherwise users get no visible response
        const activeBotType = await gameBotManager.getActiveBotType(roomId);
        if (!activeBotType) {
          sendMessage(roomId, {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '🤖',
            content: `No game bot is active in this room. Add a bot with: /add bot luckynumber (or /add bot lowcard /add bot dice).`,
            type: 'system'
          });
          return;
        }

        const cmdRef = ref(rtdb, `botcommands/${roomId}`);
        await push(cmdRef, {
          roomId,
          senderId: userProfile.uid,
          senderName: userProfile.username,
          content,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('Failed to send bot command', e);
        toast.error('Failed to send command to bot');
      }
      return;
    }

    // Check word limit
    if (countWords(content) > MESSAGE_WORD_LIMIT) {
      content = truncateToWordLimit(content, MESSAGE_WORD_LIMIT);
      toast.info(`Message truncated to ${MESSAGE_WORD_LIMIT} words`);
    }

    // Regular message
    sendMessage(roomId, {
      roomId,
      senderId: userProfile.uid,
      senderName: userProfile.username,
      senderAvatar: userProfile.avatar,
      senderAvatarItems: userProfile.avatarItems,
      senderIsMerchant: userProfile.isMerchant,
      senderMerchantLevel: userProfile.merchantLevel, // ensure color is accurate
      senderIsMentor: userProfile.isMentor,
      senderIsAdmin: userProfile.isAdmin,
      senderIsStaff: userProfile.isStaff,
      content,
      type: 'message'
    });

    // Record message and award 1 XP per 10 messages
    await recordMessageSent(userProfile.uid);
  };

  const handleCommand = async (content: string) => {
    if (!userProfile || !roomId || !room) return;

    const parts = content.slice(1).split(' ');
    const command = parts[0].toLowerCase();

    // Check for free commands first
    const freeCommand = FREE_COMMANDS.find(c => c.command === command);
    if (freeCommand) {
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: freeCommand.emoji,
        content: `${userProfile.username} ${freeCommand.action} ${freeCommand.emoji}`,
        type: 'action'
      });
      return;
    }

    // Moderator commands: /kick, /mute, /warn
    const isOwner = room.ownerId === userProfile.uid;
    const isMod = room.moderators?.includes(userProfile.uid);
    const canModerate = isOwner || isMod || userProfile.isAdmin;

    // Admin commands: /ban, /unban
    if (command === 'ban' && userProfile.isAdmin && parts[1]) {
      const targetUsername = parts[1];
      const reason = parts.slice(2).join(' ') || 'Violation of terms';
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      const { banUser } = await import('@/lib/firebaseOperations');
      const result = await banUser(userProfile.uid, targetUser.uid, reason);
      if (result.success) {
        sendMessage(roomId, {
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '🔨',
          content: `🔨 ${targetUsername} has been banned by Admin. Reason: ${reason}`,
          type: 'system'
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      return;
    }

    if (command === 'unban' && userProfile.isAdmin && parts[1]) {
      const targetUsername = parts[1];
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      const { unbanUser } = await import('@/lib/firebaseOperations');
      const result = await unbanUser(userProfile.uid, targetUser.uid);
      if (result.success) {
        sendMessage(roomId, {
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '✅',
          content: `✅ ${targetUsername} has been unbanned by Admin`,
          type: 'system'
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      return;
    }

    if (command === 'kick' && canModerate && parts[1]) {
      const targetUsername = parts[1];
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      if (targetUser.uid === room.ownerId) {
        toast.error('Cannot kick the room owner');
        return;
      }
      if (!participants.includes(targetUser.uid)) {
        toast.error(`${targetUsername} is not in the room`);
        return;
      }
      // Record kick with 10 minute cooldown
      await kickUser(roomId, targetUser.uid, userProfile.uid);
      // Only call leaveChatroom when they are present
      await leaveChatroom(roomId, targetUser.uid);
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🚫',
        content: `${targetUsername} has been kicked from the room by ${userProfile.username} (cannot rejoin for 10 minutes)`,
        type: 'system'
      });
      toast.success(`${targetUsername} has been kicked`);
      return;
    }

    if (command === 'mute' && canModerate && parts[1]) {
      const targetUsername = parts[1];
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      if (targetUser.uid === room.ownerId) {
        toast.error('Cannot mute the room owner');
        return;
      }
      if (!participants.includes(targetUser.uid)) {
        toast.error(`${targetUsername} is not in the room`);
        return;
      }
      // Mute for 5 minutes (fixed duration)
      await muteUser(roomId, targetUser.uid, userProfile.uid);
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🔇',
        content: `${targetUsername} has been muted for 5 minutes by ${userProfile.username}`,
        type: 'system'
      });
      toast.success(`${targetUsername} has been muted for 5 minutes`);
      return;
    }

    if (command === 'warn' && canModerate && parts[1]) {
      const targetUsername = parts[1];
      const reason = parts.slice(2).join(' ') || 'No reason provided';
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      if (!participants.includes(targetUser.uid)) {
        toast.error(`${targetUsername} is not in the room`);
        return;
      }
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '⚠️',
        content: `⚠️ Warning to ${targetUsername}: ${reason} (by ${userProfile.username})`,
        type: 'system'
      });
      toast.success(`Warning sent to ${targetUsername}`);
      return;
    }

    // Admin command: Start gift contest
    if (command === 'startcontest' && userProfile.isAdmin) {
      const minutes = parseInt(parts[1]) || 60;
      const prize = parseInt(parts[2]) || 500;
      const giftId = parts[3]?.toLowerCase();

      // if gift is provided, ensure it's valid
      if (!giftId) {
        toast.error('Please specify the gift ID after the minutes/prize');
        return;
      }

      const gift = GIFTS.find(g => g.id.toLowerCase() === giftId);
      if (!gift) {
        toast.error('Invalid gift specified for contest');
        return;
      }

      const { startGiftShowerContest } = await import('@/lib/giftContest');
      try {
        const result = await startGiftShowerContest(roomId, room.name, minutes, prize, gift.id);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        if (result.contest) {
          setActiveContest(result.contest);

          sendMessage(roomId, {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '🎁',
            content: `🎉 GIFT SHOWER CONTEST STARTED! 🎉\nDuration: ${minutes} minutes\nPrize: ${prize} credits\nEligible gift: ${gift.emoji} ${gift.name}\nPrizes will be split among top senders based on number of gifts sent.\n\n⚠️ This is the only contest for today!`,
            type: 'system'
          });
          toast.success('Contest started!');
        }
      } catch (error) {
        toast.error('Failed to start contest');
      }
      return;
    }

    // Add bot command: /add bot <type>
    if (command === 'add' && parts[1]?.toLowerCase() === 'bot') {
      const type = (parts[2] || 'lowcard').toLowerCase();
      const availableGames = gameBotManager.getAvailableGames();

      if (!availableGames.includes(type)) {
        toast.error(`Unsupported bot type. Available: ${availableGames.join(', ')}`);
        return;
      }

      const error = await gameBotManager.addBot(roomId, type);
      if (error) {
        toast.error(error);
        return;
      }
      setBotActive(true);
      return;
    }

    // Remove bot command: /remove bot
    if (command === 'remove' && parts[1]?.toLowerCase() === 'bot') {
      const error = await gameBotManager.removeBot(roomId);
      if (error) {
        toast.error(error);
        return;
      }
      setBotActive(false);
      toast.success('Bot removed from room');
      return;
    }

    if (command === 'lowcard' || command === 'dice' || command === 'luckynumber') {
      if (!botActive) {
        toast.info(`Add the bot first with: /add bot ${command}`);
        return;
      }

      let content = '';
      if (command === 'lowcard') {
        content = `🃏 Lowcard game! Use !start <amount> to start a game with a wager. Other players can join with !j within 30 seconds. Lowest card is eliminated each round until one player remains!`;
      } else if (command === 'dice') {
        content = `🎲 Dice game! Use !start <amount> to start a game with a wager. Other players can join with !j within 30 seconds. Highest roll wins each round until one player remains!`;
      } else {
        content = `🔢 Lucky Number! Use !start to begin a new game. Players join with !j <amount> during the join window. During each round submit !guess <number 1-100>. Use !cashout during decision phase to claim payouts. Exact guesses win special multipliers.`;
      }

      sendMessage(roomId, {
        roomId,
        senderId: 'bot',
        senderName: '🤖 GameBot',
        senderAvatar: '🤖',
        content,
        type: 'game'
      });
      return;
    }

    if (command === 'gift' && parts.length >= 3) {
      const giftId = parts[1];
      const targetUsername = parts[2];
      const gift = GIFTS.find(g => g.id.toLowerCase() === giftId.toLowerCase());

      if (!gift) {
        toast.error('Invalid gift');
        return;
      }

      if (userProfile.credits < gift.price) {
        toast.error('Insufficient credits');
        return;
      }

      // if contest exists and gift doesn't match, show a gentle reminder
      if (activeContest && activeContest.giftId && gift.id !== activeContest.giftId) {
        const contestGift = GIFTS.find(g => g.id === activeContest.giftId);
        if (contestGift) {
          toast.info(`Only ${contestGift.name} gifts count toward the current contest.`);
        }
      }

      // Verify target user exists (case-insensitive username)
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }

      // Respect gift cooldown (10s between single gifts)
      try {
        const cd = await tryConsumeGiftCooldown(userProfile.uid);
        if (!cd.allowed) {
          const remaining = 'remainingSeconds' in cd ? cd.remainingSeconds : 0;
          // Send private notification to user about waiting time
          try {
            const messagesRef = ref(rtdb, `messages/${roomId}`);
            await push(messagesRef, {
              roomId,
              senderId: 'bot',
              senderName: '🎁 GiftBot',
              senderAvatar: '🎁',
              content: `Please wait ${remaining} seconds before sending another gift.`,
              type: 'system',
              timestamp: Date.now(),
              targetUserId: userProfile.uid
            });
          } catch (e) { /* non-fatal */ }
          return;
        }
      } catch (e) {
        console.warn('Gift cooldown check failed, proceeding:', e);
      }

      await updateCredits(userProfile.uid, -gift.price);
      // Include gift metadata so recipients (including private gifts) see emoji/name
      await recordGift(userProfile.uid, targetUser.uid, gift.price, false, gift.id, gift.name, gift.emoji);

      // Record gift for contest if active
      if (activeContest) {
        // single gift counts as one; include gift id for filtering
        await recordContestGift(activeContest.id, userProfile.uid, userProfile.username, gift.price, 1, gift.id);
      }

      refreshProfile();

      sendMessage(roomId, {
        roomId,
        senderId: 'bot',
        senderName: '🎁 GiftBot',
        senderAvatar: '🎁',
        content: `${userProfile.username} sent a ${gift.emoji} ${gift.name} to ${targetUsername}!`,
        type: 'gift'
      });

      // Private notification to the recipient
      try {
        const messagesRef = ref(rtdb, `messages/${roomId}`);
        await push(messagesRef, {
          roomId,
          senderId: 'bot',
          senderName: '🎁 GiftBot',
          senderAvatar: '🎁',
          content: `🎁 You received a ${gift.emoji} ${gift.name} from ${userProfile.username}! (+${gift.price} gift value, 20% convertible)`,
          type: 'gift',
          timestamp: Date.now(),
          targetUserId: targetUser.uid
        });
      } catch (e) { /* non-fatal */ }

      toast.success(`Sent ${gift.name} to ${targetUsername}`);
      return;
    }

    if (command === 'shower' && parts.length >= 2) {
      const giftId = parts[1];
      const gift = GIFTS.find(g => g.id.toLowerCase() === giftId.toLowerCase());

      if (!gift) {
        toast.error('Invalid gift');
        return;
      }

      // Get other participants in the room (excluding sender)
      const otherParticipants = participants.filter(p => p !== userProfile.uid);

      if (otherParticipants.length === 0) {
        toast.error('No other users in the room to shower gifts');
        return;
      }

      const totalCost = gift.price * otherParticipants.length;
      if (activeContest && activeContest.giftId && gift.id !== activeContest.giftId) {
        const contestGift = GIFTS.find(g => g.id === activeContest.giftId);
        if (contestGift) {
          toast.info(`Only ${contestGift.name} gifts count toward the current contest.`);
        }
      }
      if (userProfile.credits < totalCost) {
        toast.error(`Need ${totalCost} credits to shower ${otherParticipants.length} users`);
        return;
      }

      // Respect shower cooldown (20s between showers)
      try {
        const cd = await tryConsumeShowerCooldown(userProfile.uid);
        if (!cd.allowed) {
          const remaining = 'remainingSeconds' in cd ? cd.remainingSeconds : 0;
          try {
            const messagesRef = ref(rtdb, `messages/${roomId}`);
            await push(messagesRef, {
              roomId,
              senderId: 'bot',
              senderName: '🎁 GiftBot',
              senderAvatar: '🎁',
              content: `Please wait ${remaining} seconds before sending another shower.`,
              type: 'system',
              timestamp: Date.now(),
              targetUserId: userProfile.uid
            });
          } catch (e) { /* non-fatal */ }
          return;
        }
      } catch (e) {
        console.warn('Shower cooldown check failed, proceeding:', e);
      }

      await updateCredits(userProfile.uid, -totalCost);

      // Record shower as a single aggregated transaction and update recipients
      await recordGiftShower(userProfile.uid, otherParticipants, gift.id, gift.name, gift.emoji, gift.price);

      // Record gift for contest if active
      if (activeContest) {
        // shower counts as one gift per recipient; send gift id for filtering
        await recordContestGift(
          activeContest.id,
          userProfile.uid,
          userProfile.username,
          totalCost,
          otherParticipants.length,
          gift.id
        );
      }

      refreshProfile();

      sendMessage(roomId, {
        roomId,
        senderId: 'bot',
        senderName: '🎁 GiftBot',
        senderAvatar: '🎁',
        content: `<< ❈ GIFT SHOWER! ${userProfile.username} (${userProfile.level}) gives a ${gift.name} ${gift.emoji} to all ${otherParticipants.length} users in the room! ❈ >>`,
        type: 'gift'
      });

      return;
    }

    // Redeem code command (Newbies room only)
    if (command === 'redeem' && parts[1]) {
      // Check if this is Newbies room
      if (room.name !== 'Newbies') {
        toast.error('Redeem codes can only be used in the Newbies room!');
        return;
      }

      const { redeemCode } = await import('@/lib/redeemCodes');
      const code = parts[1].toUpperCase();

      try {
        const result = await redeemCode(userProfile.uid, userProfile.username, code, roomId);

        if (result.success) {
          // Announce in room
          sendMessage(roomId, {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '🎉',
            content: `🎉 ${userProfile.username} redeemed code ${code} and won ${result.credits} credits! 💰`,
            type: 'system'
          });
          toast.success(`You won ${result.credits} credits!`);
          refreshProfile();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error('Failed to redeem code');
      }
      return;
    }
  };



  const handleLeave = async () => {
    if (!userProfile || !roomId) return;
    try {
      // Centralize leave logic in closeRoomTab which handles leaving the room, announcing, and cleaning up the tab
      closeRoomTab(roomId, userProfile.uid, userProfile.username);
      navigate('/chatrooms');
    } catch (error) {
      toast.error('Failed to leave room');
    }
  };

  if (loading || !room || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }



  return (
    <NewAppLayout>
      <div className="flex flex-col w-full max-w-4xl mx-auto px-2 sm:px-4" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Room Header - sticky */}
        <header className="sticky top-0 z-30 h-12 glass-strong border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate">{room.name}</h1>

            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {/* Bot status indicator */}
                {botsState && Object.keys(botsState).some(k => botsState[k]?.active) && (
                  (() => {
                    const types = Object.keys(botsState).filter(k => botsState[k]?.active);
                    const type = types[0];
                    const last = botsState[type]?.lastActiveAt || botsState[type]?.startedAt || 0;
                    const minutes = Math.max(0, Math.floor((Date.now() - last) / 60000));
                    const handlerName = (type === 'bimo') ? 'Bimo' : type.charAt(0).toUpperCase() + type.slice(1);
                    return (
                      <span className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">🃏 {handlerName}</span>
                      </span>
                    );
                  })()
                )}
              </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleFavorite}>
              {isFavorite ? (
                <Star className="w-4 h-4 text-gold fill-gold" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>

            <RoomUsersList
              roomId={roomId!}
              participants={participants}
              ownerId={room?.ownerId || ''}
              moderators={room?.moderators || []}
            />

            {(room.ownerId === userProfile.uid || room.moderators?.includes(userProfile.uid)) && (
              <RoomSettings room={room!} onUpdate={loadRoom} />
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLeave}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Gift Contest Banner */}
        {activeContest && (
          <GiftContestBanner contest={activeContest} />
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-2 sm:p-4">
          <div className="w-full">
            {messagesToRender.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <p>No messages yet</p>
                <p className="text-sm">Be the first to say something!</p>
              </motion.div>
            ) : (
              messagesToRender.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === userProfile.uid}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Mute indicator */}
        {isMuted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 bg-destructive/20 border-t border-destructive/30"
          >
            <div className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-center gap-2 text-sm text-destructive">
              <span>🔇</span>
              <span>You are muted. {Math.floor(muteTimeLeft / 60)}:{(muteTimeLeft % 60).toString().padStart(2, '0')} remaining</span>
            </div>
          </motion.div>
        )}

        {/* Input */}
        <div className="w-full shrink-0 px-2 sm:px-0">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isMuted}
            bimoActive={!!(gameState?.bimo && gameState.bimo.status === 'waiting')}
            ownedEmoticonPacks={(userProfile as any).ownedEmoticonPacks || []}
          />
        </div>
      </div>
    </NewAppLayout>
  );
}
