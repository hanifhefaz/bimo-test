import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GiftShowerContest, getContestRemainingTime } from '@/lib/giftContest';
import { GIFTS } from '@/lib/firebaseOperations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ContestModalProps {
  contest: GiftShowerContest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContestModal({ contest, open, onOpenChange }: ContestModalProps) {
  const navigate = useNavigate();
  const time = getContestRemainingTime(contest);
  const gift = contest.giftId ? GIFTS.find(g => g.id === contest.giftId) : null;

  const handleJoin = () => {
    onOpenChange(false);
    navigate(`/chatrooms/${contest.roomId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Gift Contest Underway!</DialogTitle>
          <DialogDescription>
            A contest is currently running in <strong>{contest.roomName || contest.roomId}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {gift && (
            <p>
              Eligible gift: <strong>{gift.emoji} {gift.name}</strong>
            </p>
          )}
          <p>Prize pool: <strong>{contest.prizeCredits} credits</strong></p>
          <p>Time left: <strong>{String(time.minutes).padStart(2, '0')}:{String(time.seconds).padStart(2, '0')}</strong></p>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
