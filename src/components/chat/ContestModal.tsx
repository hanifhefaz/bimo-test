import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GiftShowerContest,
  getContestRemainingTime,
  INVITE_TOP_PRIZES,
  INVITE_GRAND_PRIZE_CREDITS
} from '@/lib/giftContest';
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
  const isInviteContest = contest.type === 'invite';
  const inviteTopPrizes = contest.fixedTopPrizes?.length ? contest.fixedTopPrizes : INVITE_TOP_PRIZES;
  const inviteGrandPrize = contest.grandPrizeCredits ?? INVITE_GRAND_PRIZE_CREDITS;
  const inviteDays = Math.floor(time.minutes / (60 * 24));
  const inviteHours = Math.floor((time.minutes % (60 * 24)) / 60);
  const inviteMinutes = time.minutes % 60;

  const handleJoin = () => {
    onOpenChange(false);
    if (isInviteContest) {
      navigate('/contests');
      return;
    }
    navigate(`/chatrooms/${contest.roomId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-tight">{isInviteContest ? 'Invite Contest Live!' : 'Gift Contest Underway!'}</DialogTitle>
          <DialogDescription>
            {isInviteContest ? (
              <>A global invite contest is currently running on <strong>Bimo33</strong>.</>
            ) : (
              <>A contest is currently running in <strong>{contest.roomName || contest.roomId}</strong>.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {!isInviteContest && gift && (
            <p>
              Eligible gift: <strong>{gift.emoji} {gift.name}</strong>
            </p>
          )}
          {isInviteContest ? (
            <>
              <p>Top 5 inviters win fixed prizes: <strong>{inviteTopPrizes.join(', ')}</strong></p>
              <p>Grand prize: <strong>{inviteGrandPrize} credits + top pet</strong> via lottery code draw.</p>
              <p className="text-body text-muted-foreground">
                How to join: Open Home page → Invite to Bimo33, generate your invite link, and share it. Each successful registration adds your contest count.
              </p>
            </>
          ) : (
            <p>Prize pool: <strong>{contest.prizeCredits} credits</strong></p>
          )}
          <p>
            Time left:{' '}
            <strong>
              {isInviteContest
                ? `${inviteDays}d ${String(inviteHours).padStart(2, '0')}h ${String(inviteMinutes).padStart(2, '0')}m`
                : `${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`}
            </strong>
          </p>
        </div>

        <DialogFooter className="mt-4">
          {isInviteContest ? (
            <Button variant="accent" onClick={handleJoin} className="mr-2">
              View Contest
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
