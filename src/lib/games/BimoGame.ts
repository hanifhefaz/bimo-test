import { ref, get, set, update, remove, runTransaction } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { updateCredits, getUserById, incrementGamesPlayedWeekly, addXP, txParticipants, incrementMiniGameWins, triggerCompanionEvent } from '../firebaseOperations';
import { formatWithCommas } from '../utils';
import { GameHandler, BotMessage, GameSession, GamePlayer } from './types';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

export function suitIcon(s: string) {
  switch (s) {
    case 'hearts': return '♥️';
    case 'diamonds': return '♦️';
    case 'clubs': return '♣️';
    case 'spades': return '♠️';
    default: return s;
  }
}

// multiplier helper useful for tests and centralizing logic
export function payoutMultiplier(count: number): number {
  // conservative multiplier to reduce long-run inflation
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
  // track pending suits locally to block rapid UI clicks
  private pendingSuits: Map<string, Set<string>> = new Map();

  // remove any stored totals or pending data for a given room (called when a game resets)
  private clearRoomTotals(roomId: string) {
    for (const key of Array.from(this.betTotals.keys())) {
      if (key.startsWith(`${roomId}:`)) {
        this.betTotals.delete(key);
      }
    }
    for (const key of Array.from(this.pendingSuits.keys())) {
      if (key.startsWith(`${roomId}:`)) {
        this.pendingSuits.delete(key);
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

    return [{ content: `🃏 ${senderName} started Bimo! Place suit bets using !b <suit> <amount>. You may bet on up to two different suits per round (repeat bets allowed). Betting open for 30s.`, type: 'game' as const }];
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
    const suitMap: Record<string, string> = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };
    const suit = SUITS.includes(suitRaw) ? suitRaw : suitMap[suitRaw];
    if (!suit) {
      return [{ content: 'Invalid suit. Valid suits: hearts, diamonds, clubs, spades.', type: 'private' as const, targetUserId: senderId }];
    }

    // enforce client-side suit limit using pendingSuits to keep up with fast UI clicks
    const pendingKey = `${roomId}:${senderId}`;
    let pending = this.pendingSuits.get(pendingKey);
    if (!pending) {
      pending = new Set<string>();
      this.pendingSuits.set(pendingKey, pending);
    }
    const isNewSuitLocal = !pending.has(suit);
    if (isNewSuitLocal && pending.size >= 2) {
      return [{ content: 'You may only bet on up to two different suits per round. Add to an existing suit or wait for next round.', type: 'private' as const, targetUserId: senderId }];
    }

    // reserve the suit locally immediately so concurrent calls see it
    if (isNewSuitLocal) pending.add(suit);

    // now check credits
    const user = await getUserById(senderId);
    if (!user || user.credits < amount) {
      // remove reservation if credit check fails
      if (isNewSuitLocal) pending.delete(suit);
      return [{ content: 'Insufficient credits to place that bet.', type: 'private' as const, targetUserId: senderId }];
    }

    // run transaction to update player's bets and enforce two-suit limit atomically
    const playersRef = ref(rtdb, `games/${roomId}/bimo/players`);
    const beforeSnap = await get(playersRef);
    const existedBefore = ((beforeSnap.val() as GamePlayer[] | null) || []).some(p => p.userId === senderId);
    let totalForSuit = 0;
    let wasExisting = false;
    const result = await runTransaction(playersRef, (current) => {
      const arr: GamePlayer[] = (current as any) || [];
      let player = arr.find(p => p.userId === senderId);
      if (!player) {
        player = { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now(), bets: [] } as GamePlayer;
        arr.push(player);
      }

      player.bets = player.bets || [];
      // enforce suit limit inside transaction
      const suitsSet = new Set(player.bets.map(b => b.suit));
      if (!suitsSet.has(suit)) suitsSet.add(suit);
      if (suitsSet.size > 2) {
        return; // abort transaction
      }

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

    if (!result.committed) {
      // transaction aborted due to suit limit
      // undo local reservation
      const pending = this.pendingSuits.get(`${roomId}:${senderId}`);
      if (pending) pending.delete(suit);
      return [{ content: 'You may only bet on up to two different suits per round. Add to an existing suit or wait for next round.', type: 'private' as const, targetUserId: senderId }];
    }

    // Keep side-effects out of RTDB transaction callback to avoid duplicate execution on retries.
    if (!existedBefore) {
      try {
        await incrementGamesPlayedWeekly(senderId);
      } catch (e) {
        console.error('Failed to increment gamesPlayedWeekly for Bimo player join', e);
      }
    }

    // verify final state just in case a race slipped through
    const finalSnap = await get(playersRef);
    const finalArr: GamePlayer[] = (finalSnap.val() as any) || [];
    const finalPlayer = finalArr.find(p => p.userId === senderId);
    const finalSuits = new Set(finalPlayer?.bets?.map(b => b.suit));
    if (finalSuits.size > 2) {
      // rollback this bet: subtract amount or remove suit entry
      await runTransaction(playersRef, (current) => {
        const arr: GamePlayer[] = (current as any) || [];
        const pl = arr.find(p => p.userId === senderId);
        if (pl && pl.bets) {
          const bet = pl.bets.find((b: any) => b.suit === suit);
          if (bet) {
            if (bet.amount > amount) {
              bet.amount -= amount;
            } else {
              pl.bets = pl.bets.filter((b: any) => b.suit !== suit);
            }
          }
        }
        return arr as any;
      });
      // undo pending reservation
      const pending = this.pendingSuits.get(`${roomId}:${senderId}`);
      if (pending) pending.delete(suit);
      // no credits deducted yet, so nothing to refund
      return [{ content: 'You may only bet on up to two different suits per round. Add to an existing suit or wait for next round.', type: 'private' as const, targetUserId: senderId }];
    }

    // at this point transaction succeeded and limit still holds - deduct credits and log
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
    spades: '♠️'
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
    const freq: Record<string, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
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
      try {
        const losers = (game.players || []).map((p) => p.userId);
        await Promise.all(losers.map((uid) => triggerCompanionEvent(uid, 'mini_game_loss', { roomId })));
      } catch (e) {
        console.warn('Failed to trigger companion mini_game_loss events (bimo no winners):', e);
      }
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
        // Award winner XP (once per winning user per round)
        try { await addXP(uid, 20); } catch (e) { console.warn('Failed to award winner XP to Bimo winner:', e); }
        try { await incrementMiniGameWins(uid); } catch (e) { console.warn('Failed to track mini-game win (bimo):', e); }
        try { await triggerCompanionEvent(uid, 'mini_game_win', { roomId }); } catch (e) { console.warn('Failed to trigger companion mini_game_win (bimo):', e); }
        try { await triggerCompanionEvent(uid, 'high_amount_game_win', { roomId, amount: info.total }); } catch (e) { console.warn('Failed to trigger companion high_amount_game_win (bimo):', e); }
      }
      try {
        const winnerIdSet = new Set(Object.keys(byUser));
        const losers = (game.players || []).filter((p) => !winnerIdSet.has(p.userId));
        await Promise.all(losers.map((p) => triggerCompanionEvent(p.userId, 'mini_game_loss', { roomId })));
      } catch (e) {
        console.warn('Failed to trigger companion mini_game_loss events (bimo):', e);
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
              // Announce bumper publicly
              await this.sendBotMessage(roomId, `🚀 BUMPER! ${info.username} receives an extra ${formatWithCommas(extra)} credits!`, 'game');
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
