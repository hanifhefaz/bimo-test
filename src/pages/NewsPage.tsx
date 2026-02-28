import { motion } from 'framer-motion';
import { NewAppLayout } from '@/components/layout/NewAppLayout';

const newsItems = [
  {
    date: 'March 15, 2026',
    title: 'Invite Friends Contest',
    emoji: '🎉',
    body: 'We are planning a new contest for inviting new users to the app. The contest will run for 2 weeks and the top 5 inviters will win exclusive pets and credits. There will also be a grand winner! More details will be posted here soon.'
  },
  {
    date: 'March 10, 2026',
    title: 'Official Launch of the App',
    emoji: '🚀',
    body: 'We are excited to announce the official launch of our app! Thank you to everyone who has supported us during the beta phase. We have many new features and improvements planned, so stay tuned for more updates.'
  },
  {
    date: 'February 20, 2026',
    title: 'Beta Testing Phase',
    emoji: '🧪',
    body: 'We have entered the beta testing phase! We are inviting a limited number of users to test the app and provide feedback. If you are interested in participating, please sign up on our website.'
  },
  {
    date: 'January 30, 2026',
    title: 'Development Update',
    emoji: '🔧',
    body: 'We have made significant progress in the development of the app. The core features are now implemented and we are working on polishing the user experience. We are on track for our planned launch date.'
  },
  {
    date: 'January 1, 2026',
    title: 'Happy New Year!',
    emoji: '🎆',
    body: 'Wishing everyone a happy and prosperous new year! We are excited for what 2026 has in store for us and we can’t wait to share our app with you all.'
  },
  {
    date: 'December 15, 2025',
    title: 'Sneak Peek of the App',
    emoji: '👀',
    body: 'Here’s a sneak peek of our app! We are working hard to create a fun and engaging experience for pet lovers. Stay tuned for more updates and the official launch date.'
  },
  {
    date: 'November 20, 2025',
    title: 'Project Announcement',
    emoji: '📢',
    body: 'We are thrilled to announce that we are working on a new app for mig33, migme, tiffry, npio, max99 and nimbuzz lovers! The app will allow users to adopt virtual pets, take care of them, and connect with other pet enthusiasts. Users can play games, send gifts, and earn rewards. More details will be shared in the coming months.'
  }
];

export default function NewsPage() {
  return (
    <NewAppLayout>
      <div className="relative max-w-4xl mx-auto px-6 py-12">

        {/* Background Primary Glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/20 via-transparent to-primary/10 blur-3xl" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent p-1">
            Updates
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            What’s new and what’s coming next.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">

          {/* Vertical Spine */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 bg-gradient-to-b from-primary via-primary/70 to-primary rounded-full opacity-40" />

          <div className="space-y-24">
            {newsItems.map((item, idx) => {
              const isLeft = idx % 2 === 0;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                >

                  {/* Timeline Dot */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-6 w-5 h-5 bg-primary rounded-full shadow-[0_0_25px_hsl(var(--primary)/0.6)] z-10" />

                  {/* Content */}
                  <div className={`w-[45%] ${isLeft ? 'pr-8 text-right' : 'pl-8 text-left'}`}>

                    {/* Date */}
                    <div className="inline-block mb-4 px-4 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary">
                      {item.date}
                    </div>

                    {/* Title */}
                    <h2 className={`text-2xl font-semibold flex items-center gap-3 ${isLeft ? 'justify-end' : 'justify-start'} text-primary`}>
                      {isLeft ? (
                        <>
                          <span>{item.title}</span>
                          <span className="text-3xl">{item.emoji}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl">{item.emoji}</span>
                          <span>{item.title}</span>
                        </>
                      )}
                    </h2>

                    {/* Body */}
                    <p className="mt-4 text-muted-foreground leading-relaxed">
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
            <div className="text-6xl mb-4">📭</div>
            <p className="text-muted-foreground">No announcements yet.</p>
          </div>
        )}

      </div>
    </NewAppLayout>
  );
}
