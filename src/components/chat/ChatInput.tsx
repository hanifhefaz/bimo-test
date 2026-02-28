import { useState, useRef } from 'react';
import { Send, Gift, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GIFTS } from '@/lib/firebaseOperations';
import { EmoticonPicker } from './EmoticonPicker';

interface ChatInputProps {
  onSend: (message: string) => void;
  onGift?: (giftId: string, username?: string) => void;
  disabled?: boolean;
  bimoActive?: boolean;
  ownedEmoticonPacks?: string[];
}

// types for suit so we can expand easily
type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'flag' | 'king';

export function ChatInput({ onSend, onGift, disabled, bimoActive = false, ownedEmoticonPacks = [] }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Dialog state for entering amount after selecting a suit (custom only)
  const [amountDialogOpen, setAmountDialogOpen] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');

  // fixed amount buttons
  const FIXED_AMOUNTS = [0.05, 0.1, 0.5, 1, 5, 10];

  // Gift modal state
  const [giftModalOpen, setGiftModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleSuitClick = (suit: Suit) => {
    setSelectedSuit(suit);
    setBetError('');
    // do not open dialog automatically; user may pick fixed amount or custom
  };

  const handleAmountClick = (amt: number) => {
    if (!selectedSuit) {
      setBetError('Please select a suit first');
      return;
    }
    onSend(`!b ${selectedSuit} ${amt}`);
    // reset selection after placing
    setSelectedSuit(null);
  };

const confirmBet = () => {
  const amt = parseFloat(betAmount);

  if (isNaN(amt) || amt < 0.05 || amt > 100) {
    setBetError('Amount must be between 0.05 and 100');
    return;
  }

  if (!selectedSuit) return;

  const cmd = `!b ${selectedSuit} ${amt}`;
  onSend(cmd);

  setAmountDialogOpen(false);
  setSelectedSuit(null);
  setBetAmount('');
};

  const handleGiftClick = (giftId: string) => {
    setMessage(`/gift ${giftId} `);
    inputRef.current?.focus();
  };

  const handleEmoticonSelect = (emoticon: string) => {
    setMessage(prev => prev + emoticon);
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 glass-strong border-t border-white/10">
      {bimoActive && (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-full max-w-xs sm:max-w-sm glass border-white/10 p-3"
            align="start"
          >
            <div className="space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Bet on a suit:
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handleSuitClick('spades')}
                  className={`flex items-center justify-center gap-2 w-full p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors ${selectedSuit==='spades'?'ring-2 ring-primary':''}`}
                >
                  <span className="text-xl sm:text-2xl">♠</span>
                  <span className="text-sm sm:text-base">Spades</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSuitClick('hearts')}
                  className={`flex items-center justify-center gap-2 w-full p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors text-red-400 ${selectedSuit==='hearts'?'ring-2 ring-primary':''}`}
                >
                  <span className="text-xl sm:text-2xl">♥</span>
                  <span className="text-sm sm:text-base">Hearts</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSuitClick('clubs')}
                  className={`flex items-center justify-center gap-2 w-full p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors ${selectedSuit==='clubs'?'ring-2 ring-primary':''}`}
                >
                  <span className="text-xl sm:text-2xl">♣</span>
                  <span className="text-sm sm:text-base">Clubs</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSuitClick('diamonds')}
                  className={`flex items-center justify-center gap-2 w-full p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors text-red-400 ${selectedSuit==='diamonds'?'ring-2 ring-primary':''}`}
                >
                  <span className="text-xl sm:text-2xl">♦</span>
                  <span className="text-sm sm:text-base">Diamonds</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSuitClick('flag')}
                  className={`flex items-center justify-center gap-2 w-full p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors ${selectedSuit==='flag'?'ring-2 ring-primary':''}`}
                >
                  <span className="text-xl sm:text-2xl">🏳️</span>
                  <span className="text-sm sm:text-base">Flag</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSuitClick('king')}
                  className={`flex items-center justify-center gap-2 w-full p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors ${selectedSuit==='king'?'ring-2 ring-primary':''}`}
                >
                  <span className="text-xl sm:text-2xl">👑</span>
                  <span className="text-sm sm:text-base">King</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground mt-2 pt-2 border-t border-white/10">
                Click a suit then a fixed amount below, or choose "Custom" to type your own value.
              </p>

              {/* fixed amounts row */}
              <div className="flex flex-wrap gap-2 mt-2">
                {FIXED_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAmountClick(amt)}
                    className="px-3 py-1 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition"
                  >
                    {amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSuit) return setBetError('Select a suit first');
                    setAmountDialogOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition"
                >
                  Custom
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

      )}

      {/* Amount dialog for custom bet */}
      <Dialog open={amountDialogOpen} onOpenChange={(open) => setAmountDialogOpen(open)}>
        <DialogContent className="glass border-white/10 w-80">
          <DialogHeader>
            <DialogTitle>Bet {selectedSuit ? (selectedSuit.charAt(0).toUpperCase() + selectedSuit.slice(1)) : ''}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Input
            type="number"
            min="0.05"
            max="100"
            step="0.01"
            value={betAmount}
            onChange={(e) => {
              setBetAmount(e.target.value);
              setBetError('');
            }}
            placeholder="Enter amount (0.05 - 100)"
          />
            {betError && <div className="text-sm text-destructive mt-2">{betError}</div>}
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setAmountDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmBet}>Place Bet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emoticon picker - only shown if user has packs */}
      <EmoticonPicker
        ownedPacks={ownedEmoticonPacks}
        onSelectEmoticon={handleEmoticonSelect}
      />

      {/* Gift button & modal */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => setGiftModalOpen(true)}
      >
        <Gift className="w-5 h-5 text-primary" />
      </Button>

      <Dialog open={giftModalOpen} onOpenChange={setGiftModalOpen}>
        <DialogContent className="glass border-white/10 w-full max-w-md max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Send a gift</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-2">
            {GIFTS.map((gift) => (
              <button
                key={gift.id}
                type="button"
                onClick={() => {
                  handleGiftClick(gift.id);
                  setGiftModalOpen(false);
                }}
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span className="text-2xl">{gift.emoji}</span>
                <div className="text-left">
                  <div className="text-sm font-medium">{gift.name}</div>
                  <div className="text-xs text-gold">{gift.price} USD</div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 pt-2 border-t border-white/10 text-center">
            Use <code>/gift [name] [user]</code> or <code>/shower [name]</code>
          </p>

          <DialogFooter className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setGiftModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1"
      />

      <Button
        type="submit"
        variant="gradient"
        size="icon"
        disabled={!message.trim() || disabled}
        className="shrink-0"
      >
        <Send className="w-5 h-5" />
      </Button>
    </form>
  );
}
