import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatShortNumber, formatWithCommas } from '@/lib/utils';
import { NewAppLayout } from '@/components/layout/NewAppLayout';
import PetAnimation from '@/components/PetAnimation';
import { STORE_ITEMS } from '@/lib/firebaseOperations';
import {
  getActiveContests,
  GiftShowerContest,
  getContestLeaderboard,
  calculatePrizeDistribution,
  INVITE_TOP_PRIZES,
  INVITE_GRAND_PRIZE_CREDITS
} from '@/lib/giftContest';

export default function ContestsPage() {
  const [now, setNow] = useState(Date.now());
  const topPet = STORE_ITEMS
    .filter(item => item.type === 'pet')
    .sort((a, b) => b.price - a.price)[0];

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: contests, isLoading, error } = useQuery<
    GiftShowerContest[],
    unknown
  >({
    queryKey: ['activeContests'],
    queryFn: getActiveContests,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const getRemaining = (contest: GiftShowerContest) =>
    Math.max(0, contest.endTime - now);

  const renderCountdown = (contest: GiftShowerContest) => {
    const remaining = getRemaining(contest);
    if (contest.type === 'invite') {
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
      return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
    }
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0'
    )}`;
  };

  const getStatus = (contest: GiftShowerContest) => {
    if (!contest.isActive) return 'ended';
    const remaining = getRemaining(contest);
    if (remaining < 5 * 60 * 1000) return 'ending';
    return 'live';
  };

  const getNumberEmoji = (rank: number) => {
    const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    return numberEmojis[rank] || `${rank + 1}.`;
  };

  return (
    <NewAppLayout>
      <div className="p-4 max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-display heading-tight text-3xl font-bold tracking-tight flex items-center gap-2">
            🏆 Contests
          </h1>
          <p className="text-body text-muted-foreground mt-2">
            Compete live and climb the leaderboard before time runs out.
          </p>
        </motion.div>

        {isLoading && (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="py-10 text-center text-destructive font-medium">
            Failed to load contests.
          </div>
        )}

        {contests && contests.length === 0 && (
          <div className="py-16 text-center">
            <h2 className="heading-tight text-lg font-semibold mb-2">
              No Active Contests
            </h2>
            <p className="text-body text-muted-foreground">
              New competitions will launch soon.
            </p>
          </div>
        )}

        <div className="space-y-8">
          {contests?.map((contest, index) => {
            const leaderboard = getContestLeaderboard(contest);
            const status = getStatus(contest);
            const isEnding = status === 'ending';
            const inviteTopPrizes = contest.fixedTopPrizes?.length ? contest.fixedTopPrizes : INVITE_TOP_PRIZES;
            const inviteGrandPrize = contest.grandPrizeCredits ?? INVITE_GRAND_PRIZE_CREDITS;

            return (
              <motion.div
                key={contest.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative rounded-2xl border border-border bg-primary/10 shadow-sm hover:shadow-md transition overflow-hidden ${status === 'ended' ? 'opacity-70' : ''}`}
              >
                {/* Accent Bar */}
                {/* <div className="h-1 bg-primary/20" /> */}

                <div className="p-6">

                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="heading-tight text-xl font-semibold truncate">
                          {contest.roomName || contest.roomId}
                        </h2>

                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                            status === 'ended'
                              ? 'bg-destructive/10 text-destructive'
                              : isEnding
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {status === 'ended' ? '🔴 Ended' : isEnding ? '🟡 Ending Soon' : '🟢 Live'}
                        </span>
                      </div>

                      <p className="text-body text-muted-foreground capitalize">
                        {contest.type || 'gift'} contest
                      </p>
                    </div>
                  </div>

                  {/* Prize + Countdown (or ended note) */}
                  <div className="flex items-center justify-between bg-accent/20 rounded-xl px-4 py-3 mb-6 border border-accent/10">
                    {contest.type === 'gift' ? (
                      <div className="text-sm flex items-center gap-2">
                        🎁 Prize Pool:
                        <span className="font-semibold text-accent">
                          {contest.prizeCredits} USD
                        </span>
                      </div>
                    ) : contest.type === 'invite' ? (
                      <div className="text-sm">
                        <div>🏅 Top 5: <span className="font-semibold text-accent">{inviteTopPrizes.map(v => `$${v}`).join(' / ')}</span></div>
                        <div className="flex items-center gap-2">
                          <span>🎁 Grand Prize:</span>
                          <span className="font-semibold text-accent">${inviteGrandPrize} credits</span> & a
                          {topPet?.animationData && (
                            <span className="inline-flex items-center">
                              <PetAnimation animationData={topPet.animationData} size={28} />
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    <div
                      className={`font-mono text-sm px-3 py-1 rounded-lg border ${
                        status === 'ended'
                          ? 'bg-destructive/30 border-destructive/20 text-destructive-foreground'
                          : isEnding
                          ? 'bg-destructive/10 border-destructive/20 text-destructive'
                          : 'bg-gold border-border'
                      }`}
                    >
                      {status === 'ended' ? 'Ended' : `⏳ ${renderCountdown(contest)}`}
                      {isEnding && ' 🔥'}
                    </div>
                  </div>

                  {/* Contest details (start/end times, gift filter) */}
                  <div className="text-body text-muted-foreground mb-4 space-y-0.5">
                    <div>Started: {new Date(contest.startTime).toLocaleString()}</div>
                    <div>Ends: {new Date(contest.endTime).toLocaleString()}</div>
                    {contest.giftId && <div>Eligible Gift: {contest.giftId}</div>}
                  </div>

                  {/* Leaderboard */}
                  {contest.type === 'gift' && leaderboard.length > 0 && (
                    <div>
                      <h3 className="heading-tight text-body font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                        🏅 Leaderboard
                      </h3>

                      <div className="space-y-2">
                        {leaderboard.slice(0, 10).map((entry, i) => (
                          <div
                            key={entry.userId}
                            className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm transition ${
                              i < 5
                                ? 'bg-success/10 border border-success/20'
                                : 'bg-muted/60 hover:bg-muted/60'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 text-center font-semibold">
                                {getNumberEmoji(i)}
                              </span>
                              <span className="truncate lowercase">
                                {entry.username.toLowerCase()}
                              </span>
                            </div>

                            <span
                              className={`font-medium ${
                                i < 5 ? 'text-primary' : ''
                              }`}
                            >
                              {entry.totalGifts}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {contest.type === 'invite' && (
                    <div className="space-y-3">
                      <h3 className="heading-tight text-body font-semibold text-muted-foreground flex items-center gap-2">
                        🎫 Invite Participants
                      </h3>
                      {(contest.inviteStats && Object.keys(contest.inviteStats).length > 0) ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {Object.entries(contest.inviteStats)
                            .map(([userId, data]) => ({
                              userId,
                              username: data.username,
                              successfulInvites: data.successfulInvites,
                              lotteryCount: (data.lotteryCodes || []).length
                            }))
                            .sort((a, b) => b.successfulInvites - a.successfulInvites)
                            .map((entry, i) => (
                              <div
                                key={entry.userId}
                                className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
                                  i < 5 ? 'bg-success/10 border border-success/20' : 'bg-muted/40'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-6 text-center font-semibold">{getNumberEmoji(i)}</span>
                                  <span className="truncate lowercase">{entry.username.toLowerCase()}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{entry.successfulInvites} invites</div>
                                  <div className="text-caption text-muted-foreground">{entry.lotteryCount} codes</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-body text-muted-foreground">No participants yet.</p>
                      )}
                    </div>
                  )}

                  {/* prize distribution for ended contests */}
                  {status === 'ended' && contest.type === 'gift' && (
                    <div className="mt-4 text-sm">
                      <h3 className="heading-tight font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                        💰 Prizes
                      </h3>
                      {calculatePrizeDistribution(contest).map((d, i) => (
                        <div
                          key={d.userId}
                          className="flex justify-between items-center px-3 py-1 rounded-lg text-sm bg-muted/10 mb-1"
                        >
                          <span>
                            {i + 1}. {d.username}
                          </span>
                          <span className="font-medium text-success">
                            ${formatWithCommas(d.prize)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {status === 'ended' && contest.type === 'invite' && (
                    <div className="mt-4 text-sm space-y-3">
                      <h3 className="heading-tight font-semibold text-muted-foreground flex items-center gap-2">
                        💰 Invite Contest Results
                      </h3>
                      {(contest.topPrizeWinners && contest.topPrizeWinners.length > 0) ? (
                        <div className="space-y-1">
                          {contest.topPrizeWinners.map((winner, i) => (
                            <div
                              key={`${winner.userId}_${i}`}
                              className="flex justify-between items-center px-3 py-1 rounded-lg text-sm bg-muted/10"
                            >
                              <span>{i + 1}. {winner.username} ({winner.successfulInvites} invites)</span>
                              <span className="font-medium text-success">${formatWithCommas(winner.prize)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-body text-muted-foreground">No top-prize winners recorded.</p>
                      )}

                      {contest.grandPrizeWinnerName ? (
                        <div className="rounded-lg border border-gold/30 bg-gold/10 p-3">
                          <p className="font-semibold">🎁 Grand Prize Winner: {contest.grandPrizeWinnerName}</p>
                          <p className="text-caption text-muted-foreground mt-1">
                            Lottery Code: <span className="font-semibold text-foreground">{contest.grandPrizeLotteryCode || 'N/A'}</span>
                          </p>
                          <p className="text-caption text-muted-foreground">
                            Prize: ${inviteGrandPrize} credits
                          </p>
                          {topPet?.animationData && (
                            <div className="mt-1 inline-flex items-center">
                              <PetAnimation animationData={topPet.animationData} size={34} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-caption text-muted-foreground">No grand prize draw (no lottery entries).</p>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </NewAppLayout>
  );
}
