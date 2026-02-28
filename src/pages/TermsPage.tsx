import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold mb-6">Terms & Privacy</h1>

          <Tabs defaultValue="terms" className="w-full">
            <TabsList className="w-full mb-6 grid grid-cols-2">
              <TabsTrigger value="terms">Terms of Service</TabsTrigger>
              <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            </TabsList>

            <TabsContent value="terms">
              <ScrollArea className="h-[70vh] pr-4">
                <div className="space-y-6 text-muted-foreground">
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
                    <p>
                      By accessing and using bimo33, you accept and agree to be bound by these Terms of Service.
                      If you do not agree to these terms, please do not use our service.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. User Accounts</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>You must be at least 13 years old to create an account.</li>
                      <li>You are responsible for maintaining the confidentiality of your account and password.</li>
                      <li>Each account may only be logged in from one device at a time.</li>
                      <li>You must provide accurate information during registration including valid email, age, and country.</li>
                      <li>Email verification is required before account activation.</li>
                      <li>Accounts inactive for extended periods may be subject to automatic logout.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Virtual Currency (USD - Bimo Digital Credits)</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>USD are virtual currency with <strong>no real-world monetary value</strong>.</li>
                      <li>USD cannot be exchanged for real money, goods, or services outside the platform.</li>
                      <li>All purchases of USD are final and non-refundable.</li>
                      <li>New users receive 1,000 USD upon registration.</li>
                      <li>USD can be earned through daily spins, games, asset profits, and various activities.</li>
                      <li>Daily loss refunds may be issued based on platform policies.</li>
                      <li>We reserve the right to modify USD values and earning rates at any time.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Credit Packs & Subscriptions</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Standard Pack ($5):</strong> 10,000 USD + Merchant status (purple username) for 30 days.</li>
                      <li><strong>Pro Pack ($10):</strong> 25,000 USD + Merchant Pro status (gold username) for 45 days.</li>
                      <li><strong>Elite Pack ($20):</strong> 100,000 USD + Mentor status (pink username) for 60 days.</li>
                      <li>Status benefits expire automatically after the specified duration.</li>
                      <li>Staff members selected by the team have <strong>black</strong> usernames and appear in the “Staff” category.</li>
                      <li>Purchases are processed through admin approval.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Pets & Assets</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Pets:</strong> Virtual companions that can be purchased, displayed on profiles, and fed by other users.</li>
                      <li>Feeding another user's pet costs USD and rewards the feeder with random credits or assets (10% chance).</li>
                      <li>Pet prices vary from 500 USD to 25,000 USD depending on rarity.</li>
                      <li><strong>Assets:</strong> Income-generating virtual items that provide daily passive credits.</li>
                      <li>Assets range from Bicycles (500 USD, +50/day) to UFOs (25,000 USD, +5,000/day).</li>
                      <li>Multiple assets of the same type stack their daily earnings.</li>
                      <li>Daily asset credits must be manually collected every 24 hours.</li>
                      <li>All pet and asset purchases are final and non-refundable.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">6. Games & Entertainment</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>All games involving virtual credits are for <strong>entertainment purposes only</strong>.</li>
                      <li>No real money gambling is offered or supported.</li>
                      <li><strong>Lucky Number:</strong> Guess a secret number with escalating multipliers. Exact guesses receive bonus multipliers on top of round multipliers.</li>
                      <li><strong>Lowcard:</strong> Lowest card drawn wins each round until one player remains.</li>
                      <li><strong>Dice:</strong> Highest roll wins each round in elimination format.</li>
                      <li>Games require a minimum wager of USD to participate.</li>
                      <li>Game outcomes are determined by random algorithms.</li>
                      <li>We are not responsible for losses incurred during gameplay.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">7. Gifts & Social Features</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Users can send virtual gifts to others in chatrooms.</li>
                      <li>Gift costs are deducted from the sender's USD balance.</li>
                      <li>Gift recipients receive credits that accumulate as "unconverted gifts."</li>
                      <li>Unconverted gifts can be converted to spendable USD at any time.</li>
                      <li>Gift shower feature allows sending gifts to all room participants.</li>
                      <li>Gift contests may be held with prize rewards for top senders.</li>
                      <li>Cooldowns apply between gift transactions (10 seconds for single gifts, 30 seconds for showers).</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">8. Chatrooms & Messaging</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Public chatrooms have a maximum capacity of 25 users.</li>
                      <li>Room owners and moderators can kick, mute, or warn users.</li>
                      <li>Global chat administrators (visible on the People page) also have kick/mute/ban powers but lack full admin access.</li>
                      <li>Kicked users cannot rejoin for 10 minutes.</li>
                      <li>Muted users cannot send messages for 5 minutes.</li>
                      <li>Messages are limited to 100 words maximum.</li>
                      <li>Private messaging is available between any users.</li>
                      <li>Users can create their own chatrooms (public or private).</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">9. Daily Rewards</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Daily spin wheel offers random USD rewards once every 24 hours.</li>
                      <li>Spin rewards range from 10 to 1,000 USD plus XP bonuses.</li>
                      <li>Redeem codes may appear in certain rooms with limited-time credits.</li>
                      <li>Asset daily profits must be manually collected.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">10. XP & Leveling System</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Users earn XP through messaging, games, gifts, and other activities.</li>
                      <li>1 XP is awarded per 10 messages sent.</li>
                      <li>Leveling up provides badge progression and bonus credits.</li>
                      <li>XP boosts (2x or 3x) can be purchased for temporary multipliers.</li>
                      <li>Badges represent milestones: Baby (1-4), Kid (5-9), Teen (10-19), etc.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">11. User Conduct</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Harassment, bullying, or threatening behavior is strictly prohibited.</li>
                      <li>Spam, flooding, or disruptive messaging is not allowed.</li>
                      <li>Sharing personal information of others without consent is prohibited.</li>
                      <li>Impersonating other users or staff is forbidden.</li>
                      <li>Exploiting bugs or glitches must be reported, not abused.</li>
                      <li>Attempting to hack, cheat, or manipulate the system is prohibited.</li>
                      <li>Violations may result in muting, kicking, or permanent bans.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">12. Account Suspension & Bans</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Administrators may suspend or permanently ban accounts for violations.</li>
                      <li>Banned users will be logged out immediately and cannot log back in.</li>
                      <li>Ban reasons will be displayed to the affected user.</li>
                      <li>USD balances, pets, and assets are forfeited upon permanent ban.</li>
                      <li>Ban appeals may be submitted through designated channels.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">13. Modifications</h2>
                    <p>
                      We reserve the right to modify these terms, game rules, credit values, and any other aspect
                      of the service at any time. Continued use of the service after changes constitutes
                      acceptance of the new terms.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">14. Limitation of Liability</h2>
                    <p>
                      bimo33 is provided "as is" without warranties of any kind. We are not liable for any
                      virtual currency losses, account issues, or damages arising from use of the service.
                      Virtual items have no cash value and cannot be refunded except at our sole discretion.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">15. Contact</h2>
                    <p>
                      For questions regarding these terms, please contact our support team through the app
                      or reach out to an administrator in the official chatrooms.
                    </p>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="privacy">
              <ScrollArea className="h-[70vh] pr-4">
                <div className="space-y-6 text-muted-foreground">
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Account Information:</strong> Email, username, full name, age, gender, country.</li>
                      <li><strong>Profile Data:</strong> Avatar, status message, profile images.</li>
                      <li><strong>Activity Data:</strong> Messages sent, games played, gifts exchanged, purchases made.</li>
                      <li><strong>Technical Data:</strong> Device information, login times, session data.</li>
                      <li><strong>Transaction History:</strong> All USD transfers, purchases, and earnings.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>To provide and maintain the bimo33 service.</li>
                      <li>To process transactions and manage virtual currency.</li>
                      <li>To personalize your experience and show relevant content.</li>
                      <li>To enforce our Terms of Service and prevent abuse.</li>
                      <li>To communicate service updates and announcements.</li>
                      <li>To detect and prevent fraud or unauthorized access.</li>
                      <li>To compile usage statistics and improve the platform.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Storage & Security</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Data is stored securely using Firebase infrastructure.</li>
                      <li>Passwords are never stored in plain text.</li>
                      <li>Session management enforces single-device login for security.</li>
                      <li>We implement industry-standard security measures.</li>
                      <li>Despite our efforts, no system is 100% secure.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Public Profile:</strong> Username, avatar, level, badges, and pets are visible to others.</li>
                      <li><strong>Friends:</strong> Friends can see your online status and send private messages.</li>
                      <li><strong>Chatrooms:</strong> Messages sent in chatrooms are visible to all room participants.</li>
                      <li>We do not sell your personal information to third parties.</li>
                      <li>We may share data if required by law or to protect our rights.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies & Local Storage</h2>
                    <p>
                      We use browser local storage and session storage to maintain your login state,
                      preferences, and enhance your experience. These are essential for the service to function.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">6. Children's Privacy</h2>
                    <p>
                      bimo33 is not intended for children under 13 years of age. We do not knowingly
                      collect personal information from children under 13. If you believe a child has
                      provided us with personal information, please contact us for removal.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Access your personal data through your profile settings.</li>
                      <li>Update or correct your information at any time.</li>
                      <li>Request deletion of your account (subject to retention policies).</li>
                      <li>Opt out of non-essential communications.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">8. Data Retention</h2>
                    <p>
                      We retain your data for as long as your account is active or as needed to provide
                      services. Transaction history may be retained for legal and accounting purposes.
                      Upon account deletion, we will remove your personal data within a reasonable timeframe,
                      except where retention is required by law.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">9. International Users</h2>
                    <p>
                      bimo33 is operated globally. By using our service, you consent to the transfer
                      of your information to countries where we operate, which may have different
                      data protection laws than your country.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Privacy Policy</h2>
                    <p>
                      We may update this Privacy Policy from time to time. We will notify users of
                      significant changes through the app. Continued use after changes constitutes
                      acceptance of the updated policy.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
                    <p>
                      For privacy-related questions or concerns, please contact our support team
                      through the app or reach out to an administrator.
                    </p>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-sm text-muted-foreground text-center">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
