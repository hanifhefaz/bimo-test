import { ref, get, set, update, remove, runTransaction } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { updateCredits, getUserById, incrementGamesPlayedWeekly, addXP, txParticipants } from '../firebaseOperations';
import { formatWithCommas } from '../utils';
import { GameHandler, BotMessage, GameSession, GamePlayer } from './types';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades', 'flag', 'king'];

export function suitIcon(s: string) {
  switch (s) {
    case 'hearts': return '♥️';
    case 'diamonds': return '♦️';
    case 'clubs': return '♣️';
    case 'spades': return '♠️';
    case 'flag': return '🏳️';
    case 'king': return '👑';
    default: return s;
  }
}

// multiplier helper useful for tests and centralizing logic
export function payoutMultiplier(count: number): number {
  // apply adjusted multiplier (90% of raw count): 2=>1.8x, 3=>2.7x, etc
  return count * 0.9;
}

// compute total bet amount for a specific suit (order-independent)
export function totalBetAmount(bets: Array<{ suit: string; amount: number }>, suit: string): number {
  return bets.filter(b => b.suit === suit).reduce((sum, b) => sum + b.amount, 0);
}

// helper for internal map tracking (also exported for tests)
export function recordBet(
  betTotals: Map<string, number>,
  roomId: string,
  userId: string,
  suit: string,
  amount: number
): number {
  const key = `${roomId}:${userId}:${suit}`;
  const prev = betTotals.get(key) || 0;
  const next = prev + amount;
  betTotals.set(key, next);
  return next;
}

// (Duplicate buildBetMessage removed)

// winners announcement helpers
export function composeWinnerAnnouncement(username: string, total: number, lines: string[]): string {
  const detailText = lines.join(', ');
  return `🎉 ${username} wins ${formatWithCommas(total)} USD! ${detailText}`;
}

export function composeWinnerPrivate(username: string, total: number, lines: string[]): string {
  const detailText = lines.join(', ');
  return `🎉 Congratulations ${username}! You won ${formatWithCommas(total)} credits! ${detailText}`;
}

// build the public game message when a bet is placed/added
export function buildBetMessage(
  senderName: string,
  suitIconStr: string,
  suit: string,
  amt: number,
  totalForSuit: number,
  wasExisting: boolean
): string {
  if (wasExisting) {
    // show the new bet amount and also the running total
    return `🃏 ${senderName} bets ${formatWithCommas(amt)} USD on ${suitIconStr} ${suit} (total ${formatWithCommas(totalForSuit)} USD)!`;
  }
  return `🃏 ${senderName} bets ${formatWithCommas(amt)} USD on ${suitIconStr} ${suit}!`;
}

export class BimoGame implements GameHandler {
  readonly gameType = 'bimo';
  readonly botName = 'Bimo';
  readonly botAvatar = '🃏';

  private timers: Map<string, NodeJS.Timeout> = new Map();
  // track bet totals per room+user+suit to avoid DB race issues
  private betTotals: Map<string, number> = new Map();

  // remove any stored totals for a given room (called when a game resets)
  private clearRoomTotals(roomId: string) {
    for (const key of Array.from(this.betTotals.keys())) {
      if (key.startsWith(`${roomId}:`)) {
        this.betTotals.delete(key);
      }
    }
  }

  // Bumper configuration: chance percentage (e.g., 0.5 = 0.5%) and multiplier (0.5 = 50%)
  // Adjust `bumperChancePct` in code to control how rare bumpers are.
  private readonly bumperChancePct = 10; // percent
  private readonly bumperMultiplier = 0.25; // 50% extra payout

  getWelcomeMessage(): string {
    return `🃏 Bimo has joined the room! Use !start to begin a betting round.`;
  }

  getRemovalMessage(): string {
    return '🃏 Bimo has left the room.';
  }

  async isGameInProgress(roomId: string): Promise<boolean> {
    const gameRef = ref(rtdb, `games/${roomId}/bimo`);
    const snap = await get(gameRef);
    if (!snap.exists()) return false;
    const game = snap.val() as GameSession;
    return game.status === 'waiting' || game.status === 'playing';
  }

  async forceEnd(roomId: string): Promise<void> {
    const timerKey = `${roomId}:game`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }
    // clear bet totals related to this room
    this.clearRoomTotals(roomId);
    const gameRef = ref(rtdb, `games/${roomId}/bimo`);
    await remove(gameRef);
  }

  async handleCommand(
    command: string,
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string
  ): Promise<BotMessage[]> {
    const messages: BotMessage[] = [];
    const gameRef = ref(rtdb, `games/${roomId}/bimo`);
    const snap = await get(gameRef);
    const currentGame = snap.exists() ? snap.val() as GameSession : null;

    switch (command) {
      case 'start':
        return await this.handleStart(senderId, senderName, roomId, currentGame);
      case 'b':
      case 'bet':
        return await this.handleBet(args, senderId, senderName, roomId, currentGame);
    }

    return messages;
  }

  private async handleStart(senderId: string, senderName: string, roomId: string, currentGame: GameSession | null): Promise<BotMessage[]> {
    if (currentGame && currentGame.status !== 'finished') {
      return [{ content: 'A Bimo game is already active in this room.', type: 'private' as const, targetUserId: senderId } as const];
    }

    // clear any leftover totals from previous rounds in this room so new games start clean
    this.clearRoomTotals(roomId);

    const gameData: GameSession = {
      id: `bimo_${Date.now()}`,
      roomId,
      gameType: 'bimo',
      status: 'waiting',
      betAmount: 0,
      players: [],
      currentRound: 0,
      createdBy: senderId,
      createdAt: Date.now()
    };

    const gameRef = ref(rtdb, `games/${roomId}/bimo`);
    await set(gameRef, gameData);

    this.scheduleJoinPhaseEnd(roomId);

    return [{ content: `🃏 ${senderName} started Bimo! Place suit bets using !b <suit> <amount>. You may bet on any number of suits. Betting open for 30s.`, type: 'game' as const }];
  }

  private async handleBet(args: string[], senderId: string, senderName: string, roomId: string, currentGame: GameSession | null): Promise<BotMessage[]> {
    if (!currentGame || currentGame.status !== 'waiting') {
      return [{ content: 'No Bimo game is currently accepting bets.', type: 'private' as const, targetUserId: senderId }];
    }

    // Validate args: new format is !b <suit> <amount>
    const MIN_BET = 0.05;
    const suitRaw = (args[0] || '').toLowerCase();
    const amount = parseFloat(args[1]) || 0;

    if (!suitRaw || amount < MIN_BET) {
      return [{
        content: `Minimum bet is USD ${MIN_BET.toFixed(2)}. Use !b <suit> <amount>`,
        type: 'private' as const,
        targetUserId: senderId
      }];
    }

    // map common short forms for suit
    const suitMap: Record<string, string> = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades', f: 'flag', k: 'king' };
    const suit = SUITS.includes(suitRaw) ? suitRaw : suitMap[suitRaw];
    if (!suit) {
      return [{ content: 'Invalid suit. Valid suits: hearts, diamonds, clubs, spades, flag, king.', type: 'private' as const, targetUserId: senderId }];
    }

    const user = await getUserById(senderId);
    if (!user || user.credits < amount) {
      return [{ content: 'Insufficient credits to place that bet.', type: 'private' as const, targetUserId: senderId }];
    }

    // Deduct credits immediately
    await updateCredits(senderId, -amount);
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: txParticipants(senderId, 'game'),
      amount,
      type: 'game_bet',
      description: `Bimo bet on ${suit}`,
      timestamp: serverTimestamp()
    });

    // use transaction on players array to avoid missing concurrent bets
    const playersRef = ref(rtdb, `games/${roomId}/bimo/players`);
    let totalForSuit = 0;
    let wasExisting = false;

    await runTransaction(playersRef, (current) => {
      const arr: GamePlayer[] = (current as any) || [];
      let player = arr.find(p => p.userId === senderId);
      if (!player) {
        player = { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now(), bets: [] } as GamePlayer;
        arr.push(player);
        try { incrementGamesPlayedWeekly(senderId); } catch (e) { console.error('Failed to increment gamesPlayedWeekly for Bimo player join', e); }
      }

      player.bets = player.bets || [];
      const existing = player.bets.find(b => b.suit === suit);
      if (existing) {
        existing.amount += amount;
        wasExisting = true;
      } else {
        player.bets.push({ suit, amount });
      }
      totalForSuit = player.bets
        .filter(b => b.suit === suit)
        .reduce((s, b) => s + b.amount, 0);
      return arr as any;
    });

    // update internal running total for messaging
    const mapKey = `${roomId}:${senderId}:${suit}`;
    const priorTotal = this.betTotals.get(mapKey) || 0;
    const newTotal = priorTotal + amount;
    this.betTotals.set(mapKey, newTotal);
    // ensure alignment with transaction total
    totalForSuit = newTotal;

    const suitIcons: Record<string, string> = {
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    spades: '♠️',
    flag: '🏳️',
    king: '👑'
    };

    const suitIcon = suitIcons[suit];

    const isRepeat = totalForSuit > amount;
    const messageContent = buildBetMessage(senderName, suitIcon, suit, amount, totalForSuit, isRepeat);

    return [{ content: messageContent, type: 'game' as const }];
  }

  private scheduleJoinPhaseEnd(roomId: string) {
    const timerKey = `${roomId}:game`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
    }
    const timer = setTimeout(() => this.endJoinPhase(roomId), 30000);
    this.timers.set(timerKey, timer);
  }

  private async endJoinPhase(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/bimo`);
    const snap = await get(gameRef);
    const game = snap.exists() ? snap.val() as GameSession : null;
    if (!game || game.status !== 'waiting') return;

    if (!game.players || game.players.length === 0) {
      await remove(gameRef);
      await this.sendBotMessage(roomId, '❌ No bets placed. Bimo game cancelled.', 'game');
      return;
    }

    // Draw 6 random suits
    const draws: string[] = [];
    for (let i = 0; i < 6; i++) {
      const s = SUITS[Math.floor(Math.random() * SUITS.length)];
      draws.push(s);
    }

    // Count frequencies (include new suits)
    const freq: Record<string, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0, flag: 0, king: 0 };
    for (const d of draws) freq[d] = (freq[d] || 0) + 1;

    // Update game to playing and store draws
    await update(gameRef, { status: 'playing', currentRound: 1, startedAt: Date.now(), players: game.players, botCard: null });

    // Award join XP to all players now that the game is starting
    try {
      for (const p of game.players || []) {
        try { await addXP(p.userId, 10); } catch (e) { console.warn('Failed to award join XP to Bimo player:', e); }
      }
    } catch (e) {
      console.error('Failed to award join XP to Bimo players:', e);
    }

    // Announce draws
    const display = draws.map(s => {
      switch (s) {
        case 'hearts': return '♥️';
        case 'diamonds': return '♦️';
        case 'clubs': return '♣️';
        case 'spades': return '♠️';
        case 'flag': return '🏳️';
        case 'king': return '👑';
        default: return s;
      }
    }).join(' ');

    await this.sendBotMessage(roomId, `🃏 Bimo draws: ${display}`, 'game');

    // Payouts
    const winners: Array<{ userId: string; username: string; amount: number; placed: number; suit: string }> = [];
    for (const p of game.players) {
      let payoutTotal = 0;
      for (const b of p.bets || []) {
        const count = freq[b.suit] || 0;
        if (count >= 2) {
          // apply adjusted multiplier (90% of raw count): 2=>1.8x, 3=>2.7x, etc
          const multiplier = payoutMultiplier(count);
          const pay = b.amount * multiplier;
          payoutTotal += pay;
          const icon = suitIcon(b.suit);
          // include suit and multiplier in details for clearer messages
          winners.push({
            userId: p.userId,
            username: p.username,
            amount: pay,
            placed: b.amount,
            suit: b.suit
          });
          // credit user
          await updateCredits(p.userId, pay);
          await addDoc(collection(db, 'transactions'), {
            from: 'game',
            to: p.userId,
            participants: [p.userId],
            toUsername: p.username,
            amount: pay,
            type: 'game_win',
            description: `Bimo payout for ${b.suit} x${count}`,
            timestamp: serverTimestamp()
          });
        }
      }
    }

    if (winners.length === 0) {
      await this.sendBotMessage(roomId, '🃏 No winners this round.', 'game');
    } else {
      // Announce winners grouped by user
      const byUser: Record<string, { username: string; total: number; lines: string[] }> = {};
      for (const w of winners) {
        if (!byUser[w.userId]) byUser[w.userId] = { username: w.username, total: 0, lines: [] };
        byUser[w.userId].total += w.amount;
        const icon = suitIcon(w.suit);
        byUser[w.userId].lines.push(
          `${formatWithCommas(w.amount)} USD for placing ${formatWithCommas(w.placed)} USD on ${icon} ${w.suit}`
        );
      }

      // Announce each winner
      for (const uid of Object.keys(byUser)) {
        const info = byUser[uid];
        const detailText = info.lines.join(', ');
        await this.sendBotMessage(roomId, composeWinnerAnnouncement(info.username, info.total, info.lines), 'game');
        // Private notification for each winner
        await this.sendBotMessage(roomId, composeWinnerPrivate(info.username, info.total, info.lines), 'private', uid);
        // Award winner XP (once per winning user per round)
        try { await addXP(uid, 20); } catch (e) { console.warn('Failed to award winner XP to Bimo winner:', e); }
      }
      // Very rare bumper win: single roll controlling all winners (configurable via `bumperChancePct`)
      try {
        const roll = Math.random() * 100; // 0-100
        if (roll < this.bumperChancePct) {
          const bumperLines: string[] = [];
          for (const uid of Object.keys(byUser)) {
            const info = byUser[uid];
            const extra = Math.floor(info.total * this.bumperMultiplier);
            if (extra > 0) {
              // Credit the extra bumper amount
              await updateCredits(uid, extra);
              await addDoc(collection(db, 'transactions'), {
                from: 'game',
                to: uid,
                participants: [uid],
                toUsername: info.username,
                amount: extra,
                type: 'game_bumper',
                description: `Bimo bumper bonus (${this.bumperMultiplier * 100}%)`,
                timestamp: serverTimestamp()
              });

              bumperLines.push(`${info.username} +${formatWithCommas(extra)}`);
              // Announce per-winner bumper privately and publicly
              await this.sendBotMessage(roomId, `🚀 BUMPER! ${info.username} receives an extra ${formatWithCommas(extra)} credits!`, 'game');
              await this.sendBotMessage(roomId, `🚀 BUMPER! ${info.username}, you received an extra ${formatWithCommas(extra)} credits!`, 'private', uid);
            }
          }

          if (bumperLines.length > 0) {
            await this.sendBotMessage(roomId, `🎊 BUMPER WIN! Extra ${this.bumperMultiplier * 100}% awarded to winners: ${bumperLines.join(', ')}`, 'game');
          }
        }
      } catch (e) {
        // Don't let bumper errors block finishing the game
        console.error('Bumper processing failed', e);
      }
    }

    // Finish game
    await update(gameRef, { status: 'finished', endedAt: Date.now() });

    // once the round is over, drop totals for this room to avoid leaking into next game
    this.clearRoomTotals(roomId);

    // Remove game after short delay
    setTimeout(async () => { try { await remove(gameRef); } catch (e) { /* ignore */ } }, 5000);
  }

  private async sendBotMessage(roomId: string, content: string, type: 'game' | 'private', targetUserId?: string) {
    const { push } = await import('firebase/database');
    const messagesRef = ref(rtdb, `messages/${roomId}`);
    const messageData: Record<string, any> = {
      roomId,
      senderId: 'bot',
      senderName: this.botName,
      senderAvatar: this.botAvatar,
      content,
      type,
      timestamp: Date.now()
    };
    if (targetUserId) messageData.targetUserId = targetUserId;
    await push(messagesRef, messageData);
  }
}

export const bimoGame = new BimoGame();
