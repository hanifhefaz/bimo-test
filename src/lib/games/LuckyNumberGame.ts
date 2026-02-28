// Lucky Number Game - Implements the locked rules prompt
import { ref, get, set, update, remove, push } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { updateCredits, addXP, getUserById, incrementGamesPlayedWeekly } from '../firebaseOperations';
import { formatWithCommas } from '../utils';
import { GameHandler, BotMessage, GameSession } from './types';

type NSPlayer = {
  userId: string;
  username: string;
  betAmount: number;
  isActive: boolean; // true unless eliminated or cashed out
  hasCashedOut?: boolean;
  lastGuess?: number | null;
  hasGuessed?: boolean;
  joinedAt: number;
};

type NSGame = {
  id: string;
  roomId: string;
  gameType: 'luckynumber';
  status: 'waiting' | 'playing' | 'finished';
  betAmount: number;
  players: NSPlayer[];
  currentRound: number;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  secretNumber: number;
  phase?: 'joining' | 'guessing' | 'resolution' | 'decision' | 'finished';
};

// Round config (matches locked rules)
const ROUND_CONFIG: { limit: number; multiplier: number }[] = [
  { limit: 30, multiplier: 1 },
  { limit: 20, multiplier: 2 },
  { limit: 10, multiplier: 5 },
  { limit: 5, multiplier: 10 },
  { limit: 2, multiplier: 20 },
  { limit: 1, multiplier: 30 }
];

// Exact-guess special multipliers: these bonus multipliers are ADDED to the round multiplier
// Round 1: +20x, Round 2: +10x, Round 3: +5x (on top of round multiplier)
const EXACT_BONUS_MULTIPLIERS: Record<number, number> = {
  1: 20,
  2: 10,
  3: 5
};

function computeExactPayout(bet: number, round: number): number {
  const roundIdx = Math.max(0, round - 1);
  const cfg = ROUND_CONFIG[Math.min(roundIdx, ROUND_CONFIG.length - 1)];
  const roundMultiplier = cfg.multiplier;
  
  // Special bonus for exact guess - added on top of round multiplier
  const bonusMultiplier = EXACT_BONUS_MULTIPLIERS[round] || 0;
  const totalMultiplier = roundMultiplier + bonusMultiplier;
  
  return Math.round(bet * totalMultiplier);
}

export class LuckyNumberGame implements GameHandler {
  readonly gameType = 'luckynumber';
  readonly botName = 'LuckyNumberBot';
  readonly botAvatar = '🔢';

  private timers: Map<string, NodeJS.Timeout> = new Map();

  getWelcomeMessage(): string {
    return `🔢 Lucky Number has arrived! Use !start to begin a new game. Players join with !j <amount>.`;
  }

  getRemovalMessage(): string {
    return `🔢 Lucky Number has been removed from the room.`;
  }

  async isGameInProgress(roomId: string): Promise<boolean> {
    const gameRef = ref(rtdb, `games/${roomId}/luckynumber`);
    const snap = await get(gameRef);
    if (!snap.exists()) return false;
    const game = snap.val();
    return game.status === 'waiting' || game.status === 'playing';
  }

  async forceEnd(roomId: string): Promise<void> {
    const keys = [`${roomId}:join`, `${roomId}:guess`, `${roomId}:decision`];
    for (const k of keys) {
      if (this.timers.has(k)) {
        clearTimeout(this.timers.get(k)!);
        this.timers.delete(k);
      }
    }
    const gameRef = ref(rtdb, `games/${roomId}/luckynumber`);
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
    const gameRef = ref(rtdb, `games/${roomId}/luckynumber`);
    const snap = await get(gameRef);
    const currentGame = snap.exists() ? (snap.val() as NSGame) : null;

    switch (command) {
      case 'start':
        messages.push(...(await this.handleStart(senderId, senderName, roomId, currentGame)));
        break;
      case 'join':
      case 'j': // alias for convenience (supports !j <amount>)
        messages.push(...(await this.handleJoin(args, senderId, senderName, roomId, currentGame)));
        break;
      case 'guess':
        messages.push(...(await this.handleGuess(args, senderId, senderName, roomId, currentGame)));
        break;
      case 'continue':
        messages.push(...(await this.handleContinue(senderId, senderName, roomId, currentGame)));
        break;
      case 'cashout':
        messages.push(...(await this.handleCashout(senderId, senderName, roomId, currentGame)));
        break;
    }

    return messages;
  }

  private async handleStart(
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: NSGame | null
  ): Promise<BotMessage[]> {
    // Start a new game.
    if (currentGame && currentGame.status !== 'finished') {
      return [{ content: 'A Lucky Number game is already active in this room.', type: 'private', targetUserId: senderId }];
    }

    const secret = Math.floor(Math.random() * 100) + 1; // 1-100

    const gameData: NSGame = {
      id: `game_${Date.now()}`,
      roomId,
      gameType: 'luckynumber',
      status: 'waiting',
      betAmount: 0,
      players: [],
      currentRound: 0,
      createdBy: senderId,
      createdAt: Date.now(),
      secretNumber: secret,
      phase: 'joining'
    } as any;

    await set(ref(rtdb, `games/${roomId}/luckynumber`), gameData);

    // schedule join phase end
    this.scheduleJoinPhaseEnd(roomId);

    // Increment starter's games played counter
    try { await incrementGamesPlayedWeekly(senderId); } catch (e) { console.warn(e); }

    return [{ content: `🔢 Lucky Number started by ${senderName}. Players, join with !j <amount>. 30 seconds.`, type: 'game' }];
  }

  private async handleJoin(
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: NSGame | null
  ): Promise<BotMessage[]> {
    try {
      if (!currentGame || currentGame.phase !== 'joining' || currentGame.status !== 'waiting') {
        return [{ content: 'No joinable Lucky Number game in this room.', type: 'private', targetUserId: senderId }];
      }

      // Check join window
      if (Date.now() > (currentGame.createdAt || 0) + 30000) {
        return [{ content: 'Join window has closed.', type: 'private', targetUserId: senderId }];
      }

      if (!args[0]) {
        // Public guidance so users see immediate feedback when they forget the amount
        return [{ content: `To join Lucky Number use: !j <amount>`, type: 'game' }];
      }

      const bet = parseInt(args[0], 10);
      if (!bet || bet <= 0) {
        return [{ content: 'Invalid bet. Use !j <amount>', type: 'private', targetUserId: senderId }];
      }

      const players = Array.isArray(currentGame.players) ? currentGame.players : [];

      if (players.some(p => p.userId === senderId)) {
        return [{ content: 'You have already joined this game.', type: 'private', targetUserId: senderId }];
      }

      const user = await getUserById(senderId);
      if (!user || user.credits < bet) {
        return [{ content: 'Insufficient credits to join.', type: 'private', targetUserId: senderId }];
      }

      // Deduct immediately
      await updateCredits(senderId, -bet);

      // Record transaction
      try {
        await addDoc(collection(db, 'transactions'), {
          from: senderId,
          fromUsername: senderName,
          to: 'game',
          participants: [senderId],
          amount: bet,
          type: 'game',
          description: 'Lucky Number entry',
          timestamp: serverTimestamp()
        });
      } catch (e) { console.warn('Failed to record transaction', e); }

      const player: NSPlayer = { userId: senderId, username: senderName, betAmount: bet, isActive: true, joinedAt: Date.now() };
      const updatedPlayers = [...players, player];

      await update(ref(rtdb, `games/${roomId}/luckynumber`), { players: updatedPlayers });

      // Increment weekly games counter
      try { await incrementGamesPlayedWeekly(senderId); } catch (e) { console.warn(e); }

      return [{ content: `✅ ${senderName} joined Lucky Number with ${formatWithCommas(bet)} USD.`, type: 'game' }];
    } catch (err) {
      console.error('Error in LuckyNumberGame.handleJoin', err, { gameId: currentGame?.id, playersCount: Array.isArray(currentGame?.players) ? currentGame?.players.length : 0, phase: currentGame?.phase, status: currentGame?.status });
      try { await this.sendBotMessage(roomId, '⚠️ Error processing join — please try again. (debug: handler failure)', 'game'); } catch (e) { /* ignore */ }
      return [{ content: 'Internal error while joining. Please try again later.', type: 'private', targetUserId: senderId }];
    }
  }

  private async handleGuess(
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: NSGame | null
  ): Promise<BotMessage[]> {
    if (!currentGame || currentGame.phase !== 'guessing' || currentGame.status !== 'playing') {
      return [{ content: 'There is no active guessing phase.', type: 'private', targetUserId: senderId }];
    }

    const n = parseInt(args[0], 10);
    if (!n || n < 1 || n > 100) {
      return [{ content: 'Invalid guess. Use !guess <number 1-100>', type: 'private', targetUserId: senderId }];
    }

    const player = currentGame.players.find(p => p.userId === senderId && p.isActive && !p.hasCashedOut);
    if (!player) {
      return [{ content: 'You are not an active player in this game.', type: 'private', targetUserId: senderId }];
    }

    if (player.hasGuessed) {
      return [{ content: 'You have already guessed this round.', type: 'private', targetUserId: senderId }];
    }

    // Record guess
    const updatedPlayers = currentGame.players.map(p => p.userId === senderId ? { ...p, lastGuess: n, hasGuessed: true } : p);
    await update(ref(rtdb, `games/${roomId}/luckynumber`), { players: updatedPlayers });

    // If guess exactly equals secret, resolve immediate win
    if (n === currentGame.secretNumber) {
      // Find all exact guessers (there could be multiples if they guessed previously or now)
      const allPlayersSnap = (await get(ref(rtdb, `games/${roomId}/luckynumber`))).val() as NSGame;
      const exactGuessers = allPlayersSnap.players.filter(p => p.lastGuess === currentGame.secretNumber && p.isActive && !p.hasCashedOut);

      if (exactGuessers.length > 0) {
        // Compute payouts
        const roundIdx = Math.max(0, currentGame.currentRound - 1);
        const cfg = ROUND_CONFIG[Math.min(roundIdx, ROUND_CONFIG.length - 1)];
        const multiplier = cfg.multiplier;

        for (const g of exactGuessers) {
          const payout = computeExactPayout(g.betAmount, currentGame.currentRound || 1);
          try { await updateCredits(g.userId, payout); } catch (e) { console.warn('Failed to credit exact winner', e); }
          try { await addDoc(collection(db, 'transactions'), { from: 'game', to: g.userId, amount: payout, participants: [g.userId], type: 'payout', description: 'Lucky Number exact win', timestamp: serverTimestamp() }); } catch (e) { }
        }

        // Announce winners with payout amounts
        const winnerNames = exactGuessers.map(p => p.username).join(', ');
        const payoutsText = exactGuessers.map(p => {
          const amt = computeExactPayout(p.betAmount, currentGame.currentRound || 1);
          return `${p.username}: ${formatWithCommas(amt)}`;
        }).join(', ');
        await this.sendBotMessage(roomId, `🎉 Exact hit! ${winnerNames} guessed the secret number ${currentGame.secretNumber} and win! Payouts: ${payoutsText}. Game ended.`, 'game');

        // Remove game
        await remove(ref(rtdb, `games/${roomId}/luckynumber`));
        return [];
      }
    }

    // Check if all active players have guessed to possibly resolve early
    const allPlayersSnap = (await get(ref(rtdb, `games/${roomId}/luckynumber`))).val() as NSGame;
    const activePlayers = allPlayersSnap.players.filter(p => p.isActive && !p.hasCashedOut);
    const allGuessed = activePlayers.every(p => p.hasGuessed);
    if (allGuessed) {
      // Cancel guess timer and process resolution
      this.clearGuessTimer(roomId);
      setTimeout(() => this.processResolution(roomId), 500);
    }

    return [{ content: `🔒 ${senderName} has locked in a guess.`, type: 'private', targetUserId: senderId }];
  }

  private async handleContinue(senderId: string, senderName: string, roomId: string, currentGame: NSGame | null): Promise<BotMessage[]> {
    if (!currentGame || currentGame.phase !== 'decision' || currentGame.status !== 'playing') {
      return [{ content: 'No decision to make right now.', type: 'private', targetUserId: senderId }];
    }

    // Mark as continuing explicitly (not necessary since default is continue)
    // but track that user acted to avoid defaulting
    const updatedPlayers = currentGame.players.map(p => p.userId === senderId ? { ...p } : p);
    await update(ref(rtdb, `games/${roomId}/luckynumber`), { players: updatedPlayers });

    return [{ content: `✅ ${senderName} stays for the next round.`, type: 'game' }];
  }

  private async handleCashout(senderId: string, senderName: string, roomId: string, currentGame: NSGame | null): Promise<BotMessage[]> {
    if (!currentGame || currentGame.phase !== 'decision' || currentGame.status !== 'playing') {
      return [{ content: 'No decision to make right now.', type: 'private', targetUserId: senderId }];
    }

    const player = currentGame.players.find(p => p.userId === senderId && p.isActive && !p.hasCashedOut);
    if (!player) {
      return [{ content: 'You are not eligible to cash out.', type: 'private', targetUserId: senderId }];
    }

    // Compute payout based on current round multiplier
    const roundIdx = Math.max(0, currentGame.currentRound - 1);
    const cfg = ROUND_CONFIG[Math.min(roundIdx, ROUND_CONFIG.length - 1)];
    const multiplier = cfg.multiplier;
    const payout = Math.round(player.betAmount * multiplier);

    try { await updateCredits(player.userId, payout); } catch (e) { console.warn('Failed to credit cashout', e); }
    try { await addDoc(collection(db, 'transactions'), { from: 'game', to: player.userId, amount: payout, participants: [player.userId], type: 'payout', description: 'Lucky Number cashout', timestamp: serverTimestamp() }); } catch (e) { }

    // Mark player cashed out and inactive
    const updatedPlayers = currentGame.players.map(p => p.userId === player.userId ? { ...p, hasCashedOut: true, isActive: false } : p);
    await update(ref(rtdb, `games/${roomId}/luckynumber`), { players: updatedPlayers });

    await this.sendBotMessage(roomId, `💰 ${player.username} cashed out for ${formatWithCommas(payout)} USD.`, 'game');

    // Check end conditions
    const afterSnap = (await get(ref(rtdb, `games/${roomId}/luckynumber`))).val() as NSGame;
    const remaining = afterSnap.players.filter(p => p.isActive && !p.hasCashedOut);
    if (remaining.length === 0) {
      await this.sendBotMessage(roomId, 'All players have cashed out. Game ended. Start a new game with !start', 'game');
      await remove(ref(rtdb, `games/${roomId}/luckynumber`));
    }

    return [];
  }

  private scheduleJoinPhaseEnd(roomId: string) {
    const key = `${roomId}:join`;
    if (this.timers.has(key)) clearTimeout(this.timers.get(key)!);
    const t = setTimeout(() => this.endJoinPhase(roomId), 40000);
    this.timers.set(key, t);
  }

  private clearGuessTimer(roomId: string) {
    const key = `${roomId}:guess`;
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  private scheduleGuessPhaseEnd(roomId: string) {
    const key = `${roomId}:guess`;
    if (this.timers.has(key)) clearTimeout(this.timers.get(key)!);
    const t = setTimeout(() => this.processResolution(roomId), 30000);
    this.timers.set(key, t);
  }

  private scheduleDecisionPhaseEnd(roomId: string) {
    const key = `${roomId}:decision`;
    if (this.timers.has(key)) clearTimeout(this.timers.get(key)!);
    const t = setTimeout(() => this.endDecisionPhase(roomId), 20000);
    this.timers.set(key, t);
  }

  private async endJoinPhase(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/luckynumber`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as NSGame) : null;
    if (!game || game.phase !== 'joining') return;

    if (!game.players || game.players.length === 0) {
      await remove(gameRef);
      await this.sendBotMessage(roomId, '❌ Not enough players joined. Game cancelled.', 'game');
      return;
    }

    // Start round 1
    await update(gameRef, { status: 'playing', currentRound: 1, phase: 'guessing', startedAt: Date.now() });
    await this.sendBotMessage(roomId, `📢 Round #1 starts! Your guess limit should be within ±30. Guess now with !guess <number>. 20 seconds.`, 'game');

    // Reset per-round guess flags (use null instead of undefined to avoid RTDB errors)
    const resetPlayers = game.players.map(p => ({ ...p, lastGuess: null, hasGuessed: false }));
    await update(gameRef, { players: resetPlayers });

    this.scheduleGuessPhaseEnd(roomId);
  }

  private async processResolution(roomId: string) {
    // Called at the end of guess phase (or early if all guessed)
    this.clearGuessTimer(roomId);
    const gameRef = ref(rtdb, `games/${roomId}/luckynumber`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as NSGame) : null;
    if (!game || game.phase !== 'guessing' || game.status !== 'playing') return;

    // Auto-guess for players who didn't guess
    let updatedPlayers = [...game.players];
    for (const p of updatedPlayers) {
      if (p.isActive && !p.hasCashedOut && !p.hasGuessed) {
        const rand = Math.floor(Math.random() * 100) + 1;
        updatedPlayers = updatedPlayers.map(x => x.userId === p.userId ? { ...x, lastGuess: rand, hasGuessed: true } : x);
        await this.sendBotMessage(roomId, `🤖 Auto-guess for ${p.username}: ${rand}`, 'game');
      }
    }

    // Save auto-guesses
    await update(gameRef, { players: updatedPlayers });

    // Announce every active player's guess (mandatory)
    const activePlayers = updatedPlayers.filter(p => p.isActive && !p.hasCashedOut);
    let guessAnnounce = `📢 Round #${game.currentRound} Guesses:\n`;
    for (const p of activePlayers) {
      guessAnnounce += `${p.username} guessed ${p.lastGuess}\n`;
    }
    await this.sendBotMessage(roomId, guessAnnounce.trim(), 'game');

    // Check for exact guesses
    const exactGuessers = activePlayers.filter(p => p.lastGuess === game.secretNumber);
    if (exactGuessers.length > 0) {
      // Payout exact winners: bet * (multiplier + 1)
      const roundIdx = Math.max(0, game.currentRound - 1);
      const cfg = ROUND_CONFIG[Math.min(roundIdx, ROUND_CONFIG.length - 1)];
      const multiplier = cfg.multiplier;

      for (const g of exactGuessers) {
        const payout = computeExactPayout(g.betAmount, game.currentRound || 1);
        try { await updateCredits(g.userId, payout); } catch (e) { console.warn('Failed to credit exact winner', e); }
        try { await addDoc(collection(db, 'transactions'), { from: 'game', to: g.userId, amount: payout, participants: [g.userId], type: 'payout', description: 'Lucky Number exact win', timestamp: serverTimestamp() }); } catch (e) { }
      }

      const winnerNames = exactGuessers.map(p => p.username).join(', ');
      const payoutsText = exactGuessers.map(p => `${p.username}: ${formatWithCommas(computeExactPayout(p.betAmount, game.currentRound || 1))}`).join(', ');
      await this.sendBotMessage(roomId, `🎉 Exact hit! ${winnerNames} guessed the secret number ${game.secretNumber} and win! Payouts: ${payoutsText}. Game ended.`, 'game');

      await remove(gameRef);
      return;
    }

    // Survival check
    const limit = this.getRoundLimit(game.currentRound);
    const survived: string[] = [];
    const eliminated: string[] = [];

    for (const p of updatedPlayers) {
      if (!p.isActive || p.hasCashedOut) continue;
      const dist = Math.abs((p.lastGuess || 0) - game.secretNumber);
      if (dist <= limit) {
        survived.push(p.username);
      } else {
        eliminated.push(p.username);
        // Mark eliminated
        updatedPlayers = updatedPlayers.map(x => x.userId === p.userId ? { ...x, isActive: false } : x);
      }
    }

    // Save eliminations
    await update(gameRef, { players: updatedPlayers });

    if (eliminated.length > 0) {
      await this.sendBotMessage(roomId, `❌ Eliminated: ${eliminated.join(', ')}.`, 'game');
    } else {
      await this.sendBotMessage(roomId, `✅ All surviving: ${survived.join(', ')}.`, 'game');
    }

    // Check if all players eliminated
    const remaining = updatedPlayers.filter(p => p.isActive && !p.hasCashedOut);
    if (remaining.length === 0) {
      // Reveal secret number for transparency when everyone is eliminated
      await this.sendBotMessage(roomId, `❌ All players eliminated. The secret number was ${game.secretNumber}. Game ended. Start a new game with !start`, 'game');
      await remove(gameRef);
      return;
    }

    // Move to decision phase
    await update(gameRef, { phase: 'decision' });
    await this.sendBotMessage(roomId, `⏱ Decision Phase: Surviving players may !cashout or !continue. Default: !continue. 30 seconds.`, 'game');

    this.scheduleDecisionPhaseEnd(roomId);
  }

  private async endDecisionPhase(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/luckynumber`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as NSGame) : null;
    if (!game || game.phase !== 'decision' || game.status !== 'playing') return;

    // Default action is continue for players who didn't act
    // Players who cashed out were already processed in handleCashout

    // Prepare next round
    const remaining = game.players.filter(p => p.isActive && !p.hasCashedOut);
    if (remaining.length === 0) {
      await this.sendBotMessage(roomId, 'All players have cashed out. Game ended. Start a new game with !start', 'game');
      await remove(gameRef);
      return;
    }

    // Increment round
    const nextRound = game.currentRound + 1;
    await update(gameRef, { currentRound: nextRound, phase: 'guessing' });

    // Reset per-round guess flags (use null instead of undefined to avoid RTDB errors)
    const resetPlayers = game.players.map(p => ({ ...p, lastGuess: null, hasGuessed: false }));
    await update(gameRef, { players: resetPlayers });

    const limit = this.getRoundLimit(nextRound);
    await this.sendBotMessage(roomId, `📢 Round #${nextRound} starts! Your guess limit should be withing ±${limit}. Guess now with !guess <number>. 25 seconds.`, 'game');

    this.scheduleGuessPhaseEnd(roomId);
  }

  private getRoundLimit(round: number) {
    if (round <= 1) return ROUND_CONFIG[0].limit;
    if (round === 2) return ROUND_CONFIG[1].limit;
    if (round === 3) return ROUND_CONFIG[2].limit;
    if (round === 4) return ROUND_CONFIG[3].limit;
    if (round === 5) return ROUND_CONFIG[4].limit;
    return 1; // 5+
  }

  private clearAllTimers(roomId: string) {
    const keys = [`${roomId}:join`, `${roomId}:guess`, `${roomId}:decision`];
    for (const k of keys) {
      if (this.timers.has(k)) {
        clearTimeout(this.timers.get(k)!);
        this.timers.delete(k);
      }
    }
  }

  private async sendBotMessage(roomId: string, content: string, type: 'game' | 'private', handler?: GameHandler) {
    // Write a message into the RTDB messages collection (consistent with other game handlers)
    const messagesRef = ref(rtdb, `messages/${roomId}`);
    try {
      await push(messagesRef, { roomId, senderId: 'bot', senderName: this.botName, senderAvatar: this.botAvatar, content, type, timestamp: Date.now() });
    } catch (e) {
      // As a last resort, set a namespaced key to avoid collisions
      await set(ref(rtdb, `messages/${roomId}/_bot_${Date.now()}`), { roomId, senderId: 'bot', senderName: this.botName, senderAvatar: this.botAvatar, content, type, timestamp: Date.now() });
    }
  }
}

export const luckyNumberGame = new LuckyNumberGame();
