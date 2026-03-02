import { motion } from 'framer-motion';
import { NewAppLayout } from '@/components/layout/NewAppLayout';

const newsItems = [
  {
    date: 'March 1, 2026',
    title: 'Pre-Release Status Update',
    emoji: '🧭',
    body: 'Bimo33 is still in pre-release and has not launched publicly yet. Current work is focused on stability, real-time presence accuracy, contest fairness, and payout verification before public release.',
  },
  {
    date: 'March 1, 2026',
    title: 'Daily missions section added',
    emoji: '📅',
    body: 'A new section in the home page now displays daily missions. This helps users track their progress and upcoming opportunities.',
  },
  {
    date: 'March 1, 2026',
    title: 'Invite Contest Test Run (5 Days)',
    emoji: '🎉',
    body: 'The invite contest is currently running as a live test to validate registration tracking, leaderboard updates, lottery code generation, and reward distribution. Top 5 inviters and one grand winner are selected for testing; rules and rewards may be refined before launch.',
  },
  {
    date: 'February 28, 2026',
    title: 'USDT Credit Purchase (Beta)',
    emoji: '💵',
    body: 'USDT purchase flow is available for beta testing in the Store. Transactions and credit delivery are being monitored to ensure consistency and reliability.',
  },
  {
    date: 'February 20, 2026',
    title: 'Closed Beta Testing',
    emoji: '🧪',
    body: 'Closed beta began with a limited tester group. Feedback is being collected across onboarding, chat quality, status syncing, daily spin behavior, contest commands, and moderation tools.',
  },
  {
    date: 'January 30, 2026',
    title: 'Core Systems Milestone',
    emoji: '🔧',
    body: 'Core modules were completed: accounts, chatrooms, private messages, gift economy, pets/assets, daily spin, and role systems. Current sprint is focused on bug fixes and production hardening.',
  },
  {
    date: 'December 15, 2025',
    title: 'Early Sneak Peek',
    emoji: '👀',
    body: 'First preview shared for profiles, chat experience, collectibles, and reward loops. This milestone helped shape the current beta roadmap.',
  },
  {
    date: 'November 20, 2025',
    title: 'Project Announcement',
    emoji: '📢',
    body: 'Initial announcement for a social app combining chat, collectibles, gifting, games, and rewards for long-time mobile community users.',
  },
];

export default function NewsPage() {
  return (
    <NewAppLayout>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Background Glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/20 via-transparent to-primary/10 blur-3xl" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 md:mb-16 text-center"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold heading-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent p-1">
            Updates
          </h1>
          <p className="mt-4 text-muted-foreground text-body sm:text-lg">
            What&apos;s new and what&apos;s coming next.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Spine */}
          <div
            className="
            absolute
            left-4 md:left-1/2
            top-0 bottom-0
            w-[3px]
            md:-translate-x-1/2
            bg-gradient-to-b from-primary via-primary/70 to-primary
            rounded-full
            opacity-40
          "
          />

          <div className="space-y-14 md:space-y-24">
            {newsItems.map((item, idx) => {
              const isLeft = idx % 2 === 0;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`
                    relative flex
                    justify-start
                    md:${isLeft ? 'justify-start' : 'justify-end'}
                  `}
                >
                  {/* Dot */}
                  <div
                    className="
                    absolute
                    left-4 md:left-1/2
                    top-6
                    w-4 h-4 md:w-5 md:h-5
                    md:-translate-x-1/2
                    bg-primary
                    rounded-full
                    shadow-[0_0_25px_hsl(var(--primary)/0.6)]
                    z-10
                  "
                  />

                  {/* Content */}
                  <div
                    className={`
                    w-full md:w-[45%]
                    pl-12 md:pl-0
                    ${isLeft ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'}
                    text-left
                  `}
                  >
                    {/* Date */}
                    <div className="inline-block mb-4 px-4 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary">
                      {item.date}
                    </div>

                    {/* Title */}
                    <h2
                      className={`
                      text-lg sm:text-xl md:text-2xl
                      font-semibold heading-tight
                      flex items-center gap-3
                      ${isLeft ? 'md:justify-end' : 'md:justify-start'}
                      justify-start
                      text-primary
                    `}
                    >
                      <span className="text-2xl md:text-3xl">{item.emoji}</span>
                      <span>{item.title}</span>
                    </h2>

                    {/* Body */}
                    <p className="mt-4 text-muted-foreground text-body">
                      {item.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {newsItems.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📰</div>
            <p className="text-muted-foreground">No announcements yet.</p>
          </div>
        )}
      </div>
    </NewAppLayout>
  );
}
