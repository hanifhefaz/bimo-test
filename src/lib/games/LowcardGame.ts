// Lowcard Game - Separate game logic
import { ref, get, set, update, remove } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { updateCredits, addXP, getUserById, incrementGamesPlayedWeekly, incrementMiniGameWins, triggerCompanionEvent } from '../firebaseOperations';
import { formatWithCommas } from '../utils';
import { GameHandler, BotMessage, GameSession, GamePlayer } from './types';

const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️']; // Spades, Hearts, Diamonds, Clubs
const HOUSE_RAKE_RATE = 0.05;

export class LowcardGame implements GameHandler {
  readonly gameType = 'lowcard';
  readonly botName = 'LowCardBot';
  readonly botAvatar = '🃏';

  private timers: Map<string, NodeJS.Timeout> = new Map();

  getWelcomeMessage(): string {
    return (
      `🃏 LowcardBot has been added to the room! !start <amount> to start a new game!`
    );
  }

  getRemovalMessage(): string {
    return '🃏 LowcardBot has been removed from the room.';
  }

  async isGameInProgress(roomId: string): Promise<boolean> {
    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    const snap = await get(gameRef);
    if (!snap.exists()) return false;
    const game = snap.val();
    return game.status === 'waiting' || game.status === 'playing';
  }

  async forceEnd(roomId: string): Promise<void> {
    const timerKey = `${roomId}:game`;
    const roundKey = `${roomId}:round`;
    const tbKey = `${roomId}:tiebreaker`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }
    if (this.timers.has(roundKey)) {
      clearTimeout(this.timers.get(roundKey)!);
      this.timers.delete(roundKey);
    }
    if (this.timers.has(tbKey)) {
      clearTimeout(this.timers.get(tbKey)!);
      this.timers.delete(tbKey);
    }
    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
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
    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    const snap = await get(gameRef);
    const currentGame = snap.exists() ? (snap.val() as GameSession) : null;

    switch (command) {
      case 'start':
        messages.push(...(await this.handleStart(args, senderId, senderName, roomId, currentGame)));
        break;
      case 'j':
        messages.push(...(await this.handleJoin(senderId, senderName, roomId, currentGame)));
        break;
      case 'd':
        messages.push(...(await this.handleDraw(senderId, senderName, roomId, currentGame)));
        break;
    }

    return messages;
  }

  private async handleStart(
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: GameSession | null
  ): Promise<BotMessage[]> {
    const wager = parseFloat(args[0]) || 0;
    const MIN_BET = 0.05;
    if (wager < MIN_BET) {
      return [{ 
        content: `Minimum bet is USD ${MIN_BET.toFixed(2)}. Use !start <amount>`, 
        type: 'private', 
        targetUserId: senderId 
      }];
    }

    if (currentGame && currentGame.status !== 'finished') {
      return [{ content: 'A game is already active in this room.', type: 'private', targetUserId: senderId }];
    }

    const user = await getUserById(senderId);
    if (!user || user.credits < wager) {
      return [{ content: 'Insufficient credits to start the game.', type: 'private', targetUserId: senderId }];
    }

    await updateCredits(senderId, -wager);

    // Record transaction for game entry
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: [senderId],
      amount: wager,
      type: 'game',
      description: 'Lowcard game entry',
      timestamp: serverTimestamp()
    });

    const gameData: GameSession = {
      id: `game_${Date.now()}`,
      roomId,
      gameType: 'lowcard',
      status: 'waiting',
      betAmount: wager,
      players: [
        { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now() }
      ],
      currentRound: 0,
      createdBy: senderId,
      createdAt: Date.now()
    };

    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    await set(gameRef, gameData);

    // Increment starter's weekly games counter (award XP when game actually starts)
    try {
      await incrementGamesPlayedWeekly(senderId);
    } catch (e) {
      console.error('Failed to increment gamesPlayedWeekly for lowcard starter', e);
    }

    this.scheduleJoinPhaseEnd(roomId);

    return [{
      content: `Lowcard started. !j to join. Cost USD ${formatWithCommas(wager)}. 30 seconds.`,
      type: 'game'
    }];
  }

  private async handleJoin(
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: GameSession | null
  ): Promise<BotMessage[]> {
    if (!currentGame || currentGame.status !== 'waiting') {
      return [{ content: 'No game is currently waiting for players.', type: 'private', targetUserId: senderId }];
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

    // Record transaction for game entry
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: [senderId],
      amount: currentGame.betAmount,
      type: 'game',
      description: 'Lowcard game entry',
      timestamp: serverTimestamp()
    });

    const updatedPlayers = [
      ...currentGame.players,
      { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now() }
    ];

    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    await update(gameRef, { players: updatedPlayers });

    // Increment joiner's weekly games counter (award XP when the game actually starts)
    try {
      await incrementGamesPlayedWeekly(senderId);
    } catch (e) {
      console.error('Failed to increment gamesPlayedWeekly for lowcard joiner', e);
    }

    return [{
      content: ` ${senderName} has joined the game`,
      type: 'game'
    }];
  }

  private async handleDraw(
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: GameSession | null
  ): Promise<BotMessage[]> {
    if (!currentGame || currentGame.status !== 'playing') {
      return [{ content: 'No active game to draw in.', type: 'private', targetUserId: senderId }];
    }

    const player = currentGame.players.find(p => p.userId === senderId && p.isActive);
    if (!player) {
      return [{ content: 'You are not an active player in this game.', type: 'private', targetUserId: senderId }];
    }

    // If a tie-breaker round is active, only tied players may draw
    if (currentGame.tieBreaker?.active) {
      const tiedIds = currentGame.tieBreaker.tiedPlayerIds || [];
      if (!tiedIds.includes(senderId)) {
        return [{ content: 'Tie-breaker in progress - only tied players may draw.', type: 'private', targetUserId: senderId }];
      }
    }

    if (player.hasDrawn) {
      return [{ content: 'You have already drawn this round.', type: 'private', targetUserId: senderId }];
    }

    // Draw card with Rank + Suit
    const cardValue = Math.floor(Math.random() * 13); // 0-12
    const cardSuit = CARD_SUITS[Math.floor(Math.random() * 4)];
    const cardName = `${CARD_RANKS[cardValue]}${cardSuit}`;

    const updatedPlayers = currentGame.players.map(p =>
      p.userId === senderId
        ? { ...p, currentCard: { value: cardValue + 1, display: cardName }, hasDrawn: true }
        : p
    );

    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    await update(gameRef, { players: updatedPlayers });

    const activePlayers = updatedPlayers.filter(p => p.isActive);
    const allDrawn = activePlayers.every(p => p.hasDrawn);

    if (allDrawn) {
      this.clearRoundTimer(roomId);
      setTimeout(() => this.processRoundEnd(roomId), 1000);
    }

    return [{
      content: ` ${senderName}: ${cardName}`,
      type: 'game'
    }];
  }

  private scheduleJoinPhaseEnd(roomId: string) {
    const timerKey = `${roomId}:game`;
    if (this.timers.has(timerKey)) clearTimeout(this.timers.get(timerKey)!);
    const timer = setTimeout(() => this.endJoinPhase(roomId), 30000);
    this.timers.set(timerKey, timer);
  }

  private scheduleRoundEnd(roomId: string) {
    const timerKey = `${roomId}:round`;
    if (this.timers.has(timerKey)) clearTimeout(this.timers.get(timerKey)!);
    const timer = setTimeout(() => this.processRoundEnd(roomId), 20000);
    this.timers.set(timerKey, timer);
  }

  private clearRoundTimer(roomId: string) {
    const timerKey = `${roomId}:round`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }
  }

  private async endJoinPhase(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as GameSession) : null;
    if (!game || game.status !== 'waiting') return;

    if (game.players.length < 2) {
      // Refund all players with transaction records
      for (const p of game.players) {
        await updateCredits(p.userId, game.betAmount);
        await addDoc(collection(db, 'transactions'), {
          from: 'game',
          to: p.userId,
          participants: [p.userId],
          toUsername: p.username,
          amount: game.betAmount,
          type: 'refund',
          description: 'Lowcard game cancelled - refund',
          timestamp: serverTimestamp()
        });
      }
      await remove(gameRef);
      await this.sendBotMessage(roomId, ' Not enough players joined. Game cancelled!', 'game');
      return;
    }

    const updatedPlayers = game.players.map(p => ({ ...p, currentCard: null, hasDrawn: false }));
    await update(gameRef, { status: 'playing', currentRound: 1, startedAt: Date.now(), players: updatedPlayers });

    // Award join XP to all players now that the game is starting
    try {
      for (const p of updatedPlayers) {
        try { await addXP(p.userId, 10); } catch (e) { console.warn('Failed to award join XP to lowcard player:', e); }
      }
    } catch (e) {
      console.error('Failed to award join XP to lowcard players:', e);
    }

    await this.sendBotMessage(
      roomId,
      ` 📢 ROUND #1: Players, !d to DRAW. 20 seconds.`,
      'game'
    );

    this.scheduleRoundEnd(roomId);
  }

  private async processRoundEnd(roomId: string, tieBreaker: boolean = false, tiedPlayerIds: string[] = []) {
    // Clear any existing tie-breaker timer if this invocation is for a tie-breaker
    if (tieBreaker) {
      const tbKey = `${roomId}:tiebreaker`;
      if (this.timers.has(tbKey)) {
        clearTimeout(this.timers.get(tbKey)!);
        this.timers.delete(tbKey);
      }
    }

    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    const snap = await get(gameRef);
    const game = snap.exists() ? (snap.val() as GameSession) : null;
    if (!game || game.status !== 'playing') return;

    let updatedPlayers = [...game.players];

    // Determine which players are participating in this round
    let participatingPlayers: GamePlayer[];
    if (tieBreaker && tiedPlayerIds.length > 0) {
      participatingPlayers = updatedPlayers.filter(p => p.isActive && tiedPlayerIds.includes(p.userId));
    } else {
      participatingPlayers = updatedPlayers.filter(p => p.isActive);
    }

    if (!tieBreaker) {
      await this.sendBotMessage(roomId, `TIME'S UP! Tallying cards...`, 'game');
    }

    // Auto-draw for those who didn't
    for (const p of participatingPlayers) {
      if (!p.hasDrawn) {
        const cardValue = Math.floor(Math.random() * 13); // 0-12
        const cardSuit = CARD_SUITS[Math.floor(Math.random() * 4)];
        const cardName = `${CARD_RANKS[cardValue]}${cardSuit}`;
        updatedPlayers = updatedPlayers.map(x =>
          x.userId === p.userId ? { ...x, currentCard: { value: cardValue + 1, display: cardName }, hasDrawn: true } : x
        );
        await this.sendBotMessage(roomId, `Bot draws - ${p.username}: ${cardName}`, 'game');
      }
    }

    const withCards = updatedPlayers.filter(p =>
      p.isActive && p.currentCard &&
      (!tieBreaker || tiedPlayerIds.includes(p.userId))
    );
    if (withCards.length === 0) return;

    // Find lowest card value
    let lowestValue = Infinity;
    for (const p of withCards) {
      if (p.currentCard && p.currentCard.value < lowestValue) {
        lowestValue = p.currentCard.value;
      }
    }

    // Find all players with the lowest card
    const playersWithLowest = withCards.filter(p => p.currentCard?.value === lowestValue);

    // If there's a tie, run a tie-breaker round
    if (playersWithLowest.length > 1) {
      const tiedNames = playersWithLowest.map(p => `${p.username} (${p.currentCard?.display})`).join(', ');
      await this.sendBotMessage(
        roomId,
        `⚔️ TIE! ${playersWithLowest.length} players have ${CARD_RANKS[lowestValue - 1]}: ${tiedNames}. Tie-breaker round!`,
        'game'
      );

      // Reset hasDrawn and currentCard for tied players only
      const tiedIds = playersWithLowest.map(p => p.userId);
      updatedPlayers = updatedPlayers.map(p =>
        tiedIds.includes(p.userId) ? { ...p, currentCard: null, hasDrawn: false } : p
      );
      // Mark tie-breaker state in game so only tied players can draw
      await update(gameRef, { players: updatedPlayers, tieBreaker: { active: true, tiedPlayerIds: tiedIds } });

      // Schedule tie-breaker round
      await this.sendBotMessage(roomId, `⏱️ Tied players, !d to draw. 15 seconds!`, 'game');
      const timerKey = `${roomId}:tiebreaker`;
      if (this.timers.has(timerKey)) clearTimeout(this.timers.get(timerKey)!);
      const timer = setTimeout(() => this.processRoundEnd(roomId, true, tiedIds), 15000);
      this.timers.set(timerKey, timer);
      return;
    }

    // Single loser found
    const loser = playersWithLowest[0];
    updatedPlayers = updatedPlayers.map(p => p.userId === loser.userId ? { ...p, isActive: false } : p);
    const remaining = updatedPlayers.filter(p => p.isActive);

    await this.sendBotMessage(
      roomId,
      ` ${loser.username}: OUT with the lowest card! ${loser.currentCard?.display}`,
      'game'
    );

    if (remaining.length === 1) {
      // Clear any tie-breaker state before finishing
      await update(gameRef, { tieBreaker: null });
      await this.endGame(roomId, remaining[0], game);
    } else {
      await this.sendBotMessage(roomId, `All players, next round in 5 seconds!`, 'game');
      await this.sendBotMessage(
        roomId,
        `Players are (${remaining.length}): ${remaining.map(p => p.username).join(', ')}`,
        'game'
      );
      const nextRound = (game.currentRound || 1) + 1;
      await update(gameRef, {
        currentRound: nextRound,
        players: updatedPlayers.map(p => ({ ...p, currentCard: null, hasDrawn: false })),
        tieBreaker: null
      });
      await this.sendBotMessage(
        roomId,
        `📢 ROUND #${nextRound}: Players, !d to DRAW. 20 seconds.`,
        'game'
      );
      this.scheduleRoundEnd(roomId);
    }
  }

  private async endGame(roomId: string, winner: GamePlayer, game: GameSession) {
    const gameRef = ref(rtdb, `games/${roomId}/lowcard`);
    const totalPot = (game.betAmount || 0) * (game.players?.length || 0);
    const winnerPayout = Number((totalPot * (1 - HOUSE_RAKE_RATE)).toFixed(2));

    await updateCredits(winner.userId, winnerPayout);
    try { await addXP(winner.userId, 20); } catch (e) { console.warn('Failed to award winner XP (lowcard):', e); }
    try { await incrementMiniGameWins(winner.userId); } catch (e) { console.warn('Failed to track mini-game win (lowcard):', e); }
    try { await triggerCompanionEvent(winner.userId, 'mini_game_win', { roomId }); } catch (e) { console.warn('Failed to trigger companion mini_game_win (lowcard):', e); }
    try { await triggerCompanionEvent(winner.userId, 'high_amount_game_win', { roomId, amount: winnerPayout }); } catch (e) { console.warn('Failed to trigger companion high_amount_game_win (lowcard):', e); }
    try {
      const losers = (game.players || []).filter((p) => p.userId !== winner.userId);
      await Promise.all(losers.map((p) => triggerCompanionEvent(p.userId, 'mini_game_loss', { roomId })));
    } catch (e) {
      console.warn('Failed to trigger companion mini_game_loss events (lowcard):', e);
    }

    // Record transaction for game win
    await addDoc(collection(db, 'transactions'), {
      from: 'game',
      to: winner.userId,
      participants: [winner.userId],
      toUsername: winner.username,
      amount: winnerPayout,
      type: 'game',
      description: 'Lowcard game winner',
      timestamp: serverTimestamp()
    });

    await update(gameRef, { status: 'finished', endedAt: Date.now(), winnerId: winner.userId, winnerName: winner.username });

    await this.sendBotMessage(
      roomId,
      ` Lowcard game over! ${winner.username} WINS USD ${formatWithCommas(winnerPayout)}! CONGRATS!`,
      'game'
    );

    setTimeout(async () => { try { await remove(gameRef); } catch {} }, 5000);
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

// Singleton instance
export const lowcardGame = new LowcardGame();

