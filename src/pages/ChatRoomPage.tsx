import { useState, useEffect, useRef, useMemo } from 'react';
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
  blockUser,
  unblockUser,
  chargeVoteKickFee,
  ChatMessage as ChatMessageType,
  Chatroom,
  addToRecentRooms,
  toggleFavoriteRoom,
  subscribeToRoomParticipants
} from '@/lib/firebaseOperations';

import { gameBotManager } from '@/lib/games';
import {
  recordContestGift,
  GiftShowerContest,
  startInviteContest,
  INVITE_CONTEST_DURATION_DAYS,
  INVITE_TOP_PRIZES,
  INVITE_GRAND_PRIZE_CREDITS
} from '@/lib/giftContest';
import {
  muteUser,
  kickUser,
  canUserJoinRoom,
  setRoomSilence,
  subscribeToRoomSilence,
  startVoteKick,
  castVoteKick,
  cancelVoteKick,
  subscribeToVoteKicks,
  VoteKickRecord
} from '@/lib/moderation';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ref, get, onValue, off, push, runTransaction, set } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

// Message word limit
const MESSAGE_WORD_LIMIT = 100;
const VOTE_KICK_REQUIRED_VOTES = 5;
const VOTE_KICK_START_FEE = 0.05;

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
  const { openTabs, openRoomTab, markTabAsRead, closeRoomTab, getRoomMessages } = useRoomTabs();

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
  const [isRoomSilenced, setIsRoomSilenced] = useState(false);
  const [roomSilencedBy, setRoomSilencedBy] = useState<string | null>(null);
  const [activeVoteKicks, setActiveVoteKicks] = useState<Record<string, VoteKickRecord>>({});
  const [activeParticipantProfiles, setActiveParticipantProfiles] = useState<Record<string, { uid: string; username: string; usernameLower: string }>>({});
  const [activeRedeemCode, setActiveRedeemCode] = useState<string | null>(null);
  const [joinMessages, setJoinMessages] = useState<ChatMessageType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // timers are managed by the bot service in RTDB

  const roomTab = openTabs.find(t => !t.isPrivateChat && t.id === (roomId || ''));
  const hasRoomCache = !!roomId && getRoomMessages(roomId).length > 0;
  const fallbackRoomName = roomTab?.name || 'Room';
  const canSilenceControls = !!room && !!userProfile && (
    room.ownerId === userProfile.uid || userProfile.isAdmin || userProfile.isChatAdmin
  );
  const blockedUsersSet = useMemo(() => new Set(userProfile?.blockedUsers || []), [userProfile?.blockedUsers]);
  const participantsByUsernameLower = useMemo(() => {
    const map = new Map<string, { uid: string; username: string }>();
    Object.values(activeParticipantProfiles).forEach((p) => {
      map.set((p.usernameLower || p.username.toLowerCase()), { uid: p.uid, username: p.username });
    });
    return map;
  }, [activeParticipantProfiles]);

  useEffect(() => {
    if (!roomId) return;
    markTabAsRead(roomId);
  }, [roomId, markTabAsRead]);

  useEffect(() => {
    if (!roomId || !userProfile) return;

    let isCancelled = false;
    let contestInterval: NodeJS.Timeout | null = null;
    let codeInterval: NodeJS.Timeout | null = null;
    let schedulerRenewInterval: NodeJS.Timeout | null = null;
    let schedulerRetryInterval: NodeJS.Timeout | null = null;
    let unsubscribeCodes: (() => void) | null = null;
    let unsubscribeRoomSilence: (() => void) | null = null;
    let unsubscribeVoteKicks: (() => void) | null = null;

    const schedulerInstanceId = `${userProfile.uid}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const schedulerRef = ref(rtdb, `roomSchedulers/${roomId}/redeem`);
    const schedulerTtlMs = 3 * 60 * 1000;
    let schedulerHeld = false;

    const releaseScheduler = async () => {
      if (!schedulerHeld) return;
      try {
        await runTransaction(schedulerRef, (current: any) => {
          if (current?.holderId === schedulerInstanceId) return null;
          return current;
        });
      } catch {
        // ignore scheduler release failures
      } finally {
        schedulerHeld = false;
      }
    };

    const tryClaimScheduler = async (): Promise<boolean> => {
      try {
        const now = Date.now();
        const tr = await runTransaction(schedulerRef, (current: any) => {
          if (!current || !current.expiresAt || current.expiresAt < now || current.holderId === schedulerInstanceId) {
            return {
              holderId: schedulerInstanceId,
              holderUid: userProfile.uid,
              expiresAt: now + schedulerTtlMs
            };
          }
          return;
        });

        const val = tr.snapshot?.val();
        schedulerHeld = !!val && val.holderId === schedulerInstanceId;
        return schedulerHeld;
      } catch {
        return false;
      }
    };

    const startCodeScheduler = async () => {
      const claimed = await tryClaimScheduler();
      if (!claimed || isCancelled) return;

      const { checkAndGenerateCode } = await import('@/lib/redeemCodes');

      schedulerRenewInterval = setInterval(async () => {
        if (isCancelled || !schedulerHeld) return;
        try {
          await set(schedulerRef, {
            holderId: schedulerInstanceId,
            holderUid: userProfile.uid,
            expiresAt: Date.now() + schedulerTtlMs
          });
        } catch {
          schedulerHeld = false;
        }
      }, 60 * 1000);

      codeInterval = setInterval(async () => {
        if (isCancelled || !schedulerHeld) return;
        const generatedCode = await checkAndGenerateCode(roomId);
        if (generatedCode) {
          sendMessage(roomId, {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: 'CODE',
            content: `NEW CODE: ${generatedCode.code} Worth: ${generatedCode.credits} USD\nExpires in 1 minute!\n\nType /redeem <CODE> to claim!`,
            type: 'gift'
          });
        }
      }, 60 * 2 * 1000);

      schedulerRetryInterval = setInterval(async () => {
        if (isCancelled || schedulerHeld) return;
        await startCodeScheduler();
      }, 90 * 1000);
    };

    const checkKickStatus = async () => {
      const { canJoin, minutesRemaining } = await canUserJoinRoom(roomId, userProfile.uid);
      if (!canJoin) {
        toast.error(`You were kicked from this room. You can rejoin in ${minutesRemaining} minutes.`);
        navigate('/chatrooms');
        return false;
      }
      return true;
    };

    const gameRef = ref(rtdb, `games/${roomId}`);
    const unsubscribeGame = onValue(gameRef, (snapshot) => {
      setGameState(snapshot.val());
    });

    const botsRef = ref(rtdb, `bots/${roomId}`);
    const unsubscribeBots = onValue(botsRef, (snapshot) => {
      const val = snapshot.val();
      setBotsState(val);

      if (val && userProfile) {
        for (const type of Object.keys(val)) {
          if (val[type]?.active) {
            gameBotManager.notifyUserBotPresent(roomId!, userProfile.uid).catch(() => {});
            break;
          }
        }
      }
    });

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

    const kickRef = ref(rtdb, `moderation/kicks/${roomId}/${userProfile.uid}`);
    const unsubscribeKick = onValue(kickRef, async (snapshot) => {
      if (snapshot.exists()) {
        const kickData = snapshot.val();
        const now = Date.now();
        if (now < kickData.canRejoinAt) {
          toast.error('You have been kicked from this room!');
          navigate('/chatrooms');
        }
      }
    });

    unsubscribeRoomSilence = subscribeToRoomSilence(roomId, (state) => {
      if (!state?.active) {
        setIsRoomSilenced(false);
        setRoomSilencedBy(null);
        return;
      }
      setIsRoomSilenced(true);
      setRoomSilencedBy(state.silencedByName || 'moderator');
    });

    unsubscribeVoteKicks = subscribeToVoteKicks(roomId, (records) => {
      setActiveVoteKicks(records || {});
    });

    (async () => {
      const canJoin = await checkKickStatus();
      if (!canJoin || isCancelled) return;

      loadRoom();
      checkBotStatus();
      addToRecentRooms(userProfile.uid, roomId);
      setIsFavorite(userProfile.favoriteRooms?.includes(roomId) || false);

      const roomData = await getChatroomById(roomId);
      if (!roomData || isCancelled) return;

      const participantCount = roomData.participants.length;
      const isNewbiesRoom = roomData.name === 'Newbies';

      let welcomeContent = `Welcome! This room is managed by ${roomData.ownerName}.\n\nThere are ${participantCount} members in this room.`;
      if (isNewbiesRoom) {
        welcomeContent += '\n\nUse /redeem <CODE> to claim bonus USD when codes appear!';
      }
      if (userProfile.isAdmin) {
        welcomeContent += '\n\nAdmin: Start gift contests with /startcontest <minutes> <prize> <giftId>';
        welcomeContent += '\n\nAdmin: Start invite contest with /startinvitecontest';
      }
      if (userProfile.isAdmin || userProfile.isChatAdmin) {
        welcomeContent += '\n\nModerator commands: /kick <user>, /mute <user>, /warn <user>, /silence, /unsilence';
      }

      try {
        const profiles = await getUsersByIds(roomData.participants || []);
        const users = profiles.map((p) => p.username || p.uid);
        const ownerLine = `${roomData.name}: This room is managed by ${roomData.ownerName}!`;
        const participantsLine = `${roomData.name}: Currently in the room: ${users.join(', ')}`;

        const msg1: ChatMessageType = {
          id: 'join_owner_' + Date.now(),
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: 'System',
          content: ownerLine,
          type: 'system',
          timestamp: Date.now()
        };

        const msg2: ChatMessageType = {
          id: 'join_participants_' + (Date.now() + 1),
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: 'System',
          content: participantsLine,
          type: 'system',
          timestamp: Date.now() + 1
        };

        if (!isCancelled) setJoinMessages([msg1, msg2]);
      } catch {
        if (!isCancelled) {
          setJoinMessages([{
            id: 'join_' + Date.now(),
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: 'System',
            content: welcomeContent,
            type: 'system',
            timestamp: Date.now()
          }]);
        }
      }

      if (isNewbiesRoom) {
        const { subscribeToRedeemCodes } = await import('@/lib/redeemCodes');
        if (isCancelled) return;

        unsubscribeCodes = subscribeToRedeemCodes(roomId, (code) => {
          if (code && Date.now() < code.expiresAt) {
            setActiveRedeemCode(code.code);
          } else {
            setActiveRedeemCode(null);
          }
        });

        await checkActiveContest();
        contestInterval = setInterval(() => {
          checkActiveContest();
        }, 60 * 1000);

        await startCodeScheduler();
      } else {
        setActiveRedeemCode(null);
        setActiveContest(null);
      }
    })().catch((e) => {
      console.error('Failed to initialize room realtime bindings:', e);
    });

    return () => {
      isCancelled = true;
      off(gameRef, 'value', unsubscribeGame);
      off(botsRef, 'value', unsubscribeBots);
      off(muteRef, 'value', unsubscribeMute);
      off(kickRef, 'value', unsubscribeKick);
      if (contestInterval) clearInterval(contestInterval);
      if (codeInterval) clearInterval(codeInterval);
      if (schedulerRenewInterval) clearInterval(schedulerRenewInterval);
      if (schedulerRetryInterval) clearInterval(schedulerRetryInterval);
      if (unsubscribeCodes) unsubscribeCodes();
      if (unsubscribeRoomSilence) unsubscribeRoomSilence();
      if (unsubscribeVoteKicks) unsubscribeVoteKicks();
      void releaseScheduler();
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

  useEffect(() => {
    let cancelled = false;
    const loadParticipantProfiles = async () => {
      if (!participants.length) {
        setActiveParticipantProfiles({});
        return;
      }

      try {
        const profiles = await getUsersByIds(participants);
        if (cancelled) return;

        const next: Record<string, { uid: string; username: string; usernameLower: string }> = {};
        profiles.forEach((p) => {
          next[p.uid] = {
            uid: p.uid,
            username: p.username,
            usernameLower: (p.usernameLower || p.username || '').toLowerCase()
          };
        });
        setActiveParticipantProfiles(next);
      } catch (error) {
        console.error('Failed to load active participant profiles:', error);
      }
    };

    loadParticipantProfiles();
    return () => {
      cancelled = true;
    };
  }, [participants]);

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

  useEffect(() => {
    if (!roomId) return;
    const id = window.requestAnimationFrame(() => scrollToBottom());
    return () => window.cancelAnimationFrame(id);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !userProfile) return;
    const records = Object.entries(activeVoteKicks || {});
    if (!records.length) return;

    records.forEach(([targetUserId, record]) => {
      const isExpired = Date.now() > (record.expiresAt || 0);
      if (isExpired) {
        cancelVoteKick(roomId, targetUserId).catch(() => {});
        if (record?.startedBy === userProfile.uid) {
          sendMessage(roomId, {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '⏱️',
            content: `Vote-kick for ${record.targetUsername || 'user'} was cancelled (1 minute timeout).`,
            type: 'system'
          });
        }
        return;
      }

      const stillInRoom = participants.includes(targetUserId);
      if (stillInRoom) return;

      cancelVoteKick(roomId, targetUserId).catch(() => {});
      if (record?.startedBy === userProfile.uid) {
        sendMessage(roomId, {
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '🗳️',
          content: `Vote-kick for ${record.targetUsername || 'user'} was cancelled because they left the room.`,
          type: 'system'
        });
      }
    });
  }, [activeVoteKicks, participants, roomId, userProfile]);

  // Countdown timer for mute

  const cached = getRoomMessages(roomId || '');
  const visibleCached = cached.filter((msg) => {
    if (!msg?.senderId || msg.senderId === 'system' || msg.senderId === userProfile?.uid) return true;
    return !blockedUsersSet.has(msg.senderId);
  });
  const baseMessages = (joinMessages && joinMessages.length > 0) ? [...joinMessages, ...visibleCached] : visibleCached;
  const messagesToRender = isRoomSilenced ? [] : baseMessages;
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
      const { getActiveContest } = await import('@/lib/giftContest');
      const contest = await getActiveContest(roomId);

      // Contest ended handling and announcement are performed server-side by endContest/getActiveContest. No client-side action required here.

      setActiveContest(contest && contest.type === 'gift' ? contest : null);
    } catch (error) {
      console.error('Failed to check contest:', error);
    }
  };

  const loadRoom = async () => {
    if (!roomId) return;
    const canHydrateFromTab = !!roomTab;
    if (canHydrateFromTab) {
      // Hydrate immediately from the tab so switching back to an open room
      // shows messages instantly while fresh room data loads in background.
      setRoom(prev => prev || {
        id: roomId,
        name: fallbackRoomName,
        ownerId: '',
        ownerName: '',
        moderators: [],
        isPrivate: false,
        topic: '',
        participants: [],
        createdAt: Date.now(),
      });
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const roomData = await getChatroomById(roomId);
      if (roomData) {
        setRoom(roomData);
        setParticipants(roomData.participants || []);
        // Register room as a tab; entering room view clears unread state.
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

  const extractMentionsFromMessage = (messageText: string): { mentionUserIds: string[]; mentionUsernames: string[] } => {
    const mentionRegex = /@([a-zA-Z0-9._-]{3,32})/g;
    const foundIds = new Set<string>();
    const foundNames = new Set<string>();
    let match: RegExpExecArray | null = null;

    while ((match = mentionRegex.exec(messageText)) !== null) {
      const usernameKey = match[1]?.toLowerCase();
      if (!usernameKey) continue;
      const participant = participantsByUsernameLower.get(usernameKey);
      if (!participant) continue;
      foundIds.add(participant.uid);
      foundNames.add(participant.username);
    }

    return {
      mentionUserIds: Array.from(foundIds),
      mentionUsernames: Array.from(foundNames)
    };
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

    if (isRoomSilenced) {
      toast.error('Room is currently silenced. Messages are disabled.');
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
            content: `No game bot is active in this room. Add a bot with: /add bot higherlower (or /add bot luckynumber /add bot lowcard /add bot dice).`,
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
    const { mentionUserIds, mentionUsernames } = extractMentionsFromMessage(content);
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
      senderIsChatAdmin: userProfile.isChatAdmin,
      senderIsStaff: userProfile.isStaff,
      mentionUserIds,
      mentionUsernames,
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
    const isOwner = room.ownerId === userProfile.uid;
    const isMod = room.moderators?.includes(userProfile.uid);
    const canModerate = isOwner || isMod || userProfile.isAdmin || userProfile.isChatAdmin;
    const canSilenceRoom = isOwner || userProfile.isAdmin || userProfile.isChatAdmin;

    if (command === 'silence') {
      if (!canSilenceRoom) {
        toast.error('Only room owner, chat admin, or global admin can silence the room');
        return;
      }
      if (isRoomSilenced) {
        toast.info('Room is already silenced');
        return;
      }
      await setRoomSilence(roomId, true, userProfile.uid, userProfile.username);
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🔕',
        content: `Room has been silenced by ${userProfile.username}. No messages are allowed.`,
        type: 'system'
      });
      return;
    }

    if (command === 'unsilence') {
      if (!canSilenceRoom) {
        toast.error('Only room owner, chat admin, or global admin can unsilence the room');
        return;
      }
      await setRoomSilence(roomId, false, userProfile.uid, userProfile.username);
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🔔',
        content: `Room silence has been lifted by ${userProfile.username}.`,
        type: 'system'
      });
      return;
    }

    if (isRoomSilenced) {
      toast.error('Room is silenced. Only /unsilence is allowed.');
      return;
    }

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

    if ((command === 'block' || command === 'unblock') && parts[1]) {
      const targetUsername = parts[1];
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      if (targetUser.uid === userProfile.uid) {
        toast.error('You cannot block/unblock yourself');
        return;
      }

      const result = command === 'block'
        ? await blockUser(userProfile.uid, targetUser.uid)
        : await unblockUser(userProfile.uid, targetUser.uid);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refreshProfile();
      return;
    }

    if (command === 'startkick' && parts[1]) {
      const targetUsername = parts[1];
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      if (targetUser.uid === userProfile.uid) {
        toast.error('You cannot start a vote-kick for yourself');
        return;
      }
      if (targetUser.uid === room.ownerId || targetUser.isAdmin || targetUser.isChatAdmin) {
        toast.error('You cannot start vote-kick for this user');
        return;
      }
      if (!participants.includes(targetUser.uid)) {
        toast.error(`${targetUsername} is not in the room`);
        return;
      }
      if (activeVoteKicks[targetUser.uid]) {
        toast.error('Vote-kick already active for this user');
        return;
      }

      const chargeResult = await chargeVoteKickFee(userProfile.uid, VOTE_KICK_START_FEE);
      if (!chargeResult.success) {
        toast.error(chargeResult.message);
        return;
      }

      const startResult = await startVoteKick(
        roomId,
        targetUser.uid,
        targetUser.username || targetUsername,
        userProfile.uid,
        userProfile.username,
        VOTE_KICK_REQUIRED_VOTES
      );

      if (!startResult.success) {
        // If vote start fails, refund the fee.
        await updateCredits(userProfile.uid, VOTE_KICK_START_FEE);
        await refreshProfile();
        toast.error(startResult.message);
        return;
      }

      await refreshProfile();
      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🗳️',
        content: `${userProfile.username} started vote-kick for ${targetUser.username || targetUsername}. (${startResult.votes}/${VOTE_KICK_REQUIRED_VOTES} votes, 1 minute limit)`,
        type: 'system'
      });
      return;
    }

    if (command === 'votekick' && parts[1]) {
      const targetUsername = parts[1];
      const targetUser = await getUserByUsername(targetUsername);
      if (!targetUser) {
        toast.error('User not found');
        return;
      }
      if (!participants.includes(targetUser.uid)) {
        toast.error(`${targetUsername} is not in the room`);
        return;
      }
      if (targetUser.uid === userProfile.uid) {
        toast.error('You cannot vote to kick yourself');
        return;
      }
      const existing = activeVoteKicks[targetUser.uid];
      if (!existing) {
        toast.error('No active vote-kick for this user');
        return;
      }
      if (existing?.votes?.[userProfile.uid]) {
        toast.error('You already voted');
        return;
      }

      const voteResult = await castVoteKick(roomId, targetUser.uid, userProfile.uid);
      if (!voteResult.success) {
        toast.error(voteResult.message);
        return;
      }

      sendMessage(roomId, {
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🗳️',
        content: `${userProfile.username} voted to kick ${targetUser.username || targetUsername}. (${voteResult.votes}/${voteResult.requiredVotes})`,
        type: 'system'
      });

      if (voteResult.reached) {
        await kickUser(roomId, targetUser.uid, 'community-vote');
        await leaveChatroom(roomId, targetUser.uid);
        await cancelVoteKick(roomId, targetUser.uid);
        sendMessage(roomId, {
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '🚫',
          content: `${targetUser.username || targetUsername} has been kicked by community vote.`,
          type: 'system'
        });
      }
      return;
    }

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
            type: 'gift'
          });
          toast.success('Contest started!');
        }
      } catch (error) {
        toast.error('Failed to start contest');
      }
      return;
    }

    // Admin command: Start invite contest (duration/prizes from constants)
    if (command === 'startinvitecontest' && userProfile.isAdmin) {
      try {
        const result = await startInviteContest();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.contest) {
          toast.success(`Invite contest started for ${INVITE_CONTEST_DURATION_DAYS} day(s).`);
          sendMessage(roomId, {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '🎫',
            content: `INVITE CONTEST STARTED!\nDuration: ${INVITE_CONTEST_DURATION_DAYS} day(s)\nTop 5 prizes: ${INVITE_TOP_PRIZES.join(' / ')} credits\nGrand prize: ${INVITE_GRAND_PRIZE_CREDITS} credits + top pet (random lottery code draw)\n\nInvite friends from Home -> Invite section. Contest details are available in /contests.`,
            type: 'gift'
          });
        }
      } catch (error) {
        toast.error('Failed to start invite contest');
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

    if (command === 'lowcard' || command === 'dice' || command === 'luckynumber' || command === 'higherlower') {
      if (!botActive) {
        toast.info(`Add the bot first with: /add bot ${command}`);
        return;
      }

      let content = '';
      if (command === 'lowcard') {
        content = `🃏 Lowcard game! Use !start <amount> to start a game with a wager. Other players can join with !j within 30 seconds. Lowest card is eliminated each round until one player remains!`;
      } else if (command === 'dice') {
        content = `🎲 Dice game! Use !start <amount> to start a game with a wager. Other players can join with !j within 30 seconds. Highest roll wins each round until one player remains!`;
      } else if (command === 'luckynumber') {
        content = `🔢 Lucky Number! Use !start to begin a new game. Players join with !j <amount> during the join window. During each round submit !guess <number 1-100>. Use !cashout during decision phase to claim payouts. Exact guesses win special multipliers.`;
      } else {
        content = `📈 Higher/Lower! Use !start <amount> to begin and !j to join. Each round the bot shows a card. Choose !h (higher) or !l (lower). Wrong guesses are eliminated until one player remains.`;
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
            type: 'gift'
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

  if (((loading && !hasRoomCache) || !room) || !userProfile) {
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
              <h1 className="heading-tight font-semibold text-body truncate">{room.name}</h1>

            </div>
            <div className="flex items-center gap-2 text-caption text-muted-foreground">
                {/* Bot status indicator */}
                {botsState && Object.keys(botsState).some(k => botsState[k]?.active) && (
                  (() => {
                    const types = Object.keys(botsState).filter(k => botsState[k]?.active);
                    const type = types[0];
                    const last = botsState[type]?.lastActiveAt || botsState[type]?.startedAt || 0;
                    const minutes = Math.max(0, Math.floor((Date.now() - last) / 60000));
                    const handlerName = type === 'bimo'
                      ? 'Bimo'
                      : type === 'luckynumber'
                        ? 'Lucky Number'
                        : type === 'higherlower'
                          ? 'Higher/Lower'
                          : type.charAt(0).toUpperCase() + type.slice(1);
                    return (
                      <span className="ml-2 inline-flex items-center gap-2 text-caption text-muted-foreground">
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

            {(room.ownerId === userProfile.uid || room.moderators?.includes(userProfile.uid) || userProfile.isAdmin || userProfile.isChatAdmin) && (
              <RoomSettings room={room!} onUpdate={loadRoom} />
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLeave}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Gift Contest Banner */}
        {activeContest && activeContest.type === 'gift' && (
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
                {isRoomSilenced ? (
                  <>
                    <p>Room is silenced</p>
                    <p className="text-sm">Messages are hidden until a moderator lifts silence.</p>
                  </>
                ) : (
                  <>
                    <p>No messages yet</p>
                    <p className="text-sm">Be the first to say something!</p>
                  </>
                )}
              </motion.div>
            ) : (
              messagesToRender.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === userProfile.uid}
                  isMentionedToMe={Array.isArray(msg.mentionUserIds) && msg.mentionUserIds.includes(userProfile.uid)}
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

        {isRoomSilenced && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 bg-amber-500/20 border-t border-amber-500/30"
          >
            <div className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-center gap-2 text-sm text-amber-300">
              <span>🔕</span>
              <span>
                Room is silenced{roomSilencedBy ? ` by ${roomSilencedBy}` : ''}. Messages are temporarily disabled.
                {canSilenceControls ? ' Use /unsilence to reopen chat.' : ''}
              </span>
            </div>
          </motion.div>
        )}

        {/* Input */}
        <div className="w-full shrink-0 px-2 sm:px-0">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isMuted || (isRoomSilenced && !canSilenceControls)}
            bimoActive={!!(gameState?.bimo && gameState.bimo.status === 'waiting')}
            ownedEmoticonPacks={(userProfile as any).ownedEmoticonPacks || []}
          />
        </div>
      </div>
    </NewAppLayout>
  );
}



