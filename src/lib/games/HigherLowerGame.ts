// Higher/Lower Game - Separate game logic
import { ref, get, set, update, remove } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { updateCredits, addXP, getUserById, incrementGamesPlayedWeekly, incrementMiniGameWins, triggerCompanionEvent } from '../firebaseOperations';
import { formatWithCommas } from '../utils';
import { GameHandler, BotMessage, GameSession, GamePlayer } from './types';

const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const HOUSE_RAKE_RATE = 0.05;

type HLGameSession = GameSession & {
  botCard?: {
    value: number;
    display: string;
  } | null;
};

function drawCard() {
  const value = Math.floor(Math.random() * 13) + 2; // 2..14 (A high)
  const rank = CARD_RANKS[value - 2];
  const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
  return {
    value,
    display: `${rank}${suit}`
  };
}

function normalizeGuess(command: string): 'higher' | 'lower' | null {
  const c = command.toLowerCase();
  if (c === 'h' || c === 'high' || c === 'higher' || c === 'up') return 'higher';
  if (c === 'l' || c === 'low' || c === 'lower' || c === 'down') return 'lower';
  return null;
}

export class HigherLowerGame implements GameHandler {
  readonly gameType = 'higherlower';
  readonly botName = 'HigherLowerBot';
  readonly botAvatar = '📈';

  private timers: Map<string, NodeJS.Timeout> = new Map();

  getWelcomeMessage(): string {
    return '📈 HigherLowerBot joined! Use !start <amount> to begin.';
  }

  getRemovalMessage(): string {
    return '📈 HigherLowerBot has left the room.';
  }

  async isGameInProgress(roomId: string): Promise<boolean> {
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    const snap = await get(gameRef);
    if (!snap.exists()) return false;
    const game = snap.val() as HLGameSession;
    return game.status === 'waiting' || game.status === 'playing';
  }

  async forceEnd(roomId: string): Promise<void> {
    const timerKey = `${roomId}:game`;
    const roundKey = `${roomId}:round`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }
    if (this.timers.has(roundKey)) {
      clearTimeout(this.timers.get(roundKey)!);
      this.timers.delete(roundKey);
    }
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    await remove(gameRef);
  }

  async handleCommand(
    command: string,
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string
  ): Promise<BotMessage[]> {
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    const snap = await get(gameRef);
    const currentGame = snap.exists() ? (snap.val() as HLGameSession) : null;

    if (command === 'start') {
      return await this.handleStart(args, senderId, senderName, roomId, currentGame);
    }

    if (command === 'j' || command === 'join') {
      return await this.handleJoin(senderId, senderName, roomId, currentGame);
    }

    const guess = normalizeGuess(command);
    if (guess) {
      return await this.handleGuess(guess, senderId, senderName, roomId, currentGame);
    }

    return [];
  }

  private async handleStart(
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: HLGameSession | null
  ): Promise<BotMessage[]> {
    const wager = parseFloat(args[0]) || 0;
    const MIN_BET = 0.05;
    if (wager < MIN_BET) {
      return [{
        content: `Minimum wager is USD ${MIN_BET.toFixed(2)}. Use !start <amount>`,
        type: 'private',
        targetUserId: senderId
      }];
    }

    if (currentGame && currentGame.status !== 'finished') {
      return [{ content: 'A Higher/Lower game is already active in this room.', type: 'private', targetUserId: senderId }];
    }

    const user = await getUserById(senderId);
    if (!user || user.credits < wager) {
      return [{ content: 'Insufficient credits to start the game.', type: 'private', targetUserId: senderId }];
    }

    await updateCredits(senderId, -wager);
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: [senderId],
      amount: wager,
      type: 'game',
      description: 'Higher/Lower game entry',
      timestamp: serverTimestamp()
    });

    const gameData: HLGameSession = {
      id: `game_${Date.now()}`,
      roomId,
      gameType: 'higherlower',
      status: 'waiting',
      betAmount: wager,
      players: [
        { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now() }
      ],
      currentRound: 0,
      createdBy: senderId,
      createdAt: Date.now(),
      botCard: null
    };

    await set(ref(rtdb, `games/${roomId}/higherlower`), gameData);

    try {
      await incrementGamesPlayedWeekly(senderId);
    } catch (e) {
      console.error('Failed to increment gamesPlayedWeekly for higher/lower starter', e);
    }

    this.scheduleJoinPhaseEnd(roomId);

    return [{
      content: `📈 ${senderName} started Higher/Lower. Entry: USD ${formatWithCommas(wager)}. Type !j to join within 30 seconds.`,
      type: 'game'
    }];
  }

  private async handleJoin(
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: HLGameSession | null
  ): Promise<BotMessage[]> {
    if (!currentGame || currentGame.status !== 'waiting') {
      return [{ content: 'No Higher/Lower game is waiting for players.', type: 'private', targetUserId: senderId }];
    }

    if (Date.now() > (currentGame.createdAt || 0) + 30000) {
      return [{ content: 'Join window has closed.', type: 'private', targetUserId: senderId }];
    }

    if (currentGame.players.some(p => p.userId === senderId)) {
      return [{ content: 'You have already joined this game.', type: 'private', targetUserId: senderId }];
    }

    const user = await getUserById(senderId);
    if (!user || user.credits < currentGame.betAmount) {
      return [{ content: 'Insufficient credits to join.', type: 'private', targetUserId: senderId }];
    }

    await updateCredits(senderId, -currentGame.betAmount);
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: [senderId],
      amount: currentGame.betAmount,
      type: 'game',
      description: 'Higher/Lower game entry',
      timestamp: serverTimestamp()
    });

    const updatedPlayers = [
      ...currentGame.players,
      { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now() }
    ];

    await update(ref(rtdb, `games/${roomId}/higherlower`), { players: updatedPlayers });

    try {
      await incrementGamesPlayedWeekly(senderId);
    } catch (e) {
      console.error('Failed to increment gamesPlayedWeekly for higher/lower joiner', e);
    }

    return [{
      content: `✅ ${senderName} joined Higher/Lower.`,
      type: 'game'
    }];
  }

  private async handleGuess(
    guess: 'higher' | 'lower',
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: HLGameSession | null
  ): Promise<BotMessage[]> {
    if (!currentGame || currentGame.status !== 'playing') {
      return [{ content: 'No active Higher/Lower round right now.', type: 'private', targetUserId: senderId }];
    }

    const player = currentGame.players.find(p => p.userId === senderId && p.isActive);
    if (!player) {
      return [{ content: 'You are not an active player in this game.', type: 'private', targetUserId: senderId }];
    }

    if (player.hasDrawn) {
      return [{ content: 'You already submitted your guess this round.', type: 'private', targetUserId: senderId }];
    }

    const updatedPlayers = currentGame.players.map(p =>
      p.userId === senderId
        ? { ...p, hasDrawn: true, currentCard: { value: guess === 'higher' ? 1 : -1, display: guess } }
        : p
    );

    await update(ref(rtdb, `games/${roomId}/higherlower`), { players: updatedPlayers });

    const allSubmitted = updatedPlayers.filter(p => p.isActive).every(p => p.hasDrawn);
    if (allSubmitted) {
      this.clearRoundTimer(roomId);
      setTimeout(() => this.processRoundEnd(roomId), 700);
    }

    return [{
      content: `🔒 ${senderName} chose ${guess === 'higher' ? 'Higher' : 'Lower'}.`,
      type: 'private',
      targetUserId: senderId
    }];
  }

  private scheduleJoinPhaseEnd(roomId: string) {
    const timerKey = `${roomId}:game`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
    }
    const timer = setTimeout(() => this.endJoinPhase(roomId), 30000);
    this.timers.set(timerKey, timer);
  }

  private scheduleRoundEnd(roomId: string) {
    const roundKey = `${roomId}:round`;
    if (this.timers.has(roundKey)) {
      clearTimeout(this.timers.get(roundKey)!);
    }
    const timer = setTimeout(() => this.processRoundEnd(roomId), 20000);
    this.timers.set(roundKey, timer);
  }

  private clearRoundTimer(roomId: string) {
    const roundKey = `${roomId}:round`;
    if (this.timers.has(roundKey)) {
      clearTimeout(this.timers.get(roundKey)!);
      this.timers.delete(roundKey);
    }
  }

  private async endJoinPhase(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as HLGameSession) : null;
    if (!game || game.status !== 'waiting') return;

    if (game.players.length < 2) {
      for (const p of game.players) {
        await updateCredits(p.userId, game.betAmount);
        await addDoc(collection(db, 'transactions'), {
          from: 'game',
          to: p.userId,
          participants: [p.userId],
          toUsername: p.username,
          amount: game.betAmount,
          type: 'refund',
          description: 'Higher/Lower cancelled - refund',
          timestamp: serverTimestamp()
        });
      }
      await remove(gameRef);
      await this.sendBotMessage(roomId, '❌ Not enough players joined. Higher/Lower cancelled.', 'game');
      return;
    }

    const botCard = drawCard();
    const updatedPlayers = game.players.map(p => ({ ...p, currentCard: null, hasDrawn: false }));
    await update(gameRef, {
      status: 'playing',
      currentRound: 1,
      startedAt: Date.now(),
      players: updatedPlayers,
      botCard
    });

    try {
      for (const p of updatedPlayers) {
        try { await addXP(p.userId, 10); } catch (e) { console.warn('Failed to award join XP (higher/lower):', e); }
      }
    } catch (e) {
      console.error('Failed to award join XP to higher/lower players:', e);
    }

    await this.sendBotMessage(
      roomId,
      `📢 Round #1. Bot card: ${botCard.display}. Guess now: !h (higher) or !l (lower). 20 seconds.`,
      'game'
    );

    this.scheduleRoundEnd(roomId);
  }

  private async processRoundEnd(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as HLGameSession) : null;
    if (!game || game.status !== 'playing') return;

    const botCard = game.botCard || drawCard();
    let updatedPlayers = [...game.players];
    const activePlayers = updatedPlayers.filter(p => p.isActive);

    for (const p of activePlayers) {
      if (!p.hasDrawn) {
        const autoGuess: 'higher' | 'lower' = Math.random() < 0.5 ? 'higher' : 'lower';
        updatedPlayers = updatedPlayers.map(x =>
          x.userId === p.userId
            ? { ...x, hasDrawn: true, currentCard: { value: autoGuess === 'higher' ? 1 : -1, display: autoGuess } }
            : x
        );
        await this.sendBotMessage(roomId, `🤖 Auto-guess for ${p.username}: ${autoGuess}`, 'game');
      }
    }

    const nextCard = drawCard();
    let result: 'higher' | 'lower' | 'equal' = 'equal';
    if (nextCard.value > botCard.value) result = 'higher';
    else if (nextCard.value < botCard.value) result = 'lower';

    await this.sendBotMessage(
      roomId,
      `🃏 Reveal: ${botCard.display} → ${nextCard.display}. Result: ${result.toUpperCase()}.`,
      'game'
    );

    if (result === 'equal') {
      await this.sendBotMessage(roomId, '🟰 Equal value. No eliminations this round.', 'game');
      await this.prepareNextRound(roomId, game, updatedPlayers, nextCard);
      return;
    }

    const losers = updatedPlayers.filter(p =>
      p.isActive &&
      p.currentCard &&
      p.currentCard.display !== result
    );

    if (losers.length === activePlayers.length) {
      await this.sendBotMessage(roomId, '🛡️ Everyone guessed wrong. Mercy round: no one is eliminated.', 'game');
      await this.prepareNextRound(roomId, game, updatedPlayers, nextCard);
      return;
    }

    updatedPlayers = updatedPlayers.map(p =>
      losers.some(l => l.userId === p.userId) ? { ...p, isActive: false } : p
    );
    const remaining = updatedPlayers.filter(p => p.isActive);

    if (losers.length > 0) {
      await this.sendBotMessage(roomId, `❌ Eliminated: ${losers.map(p => p.username).join(', ')}.`, 'game');
    }

    if (remaining.length === 1) {
      await this.endGame(roomId, remaining[0], game);
      return;
    }

    await this.prepareNextRound(roomId, game, updatedPlayers, nextCard);
  }

  private async prepareNextRound(
    roomId: string,
    game: HLGameSession,
    players: GamePlayer[],
    nextBotCard: { value: number; display: string }
  ) {
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    const nextRound = (game.currentRound || 1) + 1;
    const resetPlayers = players.map(p => ({
      ...p,
      hasDrawn: false,
      currentCard: null
    }));

    await update(gameRef, {
      currentRound: nextRound,
      players: resetPlayers,
      botCard: nextBotCard
    });

    const activeCount = resetPlayers.filter(p => p.isActive).length;
    await this.sendBotMessage(
      roomId,
      `📢 Round #${nextRound}. Players left: ${activeCount}. Bot card: ${nextBotCard.display}. Use !h or !l (20 seconds).`,
      'game'
    );

    this.scheduleRoundEnd(roomId);
  }

  private async endGame(roomId: string, winner: GamePlayer, game: HLGameSession) {
    const gameRef = ref(rtdb, `games/${roomId}/higherlower`);
    const totalPot = (game.betAmount || 0) * (game.players?.length || 0);
    const payout = Number((totalPot * (1 - HOUSE_RAKE_RATE)).toFixed(2));

    await updateCredits(winner.userId, payout);
    try { await addXP(winner.userId, 20); } catch (e) { console.warn('Failed to award winner XP (higher/lower):', e); }
    try { await incrementMiniGameWins(winner.userId); } catch (e) { console.warn('Failed to track mini-game win (higher/lower):', e); }
    try { await triggerCompanionEvent(winner.userId, 'mini_game_win', { roomId }); } catch (e) { console.warn('Failed to trigger companion mini_game_win (higher/lower):', e); }
    try { await triggerCompanionEvent(winner.userId, 'high_amount_game_win', { roomId, amount: payout }); } catch (e) { console.warn('Failed to trigger companion high_amount_game_win (higher/lower):', e); }
    try {
      const losers = (game.players || []).filter((p) => p.userId !== winner.userId);
      await Promise.all(losers.map((p) => triggerCompanionEvent(p.userId, 'mini_game_loss', { roomId })));
    } catch (e) {
      console.warn('Failed to trigger companion mini_game_loss events (higher/lower):', e);
    }

    await addDoc(collection(db, 'transactions'), {
      from: 'game',
      to: winner.userId,
      participants: [winner.userId],
      toUsername: winner.username,
      amount: payout,
      type: 'game',
      description: 'Higher/Lower winner payout',
      timestamp: serverTimestamp()
    });

    await update(gameRef, {
      status: 'finished',
      endedAt: Date.now(),
      winnerId: winner.userId,
      winnerName: winner.username
    });

    await this.sendBotMessage(
      roomId,
      `🏆 Higher/Lower over. ${winner.username} wins USD ${formatWithCommas(payout)}!`,
      'game'
    );

    setTimeout(async () => {
      try { await remove(gameRef); } catch {}
    }, 5000);
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

export const higherLowerGame = new HigherLowerGame();
