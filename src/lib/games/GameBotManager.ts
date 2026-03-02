// Game Bot Manager - Centralized bot management with one-bot-per-room restriction
import { ref, get, set, remove, onChildAdded, off, DataSnapshot, push, runTransaction } from 'firebase/database';
import { rtdb } from '../firebase';
import { GameHandler, BotMessage } from './types';
import { lowcardGame } from './LowcardGame';
import { diceGame } from './DiceGame';
import { bimoGame } from './BimoGame';
import { luckyNumberGame } from './LuckyNumberGame';
import { higherLowerGame } from './HigherLowerGame';

const CONTROLLER_TTL_MS = 30 * 1000; // 30s controller claim TTL
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes inactivity timeout

// Registry of available games - add new games here
const GAME_REGISTRY: Record<string, GameHandler> = {
  lowcard: lowcardGame,
  dice: diceGame,
  bimo: bimoGame,
  luckynumber: luckyNumberGame,
  higherlower: higherLowerGame,
  // Add more games here
};

interface ActiveBot {
  roomId: string;
  gameType: string;
  handler: GameHandler;
  commandListener: ((snap: DataSnapshot) => void) | null;
  startTime: number;
  // Timer used to watch for inactivity and auto-remove stale bots
  inactivityTimer?: NodeJS.Timeout | null;
}

class GameBotManager {
  private activeBots: Map<string, ActiveBot> = new Map(); // Key is roomId (only one bot per room)
  // Unique id for this manager instance - used to claim ownership of bots in RTDB
  private instanceId: string = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  /**
   * Add a bot to a room - ONLY ONE BOT PER ROOM ALLOWED
   * @returns Error message if failed, null if successful
   */
  async addBot(roomId: string, gameType: string): Promise<string | null> {
    // Get the game handler
    const handler = GAME_REGISTRY[gameType];
    if (!handler) {
      return `Unknown game type: ${gameType}. Available: ${Object.keys(GAME_REGISTRY).join(', ')}`;
    }

    // Check if a bot already exists in this room (local check)
    if (this.activeBots.has(roomId)) {
      const existing = this.activeBots.get(roomId)!;
      if (existing.gameType === gameType) {
        // Same bot type already active locally - just refresh lastActiveAt and return success
        await set(ref(rtdb, `bots/${roomId}/${gameType}/lastActiveAt`), Date.now());
        return null; // Already active, no error
      }
      return `A ${existing.gameType} bot is already active in this room. Remove it first with /remove bot.`;
    }

    // Check RTDB for existing bot (in case of server restart or other clients)
    const botRef = ref(rtdb, `bots/${roomId}`);
    const botSnap = await get(botRef);
    if (botSnap.exists()) {
      const botData = botSnap.val();
      // Check if there's any active bot
      for (const type of Object.keys(botData)) {
        if (botData[type]?.active) {
          if (type === gameType) {
            // Same bot type exists in RTDB - adopt it locally and refresh
            const bot: ActiveBot = {
              roomId,
              gameType,
              handler,
              commandListener: null,
              startTime: Date.now(),
              inactivityTimer: null
            };
            this.startCommandListener(bot);
            this.activeBots.set(roomId, bot);
            // Start inactivity watcher so orphaned bots get cleaned up even if no commands arrive
            this.startInactivityWatcher(bot);
            await set(ref(rtdb, `bots/${roomId}/${gameType}/lastActiveAt`), Date.now());
            // Do not send a public reminder when adopting an existing bot to avoid duplicate messages
            return null; // Adopted existing bot, no error
          }
          return `A ${type} bot is already active in this room. Remove it first with /remove bot.`;
        }
      }
    }

    // Create the bot
    const bot: ActiveBot = {
      roomId,
      gameType,
      handler,
      commandListener: null,
      startTime: Date.now()
    };

    // Atomically claim the bot slot for this room so concurrent adds cannot succeed
    const botsRef = ref(rtdb, `bots/${roomId}`);
    const tr = await runTransaction(botsRef, (current: any) => {
      if (!current) {
        return {
          [gameType]: { active: true, startedAt: Date.now(), lastActiveAt: Date.now() }
        };
      }
      // If any active bot already exists, abort the transaction
      for (const t of Object.keys(current)) {
        if (current[t]?.active) {
          if (t === gameType) {
            // Same type - just update lastActiveAt
            current[t].lastActiveAt = Date.now();
            return current;
          }
          return; // abort - different bot type
        }
      }
      // Otherwise set this game type as active
      current[gameType] = { active: true, startedAt: Date.now(), lastActiveAt: Date.now() };
      return current;
    });

    if (!tr.committed) {
      return `A bot was added concurrently in this room. Remove it first or try again.`;
    }

    // Start listening to commands
    this.startCommandListener(bot);

    // Store locally
    this.activeBots.set(roomId, bot);
    // Start inactivity watcher so the bot will auto-leave after prolonged inactivity
    this.startInactivityWatcher(bot);

    // Send welcome message to chat (PUBLIC - visible to all)
    await this.sendBotMessageToChat(roomId, handler.getWelcomeMessage(), 'game', handler);

    return null;
  }

  /**
   * Remove a bot from a room
   * @returns Error message if failed, null if successful
   */
  async removeBot(roomId: string): Promise<string | null> {
    const bot = this.activeBots.get(roomId);

    // First check RTDB for any active bot
    const botRef = ref(rtdb, `bots/${roomId}`);
    const botSnap = await get(botRef);

    if (!bot && !botSnap.exists()) {
      return 'No bot is active in this room.';
    }

    // Check if game is in progress
    if (bot) {
      const inProgress = await bot.handler.isGameInProgress(roomId);
      if (inProgress) {
        return 'Cannot remove bot while a game is in progress. Wait for the game to finish.';
      }

      // Stop command listener
      if (bot.commandListener) {
        const cmdRef = ref(rtdb, `botcommands/${roomId}`);
        off(cmdRef, 'child_added', bot.commandListener as any);
      }

      // Ensure any other listeners we may have left on this path are cleared (extra safety)
      try {
        const cmdRef = ref(rtdb, `botcommands/${roomId}`);
        off(cmdRef);
      } catch (e) { /* ignore */ }

      // Force end any scheduled timers or game state in the game handler
      try {
        await bot.handler.forceEnd(roomId);
      } catch (e) {
        // ignore errors during cleanup
        console.warn('Error during handler.forceEnd:', e);
      }

      // Send removal message (PUBLIC - visible to all)
      await this.sendBotMessageToChat(roomId, bot.handler.getRemovalMessage(), 'game', bot.handler);

      // Clean up RTDB (remove only this game type entry)
      await remove(ref(rtdb, `bots/${roomId}/${bot.gameType}`));
      await remove(ref(rtdb, `games/${roomId}/${bot.gameType}`));

      // Clear inactivity timer if one exists
      if (bot.inactivityTimer) {
        clearInterval(bot.inactivityTimer as any);
      }

      // Remove from local map
      this.activeBots.delete(roomId);
    } else if (botSnap.exists()) {
      // Bot exists in RTDB but not locally - clean up
      const botData = botSnap.val();
      for (const type of Object.keys(botData)) {
        if (botData[type]?.active) {
          // Check if game in progress via the handler
          const handler = GAME_REGISTRY[type];
          if (handler) {
            const inProgress = await handler.isGameInProgress(roomId);
            if (inProgress) {
              return `Cannot remove ${type} bot while a game is in progress.`;
            }
            // Force end any scheduled timers or game state
            try {
              await handler.forceEnd(roomId);
            } catch (e) {
              console.warn('Error during handler.forceEnd:', e);
            }
            // Send removal message
            await this.sendBotMessageToChat(roomId, handler.getRemovalMessage(), 'game', handler);
          }
        }
      }
      await remove(botRef);
    }

    return null;
  }

  /**
   * Check if any bot is active in a room
   */
  async isBotActive(roomId: string): Promise<boolean> {
    if (this.activeBots.has(roomId)) return true;

    const botRef = ref(rtdb, `bots/${roomId}`);
    const snap = await get(botRef);
    if (!snap.exists()) return false;

    const botData = snap.val();
    return Object.values(botData).some((b: any) => b?.active);
  }

  /**
   * Notify a single user privately that a bot is present in the room
   */
  async notifyUserBotPresent(roomId: string, userId: string): Promise<void> {
    try {
      const botType = await this.getActiveBotType(roomId);
      if (!botType) return;
      const handler = GAME_REGISTRY[botType];
      if (!handler) return;

      const noteRef = ref(rtdb, `botNotifications/${roomId}/${userId}`);

      // Atomically create the notification marker so only one client can claim and send the private message.
      try {
        const tr = await runTransaction(noteRef, (current: any) => {
          if (current) {
            // Someone already created the marker — abort the transaction
            return;
          }
          return { sentAt: Date.now(), botType };
        });

        // If the transaction did not commit it means someone else set the marker — don't send again
        if (!tr.committed) return;
      } catch (e) {
        // If transactions are not available or fail, fall back to a get/check/set pattern but be conservative
        try {
          const noteSnap = await get(noteRef);
          if (noteSnap.exists()) return;
          await set(noteRef, { sentAt: Date.now(), botType });
        } catch (s) {
          // If even the fallback fails, log and bail to avoid spamming
          console.warn('Failed to set bot notification marker, aborting notify to avoid duplicates:', s);
          return;
        }
      }

      // Now send the private message (we already reserved the marker)
      try {
        await this.sendBotMessageToChat(roomId, handler.getWelcomeMessage(), 'private', handler, userId);
      } catch (sendErr) {
        console.warn('Failed to send private bot notification after reserving marker:', sendErr);
      }
    } catch (e) {
      console.warn('Failed to notify user of bot presence:', e);
    }
  }

  /**
   * Get the type of active bot in a room
   */
  async getActiveBotType(roomId: string): Promise<string | null> {
    const bot = this.activeBots.get(roomId);
    if (bot) return bot.gameType;

    const botRef = ref(rtdb, `bots/${roomId}`);
    const snap = await get(botRef);
    if (!snap.exists()) return null;

    const botData = snap.val();
    for (const type of Object.keys(botData)) {
      if (botData[type]?.active) return type;
    }
    return null;
  }

  private startCommandListener(bot: ActiveBot) {
    const cmdRef = ref(rtdb, `botcommands/${bot.roomId}`);

    bot.commandListener = async (snapshot: DataSnapshot) => {
      const msg = snapshot.val();
      if (!msg || typeof msg.content !== 'string') return;
      if (msg.senderId === 'bot') return;
      if (!msg.content.startsWith('!')) return;
      if (msg.timestamp && msg.timestamp < bot.startTime) return;

      const metaRef = ref(rtdb, `bots/${bot.roomId}/${bot.gameType}`);
      const metaSnap = await get(metaRef);
      if (!metaSnap.exists()) return;
      const meta = metaSnap.val();

      // Inactivity cleanup: if lastActiveAt is too old, remove the bot and clear game state
      if (meta.lastActiveAt && (Date.now() - meta.lastActiveAt) > INACTIVITY_TIMEOUT_MS) {
        // Try to force end and remove stale bot
        try { await bot.handler.forceEnd(bot.roomId); } catch (e) { console.warn(e); }
        try { await remove(ref(rtdb, `bots/${bot.roomId}/${bot.gameType}`)); } catch (e) { /* ignore */ }
        try { await remove(ref(rtdb, `games/${bot.roomId}/${bot.gameType}`)); } catch (e) { /* ignore */ }
        // Announce auto-removal due to inactivity
        try {
          await this.sendBotMessageToChat(bot.roomId, `🃏 ${bot.handler.botName} left due to 20 minutes of inactivity.`, 'game', bot.handler);
        } catch (e) { /* ignore */ }
        // Clean up local state and timers
        const local = this.activeBots.get(bot.roomId);
        if (local?.inactivityTimer) {
          clearInterval(local.inactivityTimer as any);
        }
        this.activeBots.delete(bot.roomId);
        if (bot.commandListener) {
          try { off(ref(rtdb, `botcommands/${bot.roomId}`), 'child_added', bot.commandListener as any); } catch (e) { /* ignore */ }
        }
        return;
      }

      if (!meta?.active) return;

      // Try to claim controller if not owned or expired
      const controllerRef = ref(rtdb, `bots/${bot.roomId}/${bot.gameType}/controller`);
      let claimedByMe = false;
      try {
        const trRes = await runTransaction(controllerRef, (current: any) => {
          if (!current || !current.expiresAt || current.expiresAt < Date.now()) {
            return { id: this.instanceId, expiresAt: Date.now() + CONTROLLER_TTL_MS };
          }
          return; // abort
        });
        const val = trRes.snapshot?.val();
        claimedByMe = !!val && val.id === this.instanceId;
      } catch (e) {
        // ignore transaction failures
      }

      // Also allow processing if already owned by us
      const latestMeta = (await get(metaRef)).val();
      const controller = latestMeta?.controller || {};
      if (!claimedByMe && controller.id !== this.instanceId) return;

      // Refresh controller expiry and lastActiveAt
      try {
        await set(ref(rtdb, `bots/${bot.roomId}/${bot.gameType}/controller`), { id: this.instanceId, expiresAt: Date.now() + CONTROLLER_TTL_MS });
        await set(ref(rtdb, `bots/${bot.roomId}/${bot.gameType}/lastActiveAt`), Date.now());
      } catch (e) { /* ignore */ }

      await this.handleCommand(bot, msg);
    };

    onChildAdded(cmdRef, bot.commandListener as any);
  }

  private async handleCommand(bot: ActiveBot, message: any) {
    const content = message.content.slice(1).trim();
    const parts = content.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const botMessages = await bot.handler.handleCommand(
      command,
      args,
      message.senderId,
      message.senderName,
      bot.roomId
    );

    // Send all messages - properly route public vs private
    for (const msg of botMessages) {
      await this.sendBotMessageToChat(
        bot.roomId,
        msg.content,
        msg.type,
        bot.handler,
        msg.targetUserId
      );
    }
  }

  private startInactivityWatcher(bot: ActiveBot) {
    // Clear any existing watcher
    if (bot.inactivityTimer) {
      clearInterval(bot.inactivityTimer as any);
      bot.inactivityTimer = null;
    }

    // Poll every minute and remove bot if lastActiveAt exceeds timeout
    bot.inactivityTimer = setInterval(async () => {
      try {
        const metaRef = ref(rtdb, `bots/${bot.roomId}/${bot.gameType}`);
        const snap = await get(metaRef);
        if (!snap.exists()) return;
        const meta = snap.val();
        if (meta.lastActiveAt && (Date.now() - meta.lastActiveAt) > INACTIVITY_TIMEOUT_MS) {
          try { await bot.handler.forceEnd(bot.roomId); } catch (e) { console.warn(e); }
          try { await remove(ref(rtdb, `bots/${bot.roomId}/${bot.gameType}`)); } catch (e) { /* ignore */ }
          try { await remove(ref(rtdb, `games/${bot.roomId}/${bot.gameType}`)); } catch (e) { /* ignore */ }
          try { await this.sendBotMessageToChat(bot.roomId, `🃏 ${bot.handler.botName} left due to 20 minutes of inactivity.`, 'game', bot.handler); } catch (e) { /* ignore */ }
          if (bot.inactivityTimer) {
            clearInterval(bot.inactivityTimer as any);
          }
          if (bot.commandListener) {
            try { off(ref(rtdb, `botcommands/${bot.roomId}`), 'child_added', bot.commandListener as any); } catch (e) { /* ignore */ }
          }
          this.activeBots.delete(bot.roomId);
        }
      } catch (e) {
        console.warn('Inactivity watcher error', e);
      }
    }, 60 * 1000);
  }

  /**
   * Send bot message directly to the chat messages collection
   * This ensures messages are visible in the room
   */
  private async sendBotMessageToChat(
    roomId: string,
    content: string,
    type: 'game' | 'private',
    handler: GameHandler,
    targetUserId?: string
  ) {
    const messagesRef = ref(rtdb, `messages/${roomId}`);

    // Build message object - only include targetUserId if defined (Firebase doesn't allow undefined)
    const messageData: Record<string, any> = {
      roomId,
      senderId: 'bot',
      senderName: handler.botName,
      senderAvatar: handler.botAvatar,
      content,
      type,
      timestamp: Date.now()
    };

    // Only add targetUserId if it's actually provided (for private messages)
    if (targetUserId) {
      messageData.targetUserId = targetUserId;
    }

    await push(messagesRef, messageData);
  }

  /**
   * Get list of available game types
   */
  getAvailableGames(): string[] {
    return Object.keys(GAME_REGISTRY);
  }
}

// Singleton instance
export const gameBotManager = new GameBotManager();
