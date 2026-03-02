import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Trophy, Clock, Crown } from 'lucide-react';
import Username from '@/components/Username';
import { GiftShowerContest, getContestLeaderboard, getContestRemainingTime } from '@/lib/giftContest';
import { GIFTS } from '@/lib/firebaseOperations';

interface GiftContestBannerProps {
  contest: GiftShowerContest;
}

export function GiftContestBanner({ contest }: GiftContestBannerProps) {
  const [timeLeft, setTimeLeft] = useState(getContestRemainingTime(contest));
  const leaderboard = getContestLeaderboard(contest);
  const isEnded = !contest.isActive;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getContestRemainingTime(contest));
    }, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 p-3 rounded-xl bg-gradient-to-r from-gold/20 to-accent/20 border border-gold/30"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-gold animate-bounce" />
          <span className="heading-tight font-semibold text-primary">
            {isEnded ? 'Gift Contest Ended' : 'Gift Shower Contest!'}
          </span>
          {!isEnded && <span className="text-body font-semibold text-accent">Top 5 users will share the prize!</span>}
        </div>
        {!isEnded && (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono font-semibold">
              {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-accent" />
            <span className="text-body">Prize: <span className="font-bold text-accent">{contest.prizeCredits} USD</span></span>
      </div>
      {contest.giftId && (() => {
        const gift = GIFTS.find(g => g.id === contest.giftId);
        if (gift) {
          return (
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-gold" />
              <span className="text-body">Eligible gift: <span className="font-bold text-accent">{gift.emoji} {gift.name}</span></span>
            </div>
          );
        }
        return null;
      })()}

      {/* {leaderboard.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-caption text-muted-foreground">Top Gifters:</p>
          {leaderboard.slice(0, 5).map((entry, index) => (
            <div key={entry.userId} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                {index === 0 && <Crown className="w-3 h-3 text-gold" />}
                <span className={index === 0 ? 'text-gold font-medium' : 'text-muted-foreground'}>
                  {index + 1}. <Username username={entry.username} />
                </span>
              </div>
              <span className="text-muted-foreground font-semibold">{entry.totalGifts} gifts</span>
            </div>
          ))}
        </div>
      )} */}

      {isEnded && contest.winnerName ? (
        <p className="text-sm text-accent font-semibold mt-2 text-center">
          🏆 Winner: {contest.winnerName}
        </p>
      ) : (
        <>
          <p className="text-caption text-muted-foreground mt-2 text-center">
            {contest.giftId
              ? (() => {
                  const gift = GIFTS.find(g => g.id === contest.giftId);
                  return gift
                    ? `Send ${gift.emoji} ${gift.name} via "/gift ${gift.id}" or "/shower ${gift.id}" to participate!`
                    : 'Send the contest gift to participate!';
                })()
              : 'Send gifts using "/gift gift_name" or "/shower gift_name" to compete!'}
          </p>
          <p className="text-body text-muted-foreground mt-2 text-center">
            Check the leaderboard
          </p>
        </>
      )}
    </motion.div>
  );
}

