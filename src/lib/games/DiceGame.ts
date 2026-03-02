// Dice Game - Separate game logic
import { ref, get, set, update, remove } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { updateCredits, addXP, getUserById, incrementGamesPlayedWeekly, incrementMiniGameWins, triggerCompanionEvent } from '../firebaseOperations';
import { formatWithCommas } from '../utils';
import { GameHandler, BotMessage, GameSession, GamePlayer } from './types';

const DICE_FACES: Record<number, string> = {
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
};
const TOTAL_EMOJI: Record<number, string> = {
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
  10: '🔟',
  11: '1️⃣1️⃣',
  12: '1️⃣2️⃣',
};

const HOUSE_RAKE_RATE = 0.05;


export class DiceGame implements GameHandler {
  readonly gameType = 'dice';
  readonly botName = 'DiceBot';
  readonly botAvatar = '🎲';

  private timers: Map<string, NodeJS.Timeout> = new Map();

  getWelcomeMessage(): string {
    return (
      `ðŸŽ² DiceBot has been added to the room !start <amount> to start the game!`
    );
  }

  getRemovalMessage(): string {
    return 'ðŸŽ² DiceBot has been removed from the room.';
  }

  async isGameInProgress(roomId: string): Promise<boolean> {
    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    const snap = await get(gameRef);
    if (!snap.exists()) return false;
    const game = snap.val();
    return game.status === 'waiting' || game.status === 'playing';
  }

  async forceEnd(roomId: string): Promise<void> {
    // Clear timers
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

    // Remove game from database
    const gameRef = ref(rtdb, `games/${roomId}/dice`);
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

    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    const snap = await get(gameRef);
    const currentGame = snap.exists() ? snap.val() as GameSession : null;

    switch (command) {
      case 'start':
        const startResult = await this.handleStart(args, senderId, senderName, roomId, currentGame);
        messages.push(...startResult);
        break;

      case 'j':
        const joinResult = await this.handleJoin(senderId, senderName, roomId, currentGame);
        messages.push(...joinResult);
        break;

      case 'd':
        const drawResult = await this.handleRoll(senderId, senderName, roomId, currentGame);
        messages.push(...drawResult);
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
    const MIN_WAGER = 0.05;
    const wager = parseFloat(args[0]) || 0;

    if (!wager || wager < MIN_WAGER) {
      return [{
        content: `Minimum wager is USD ${MIN_WAGER.toFixed(2)}. Use !start <amount>`,
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

    // Deduct starter credits
    await updateCredits(senderId, -wager);

    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: [senderId],
      amount: wager,
      type: 'game',
      description: 'Dice game entry',
      timestamp: serverTimestamp()
    });

    const gameData: GameSession = {
      id: `game_${Date.now()}`,
      roomId,
      gameType: 'dice',
      status: 'waiting',
      betAmount: wager,
      players: [
        { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now() }
      ],
      currentRound: 0,
      createdBy: senderId,
      createdAt: Date.now()
    };

    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    await set(gameRef, gameData);

    // Increment starter's games played (weekly) (award XP when game actually starts)
    try {
      await incrementGamesPlayedWeekly(senderId);
    } catch (e) {
      console.error('Failed to increment gamesPlayedWeekly for game starter', e);
    }

    // Start join timer
    this.scheduleJoinPhaseEnd(roomId);

    return [{
      content: ` ${senderName} has started a new game, costs ${formatWithCommas(wager)} credits. Type !j to join within 30 seconds!`,
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

    // Check join window
    if (Date.now() > (currentGame.createdAt || 0) + 30000) {
      return [{ content: 'Join window has closed.', type: 'private', targetUserId: senderId }];
    }

    // Already joined?
    if (currentGame.players.some(p => p.userId === senderId)) {
      return [{ content: 'You have already joined this game.', type: 'private', targetUserId: senderId }];
    }

    const user = await getUserById(senderId);
    if (!user || user.credits < currentGame.betAmount) {
      return [{ content: 'Insufficient credits to join.', type: 'private', targetUserId: senderId }];
    }

    // Deduct credits
    await updateCredits(senderId, -currentGame.betAmount);

    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      from: senderId,
      fromUsername: senderName,
      to: 'game',
      participants: [senderId],
      amount: currentGame.betAmount,
      type: 'game',
      description: 'Dice game join',
      timestamp: serverTimestamp()
    });

    const updatedPlayers = [
      ...currentGame.players,
      { userId: senderId, username: senderName, isActive: true, hasDrawn: false, joinedAt: Date.now() }
    ];

    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    await update(gameRef, { players: updatedPlayers });

    // Increment joiner's weekly games counter (award XP when game actually starts)
    try {
      await incrementGamesPlayedWeekly(senderId);
    } catch (e) {
      console.error('Failed to increment gamesPlayedWeekly for joiner', e);
    }

    return [{
      content: ` ${senderName} has joined the game! (${updatedPlayers.length} players in the game so far!)`,
      type: 'game'
    }];
  }

  private async handleRoll(
    senderId: string,
    senderName: string,
    roomId: string,
    currentGame: GameSession | null
  ): Promise<BotMessage[]> {
    if (!currentGame || currentGame.status !== 'playing') {
      return [{ content: 'No active game to roll in.', type: 'private', targetUserId: senderId }];
    }

    const player = currentGame.players.find(p => p.userId === senderId && p.isActive);
    if (!player) {
      return [{ content: 'You are not an active player in this game.', type: 'private', targetUserId: senderId }];
    }

    if (player.hasDrawn) {
      return [{ content: 'You have already rolled this round.', type: 'private', targetUserId: senderId }];
    }

    // Roll two dice

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    const display = `${DICE_FACES[die1]} + ${DICE_FACES[die2]} = ${TOTAL_EMOJI[total]}`;

    // currentCard object is assigned when updating players below

    const updatedPlayers = currentGame.players.map(p =>
      p.userId === senderId
        ? {
            ...p,
            currentCard: { value: total, display },
            hasDrawn: true
          }
        : p
    );

    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    await update(gameRef, { players: updatedPlayers });

    // Check if all active players have rolled
    const activePlayers = updatedPlayers.filter(p => p.isActive);
    const allRolled = activePlayers.every(p => p.hasDrawn);

    if (allRolled) {
      // Process round immediately
      this.clearRoundTimer(roomId);
      setTimeout(() => this.processRoundEnd(roomId), 1000);
    }

    return [{
      content: `🎲  ${senderName} has rolled ${display}!`,
      type: 'game'
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
    const timerKey = `${roomId}:round`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
    }

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
    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    const snap = await get(gameRef);
    const game = snap.exists() ? snap.val() as GameSession : null;

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
          description: 'Dice game cancelled - refund',
          timestamp: serverTimestamp()
        });
      }
      await remove(gameRef);

      await this.sendBotMessage(roomId, 'Not enough players joined. Game cancelled. Type !start to start a new game.', 'game');
      return;
    }

    // Start playing - use null instead of undefined (Firebase doesn't allow undefined)
    const updatedPlayers = game.players.map(p => ({ ...p, currentCard: null, hasDrawn: false }));
    await update(gameRef, {
      status: 'playing',
      currentRound: 1,
      startedAt: Date.now(),
      players: updatedPlayers
    });

    // Award join XP to all players now that the game is starting
    try {
      for (const p of updatedPlayers) {
        try { await addXP(p.userId, 10); } catch (e) { console.warn('Failed to award join XP to dice player:', e); }
      }
    } catch (e) {
      console.error('Failed to award join XP to dice players:', e);
    }

    await this.sendBotMessage(
      roomId,
      ` 📢 Round #1: ${game.players.length} players remaining in the game! Type !d to roll within 20 seconds, or the bot will roll!`,
      'game'
    );

    this.scheduleRoundEnd(roomId);
  }

  private async processRoundEnd(roomId: string) {
    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    const snap = await get(gameRef);
    const game = snap.exists() ? snap.val() as GameSession : null;

    if (!game || game.status !== 'playing') return;

    let updatedPlayers = [...game.players];
    const activePlayers = updatedPlayers.filter(p => p.isActive);

    // Auto-roll for those who didn't
    for (const p of activePlayers) {
      if (!p.hasDrawn) {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        const display = `${DICE_FACES[die1]} + ${DICE_FACES[die2]} = ${TOTAL_EMOJI[total]}`;

        updatedPlayers = updatedPlayers.map(x =>
          x.userId === p.userId
            ? { ...x, currentCard: { value: total, display }, hasDrawn: true }
            : x
        );
        await this.sendBotMessage(roomId, ` Auto-rolling: The bot has rolled ${display} for ${p.username}!`, 'game');
      }
    }

    // Determine loser (lowest value)
    const withRolls = updatedPlayers.filter(p => p.isActive && p.currentCard);
    if (withRolls.length === 0) return;

    let loser = withRolls[0];
    for (const p of withRolls) {
      if (p.currentCard && loser.currentCard && p.currentCard.value < loser.currentCard.value) {
        loser = p;
      }
    }

    updatedPlayers = updatedPlayers.map(p =>
      p.userId === loser.userId ? { ...p, isActive: false } : p
    );
    const remaining = updatedPlayers.filter(p => p.isActive);

    await this.sendBotMessage(
      roomId,
      ` ${loser.username} is eliminated with ${loser.currentCard?.display}! players remaining in the game: ${remaining.length}`,
      'game'
    );

    if (remaining.length === 1) {
      await this.endGame(roomId, remaining[0], game);
    } else {
      // Next round - use null instead of undefined (Firebase doesn't allow undefined)
      const nextRound = (game.currentRound || 1) + 1;
      await update(gameRef, {
        currentRound: nextRound,
        players: updatedPlayers.map(p => ({ ...p, currentCard: null, hasDrawn: false }))
      });

      await this.sendBotMessage(
        roomId,
        ` 📢 Round #${nextRound} ${remaining.length} players remaining in the game! Type !d to roll within 20 seconds or the bot will roll!`,
        'game'
      );

      this.scheduleRoundEnd(roomId);
    }
  }

  private async endGame(roomId: string, winner: GamePlayer, game: GameSession) {
    const gameRef = ref(rtdb, `games/${roomId}/dice`);
    const totalPot = (game.betAmount || 0) * (game.players?.length || 0);
    const winnerPayout = Number((totalPot * (1 - HOUSE_RAKE_RATE)).toFixed(2));

    await updateCredits(winner.userId, winnerPayout);
    try { await addXP(winner.userId, 20); } catch (e) { console.warn('Failed to award winner XP (dice):', e); }
    try { await incrementMiniGameWins(winner.userId); } catch (e) { console.warn('Failed to track mini-game win (dice):', e); }
    try { await triggerCompanionEvent(winner.userId, 'mini_game_win', { roomId }); } catch (e) { console.warn('Failed to trigger companion mini_game_win (dice):', e); }
    try { await triggerCompanionEvent(winner.userId, 'high_amount_game_win', { roomId, amount: winnerPayout }); } catch (e) { console.warn('Failed to trigger companion high_amount_game_win (dice):', e); }
    try {
      const losers = (game.players || []).filter((p) => p.userId !== winner.userId);
      await Promise.all(losers.map((p) => triggerCompanionEvent(p.userId, 'mini_game_loss', { roomId })));
    } catch (e) {
      console.warn('Failed to trigger companion mini_game_loss events (dice):', e);
    }

    // Record winning transaction
    await addDoc(collection(db, 'transactions'), {
      from: 'game',
      to: winner.userId,
      participants: [winner.userId],
      toUsername: winner.username,
      amount: winnerPayout,
      type: 'game',
      description: 'Dice game winnings',
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
      ` GAME OVER! 🎉 ${winner.username} WINS ${formatWithCommas(winnerPayout)} USD! CONGRATS!!! 🎊`,
      'game'
    );

    // Private notification to the winner
    // await this.sendBotMessage(
    //   roomId,
    //   `🎉 Congrats ${winner.username}! You won ${formatWithCommas(winnerPayout)} credits!`,
    //   'private',
    //   winner.userId
    // );

    // Remove game after delay
    setTimeout(async () => {
      try { await remove(gameRef); } catch (e) { /* ignore */ }
    }, 5000);
  }

  private async sendBotMessage(roomId: string, content: string, type: 'game' | 'private', targetUserId?: string) {
    const { push } = await import('firebase/database');
    const messagesRef = ref(rtdb, `messages/${roomId}`);

    // Build message object - only include targetUserId if defined (Firebase doesn't allow undefined)
    const messageData: Record<string, any> = {
      roomId,
      senderId: 'bot',
      senderName: this.botName,
      senderAvatar: this.botAvatar,
      content,
      type,
      timestamp: Date.now()
    };

    // Only add targetUserId if provided (for private messages)
    if (targetUserId) {
      messageData.targetUserId = targetUserId;
    }

    await push(messagesRef, messageData);
  }
}

// Singleton instance
export const diceGame = new DiceGame();

