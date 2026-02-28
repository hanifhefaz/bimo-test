// Game types - shared across all game implementations

export interface GamePlayer {
  userId: string;
  username: string;
  isActive: boolean;
  hasDrawn: boolean;
  joinedAt: number;
  currentCard?: {
    value: number;
    display: string;
  };
  bets?: Array<{
    suit: string;
    amount: number;
  }>;
}

export interface GameSession {
  id: string;
  roomId: string;
  gameType: string;
  status: 'waiting' | 'playing' | 'finished';
  betAmount: number;
  players: GamePlayer[];
  currentRound: number;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  winnerId?: string;
  winnerName?: string;
  // Tie-breaker state for games that require additional rounds among tied players
  tieBreaker?: {
    active: boolean;
    tiedPlayerIds: string[];
  };
}

export interface BotMessage {
  content: string;
  type: 'game' | 'private';
  targetUserId?: string; // If set, message is private to this user
}

// Base game interface that all games must implement
export interface GameHandler {
  readonly gameType: string;
  readonly botName: string;
  readonly botAvatar: string;

  // Called when bot is added to room
  getWelcomeMessage(): string;

  // Called when bot is removed from room
  getRemovalMessage(): string;

  // Handle a game command (e.g., !start, !j, !d)
  handleCommand(
    command: string,
    args: string[],
    senderId: string,
    senderName: string,
    roomId: string
  ): Promise<BotMessage[]>;

  // Check if game is currently in progress
  isGameInProgress(roomId: string): Promise<boolean>;

  // Force end the game (for cleanup)
  forceEnd(roomId: string): Promise<void>;
}
