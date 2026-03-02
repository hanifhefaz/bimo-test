import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Users, Gift, Gamepad2, Store, Trophy, Coins, Zap, Shield, HelpCircle, Sparkles, Crown, Heart, PawPrint, Palette, Smile, Rocket, Target, Clock, ChevronRight, Ban, Send, Eye, Bell, RefreshCw, UserPlus, Lock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { NewAppLayout } from '@/components/layout/NewAppLayout';

export default function HelpPage() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'getting-started',
      icon: <HelpCircle className="w-5 h-5" />,
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <p>Welcome to bimo33! Here's everything you need to know to get started.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <h5 className="font-semibold text-primary mb-2">📝 Create Account</h5>
              <ul className="text-sm space-y-1">
                <li>• Sign up with email and password</li>
                <li>• Login later with email or username</li>
                <li>• Verify your email before first login</li>
                <li>• Username: 3–20 characters, starts with letter</li>
                <li>• Provide full name, age, gender, country</li>
                <li>• Must accept Terms of Service</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <h5 className="font-semibold text-accent mb-2">⏱️ Auto-Logout & Security</h5>
              <ul className="text-sm space-y-1">
                <li>• Logged out after 20 min of inactivity</li>
                <li>• Single-device login enforced (session IDs)</li>
                <li>• "Remember Me" option for persistence</li>
                <li>• Password reset via email</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold mb-2">👤 Profile Setup</h5>
              <ul className="text-sm space-y-1">
                <li>• Customize your avatar (emoji or image)</li>
                <li>• Buy avatar items (backgrounds, faces, frames)</li>
                <li>• Upload a profile image (max 5MB)</li>
                <li>• Set a status message</li>
                <li>• Select your country</li>
                <li>• Set presence: Online, Away, Busy, Offline</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <h5 className="font-semibold text-success mb-2">💰 Earn Credits</h5>
              <ul className="text-sm space-y-1">
                <li>• Daily Spin (once per 24h)</li>
                <li>• Asset daily income (collect from Profile)</li>
                <li>• Win games in chatrooms</li>
                <li>• Pet feeding rewards</li>
                <li>• Redeem codes in Newbies room</li>
                <li>• Gift contest prizes</li>
                <li>• Daily loss refunds (auto)</li>
                <li>• Invite friends for bonus credits</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'chatrooms',
      icon: <MessageCircle className="w-5 h-5" />,
      title: 'Chatrooms',
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold">Room Types:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <h5 className="font-semibold text-sky-500 mb-1">🏠 Newbies Room</h5>
              <p className="text-sm">Perfect for newcomers! Redeem codes drop every 5 minutes. Use /redeem &lt;CODE&gt; to claim.</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <h5 className="font-semibold text-primary mb-1">🌍 Country Rooms</h5>
              <p className="text-sm">Connect with users from your country.</p>
            </div>
            <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold mb-1">🏡 My Own Rooms</h5>
              <p className="text-sm">Create and manage your own chatrooms. Set as public or private.</p>
            </div>
          </div>

          <h4 className="font-semibold mt-4">Features:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>See who's online with live presence indicators (green/yellow/red dots)</li>
            <li>Messages appear instantly for all room members (real-time via RTDB)</li>
            <li>Entry announcements show your badge, level, pet, asset, and equipped companion</li>
            <li>Room tabs stay open — close by clicking the X button</li>
            <li>100-word message limit per message</li>
            <li>Favorite rooms for quick access (star icon)</li>
            <li>Recent rooms tracked automatically</li>
            <li>Room owner can manage settings, toggle privacy, assign moderators</li>
          </ul>

          <div className="p-3 rounded-lg bg-card/70 border border-border/70 mt-4">
            <h5 className="font-semibold mb-2">💬 Private Messages</h5>
            <p className="text-sm">Click the message icon on a friend to open a private chat. Private chats open as tabs in the navigation bar! Unread message counts are tracked per conversation.</p>
          </div>
        </div>
      )
    },
    {
      id: 'commands',
      icon: <Zap className="w-5 h-5" />,
      title: 'Chat Commands (Complete List)',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">🎭 Social Commands (Free — 43 commands):</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="p-2 bg-background rounded"><code>/hug</code> 🤗</div>
              <div className="p-2 bg-background rounded"><code>/busy</code> ⛔</div>
              <div className="p-2 bg-background rounded"><code>/away</code> ⏰</div>
              <div className="p-2 bg-background rounded"><code>/wave</code> 👋</div>
              <div className="p-2 bg-background rounded"><code>/dance</code> 💃</div>
              <div className="p-2 bg-background rounded"><code>/clap</code> 👏</div>
              <div className="p-2 bg-background rounded"><code>/cheer</code> 🎉</div>
              <div className="p-2 bg-background rounded"><code>/laugh</code> 😂</div>
              <div className="p-2 bg-background rounded"><code>/cry</code> 😢</div>
              <div className="p-2 bg-background rounded"><code>/kiss</code> 😘</div>
              <div className="p-2 bg-background rounded"><code>/wink</code> 😉</div>
              <div className="p-2 bg-background rounded"><code>/sleep</code> 😴</div>
              <div className="p-2 bg-background rounded"><code>/think</code> 🤔</div>
              <div className="p-2 bg-background rounded"><code>/sing</code> 🎤</div>
              <div className="p-2 bg-background rounded"><code>/pray</code> 🙏</div>
              <div className="p-2 bg-background rounded"><code>/flex</code> 💪</div>
              <div className="p-2 bg-background rounded"><code>/bow</code> 🙇</div>
              <div className="p-2 bg-background rounded"><code>/smile</code> 😊</div>
              <div className="p-2 bg-background rounded"><code>/grin</code> 😁</div>
              <div className="p-2 bg-background rounded"><code>/shrug</code> 🤷</div>
              <div className="p-2 bg-background rounded"><code>/facepalm</code> 🤦</div>
              <div className="p-2 bg-background rounded"><code>/highfive</code> ✋</div>
              <div className="p-2 bg-background rounded"><code>/thumbsup</code> 👍</div>
              <div className="p-2 bg-background rounded"><code>/thumbsdown</code> 👎</div>
              <div className="p-2 bg-background rounded"><code>/nod</code> 🙂</div>
              <div className="p-2 bg-background rounded"><code>/shake</code> 😕</div>
              <div className="p-2 bg-background rounded"><code>/applaud</code> 🙌</div>
              <div className="p-2 bg-background rounded"><code>/celebrate</code> 🥳</div>
              <div className="p-2 bg-background rounded"><code>/panic</code> 😱</div>
              <div className="p-2 bg-background rounded"><code>/relax</code> 😌</div>
              <div className="p-2 bg-background rounded"><code>/confused</code> 😵‍💫</div>
              <div className="p-2 bg-background rounded"><code>/angry</code> 😠</div>
              <div className="p-2 bg-background rounded"><code>/blush</code> 😳</div>
              <div className="p-2 bg-background rounded"><code>/sweat</code> 😓</div>
              <div className="p-2 bg-background rounded"><code>/party</code> 🎊</div>
              <div className="p-2 bg-background rounded"><code>/salute</code> 🫡</div>
              <div className="p-2 bg-background rounded"><code>/read</code> 📖</div>
              <div className="p-2 bg-background rounded"><code>/write</code> ✍️</div>
              <div className="p-2 bg-background rounded"><code>/coffee</code> ☕</div>
              <div className="p-2 bg-background rounded"><code>/eat</code> 🍽️</div>
              <div className="p-2 bg-background rounded"><code>/drink</code> 🥤</div>
              <div className="p-2 bg-background rounded"><code>/stretch</code> 🤸</div>
              <div className="p-2 bg-background rounded"><code>/love</code> ❤️</div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🎁 Gift Commands:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-background rounded">/gift &lt;item&gt; &lt;username&gt;</code>
                <span>— Send a gift to someone (10s cooldown)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-background rounded">/shower &lt;item&gt;</code>
                <span>— Send gifts to everyone in room (20s cooldown)</span>
              </div>
              <h5 className="font-semibold mt-3">Available gifts:</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                <span>🌹 Rose — 0.01 USD</span>
                <span>🎁🌙 Happy Ramadan — 0.05</span>
                <span>🏮🌅 Sahari — 0.05</span>
                <span>🍽️🌙 Iftar — 0.05</span>
                <span>🍫 Chocolate — 0.05</span>
                <span>⭐ Star — 0.05</span>
                <span>🧁 Cupcake — 0.10</span>
                <span>🧸 Teddy Bear — 0.10</span>
                <span>🍭 Lollipop — 0.20</span>
                <span>🍬 Candy — 0.25</span>
                <span>🎂 Cake — 0.50</span>
                <span>👑 Crown — 0.50</span>
                <span>💐 Bouquet — 1.00</span>
                <span>🍒 Cherries — 1.00</span>
                <span>🍪 Cookie — 1.00</span>
                <span>❤️ Heart — 1.00</span>
                <span>💜 Purple Heart — 1.00</span>
                <span>💛 Yellow Heart — 1.00</span>
                <span>💙 Blue Heart — 1.00</span>
                <span>🎈 Balloon — 1.00</span>
                <span>🌷 Tulip — 1.00</span>
                <span>🌻 Sunflower — 1.00</span>
                <span>🌺 Hibiscus — 1.00</span>
                <span>🌼 Blossom — 1.00</span>
                <span>🦋 Butterfly — 1.00</span>
                <span>🎁 Gift Box — 3.00</span>
                <span>💎 Diamond — 5.00</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-3">🎟️ Redeem Codes:</h4>
            <div className="text-sm">
              <code className="px-2 py-1 bg-background rounded">/redeem &lt;CODE&gt;</code>
              <p className="mt-2">Claim codes in the Newbies room for credits + XP. Codes drop every 5 minutes and can be redeemed by anyone until they expire (1 minute window).</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <h4 className="font-semibold text-accent mb-3">🤖 Bot & Game Commands:</h4>
            <div className="space-y-2 text-sm">
              <div><code className="px-2 py-1 bg-background rounded">/add bot &lt;type&gt;</code> — Add game bot (lowcard, dice, luckynumber, higherlower, bimo)</div>
              <div><code className="px-2 py-1 bg-background rounded">/remove bot</code> — Remove active game bot</div>
              <div><code className="px-2 py-1 bg-background rounded">/lowcard</code> — Show Lowcard game info</div>
              <div><code className="px-2 py-1 bg-background rounded">/dice</code> — Show Dice game info</div>
              <div><code className="px-2 py-1 bg-background rounded">/luckynumber</code> — Show Lucky Number game info</div>
              <div><code className="px-2 py-1 bg-background rounded">/higherlower</code> — Show Higher/Lower game info</div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-3">🔧 Moderator Commands:</h4>
            <div className="space-y-2 text-sm">
              <div><code className="px-2 py-1 bg-background rounded">/kick &lt;username&gt;</code> — Remove user (10 min cooldown before rejoin)</div>
              <div><code className="px-2 py-1 bg-background rounded">/mute &lt;username&gt;</code> — Mute for 5 minutes</div>
              <div><code className="px-2 py-1 bg-background rounded">/warn &lt;username&gt; &lt;reason&gt;</code> — Issue warning</div>
              <p className="text-muted-foreground mt-2">Available to: Room owner, room moderators, system admins, chat admins</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-3">🔨 Admin-Only Commands:</h4>
            <div className="space-y-2 text-sm">
              <div><code className="px-2 py-1 bg-background rounded">/ban &lt;username&gt; &lt;reason&gt;</code> — Ban user from platform</div>
              <div><code className="px-2 py-1 bg-background rounded">/unban &lt;username&gt;</code> — Unban user</div>
              <div><code className="px-2 py-1 bg-background rounded">/startcontest &lt;minutes&gt; &lt;prize&gt; &lt;giftId&gt;</code> — Start gift contest</div>
              <div><code className="px-2 py-1 bg-background rounded">/startinvitecontest</code> — Start invite contest</div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">🎮 Game Commands (typed with ! prefix):</h4>
            <div className="space-y-2 text-sm">
              <div><code className="px-2 py-1 bg-background rounded">!start &lt;amount&gt;</code> — Start a game with wager</div>
              <div><code className="px-2 py-1 bg-background rounded">!j &lt;amount&gt;</code> — Join an active game</div>
              <div><code className="px-2 py-1 bg-background rounded">!guess &lt;1-100&gt;</code> — Guess number (Lucky Number)</div>
              <div><code className="px-2 py-1 bg-background rounded">!cashout</code> — Cash out (Lucky Number)</div>
              <div><code className="px-2 py-1 bg-background rounded">!b &lt;suit&gt; &lt;amount&gt;</code> — Bet on suit in Bimo (spades, hearts, clubs, diamonds)</div>
              <div><code className="px-2 py-1 bg-background rounded">!h / !l</code> — Higher/Lower guess commands</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'games',
      icon: <Gamepad2 className="w-5 h-5" />,
      title: 'Games',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h5 className="font-semibold text-primary mb-2">🃏 Lowcard</h5>
              <p className="text-sm mb-2">Players draw cards; lowest card is eliminated each round until one remains!</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start &lt;amount&gt;</code>
            </div>

            <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold mb-2">🎲 Dice</h5>
              <p className="text-sm mb-2">Roll dice and compete for highest total. Highest roll wins each round!</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start &lt;amount&gt;</code>
            </div>

            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <h5 className="font-semibold text-violet-500 flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" /> Companions (3 types)
              </h5>
              <p className="text-sm mb-2">Equip one companion for animated room-entry presence and public reaction messages in chatrooms.</p>
              <ul className="text-xs space-y-1">
                <li>â€¢ Alpha Wolf â€” hype style reactions</li>
                <li>â€¢ Sage Owl â€” calm style reactions</li>
                <li>â€¢ Trickster Fox â€” playful style reactions</li>
                <li>â€¢ Public companion reactions can be toggled in Profile settings</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h5 className="font-semibold text-accent mb-2">🎯 Bimo</h5>
              <p className="text-sm mb-2">Bet on card suits (max 2 suits per round). Pick amounts via the game pad or type <code>!b &lt;suit&gt; &lt;amount&gt;</code>. Fixed amounts: 0.05, 0.1, 0.5, 1, 5, 10 or Custom (0.05–100).</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start &lt;amount&gt;</code>
            </div>

            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <h5 className="font-semibold text-success mb-2">🔢 Lucky Number</h5>
              <p className="text-sm mb-2">Guess numbers 1–100 to survive rounds and increase multipliers. Cash out anytime with <code>!cashout</code>. Exact guesses win special multipliers.</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start</code>
            </div>

            <div className="p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <h5 className="font-semibold text-sky-500 mb-2">📈 Higher/Lower</h5>
              <p className="text-sm mb-2">The bot reveals a card each round. Guess the next card direction with <code>!h</code> or <code>!l</code>. Wrong guesses are eliminated.</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start &lt;amount&gt;</code>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-card/70 border border-border/70">
            <h4 className="font-semibold mb-3">How to Play:</h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Room owner adds a game bot: <code className="px-1 bg-background rounded">/add bot luckynumber</code> (or lowcard, dice, higherlower, bimo)</li>
              <li>Start a game: <code className="px-1 bg-background rounded">!start &lt;wager&gt;</code></li>
              <li>Others join: <code className="px-1 bg-background rounded">!j &lt;amount&gt;</code> within the join window</li>
              <li>For Lucky Number: <code className="px-1 bg-background rounded">!guess &lt;1-100&gt;</code> and <code className="px-1 bg-background rounded">!cashout</code></li>
              <li>For Bimo: Use the gamepad UI or <code className="px-1 bg-background rounded">!b &lt;suit&gt; &lt;amount&gt;</code></li>
              <li>For Higher/Lower: Use <code className="px-1 bg-background rounded">!h</code> and <code className="px-1 bg-background rounded">!l</code></li>
              <li>Survive rounds or be the last player standing to win!</li>
              <li>Winners earn credits + XP. Losers lose their wager.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'daily-spin',
      icon: <Gift className="w-5 h-5" />,
      title: 'Daily Spin',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/25">
            <h4 className="font-semibold mb-3">🎡 How It Works:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-primary" />
                <span><strong>One spin per 24 hours</strong> — Spins are locked server-side immediately to prevent abuse</span>
              </li>
              <li className="flex items-start gap-2">
                <Gift className="w-4 h-4 mt-0.5 text-gold" />
                <span><strong>Win prizes:</strong> Credits, XP, pets, and avatar items</span>
              </li>
              <li className="flex items-start gap-2">
                <Coins className="w-4 h-4 mt-0.5 text-success" />
                <span><strong>Duplicates:</strong> If you win an item you already own, it converts to 10 credits</span>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 text-accent" />
                <span><strong>XP & Leveling:</strong> XP rewards add to your total (level = floor(xp/100) + 1)</span>
              </li>
            </ul>
          </div>

          <Button variant="gradient" size="sm" onClick={() => navigate('/daily-spin')}>
            <Gift className="w-4 h-4 mr-2" />
            Go to Daily Spin
          </Button>
        </div>
      )
    },
    {
      id: 'store',
      icon: <Store className="w-5 h-5" />,
      title: 'Store',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h5 className="font-semibold text-primary flex items-center gap-2 mb-2">
                <PawPrint className="w-4 h-4" /> Pets (13 types)
              </h5>
              <p className="text-sm mb-2">Animated pets on your profile and room entries. Friends can feed your pets for rewards!</p>
              <ul className="text-xs space-y-1">
                <li>🐓 Rooster — 2.50 USD</li>
                <li>🐕 Dog — 5.00 USD</li>
                <li>🐇 Rabbit — 10.00 USD</li>
                <li>🐢 Turtle — 15.00 USD</li>
                <li>🐒 Chimpanzee — 25.00 USD</li>
                <li>🐎 Racehorse — 50.00 USD</li>
                <li>🐍 Snake — 100.00 USD</li>
                <li>🦉 Owl — 125.00 USD</li>
                <li>🐂 Ox — 175.00 USD</li>
                <li>🐅 Tiger — 200.00 USD</li>
                <li>🦄 Unicorn — 300.00 USD</li>
                <li>🦖 T-Rex — 375.00 USD</li>
                <li>🐋 Whale — 500.00 USD</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4" /> Assets (Passive Income — 10 types)
              </h5>
              <p className="text-sm mb-2">Buy assets that generate credits every 24 hours! Buy multiple for multiplied income.</p>
              <ul className="text-xs space-y-1">
                <li>🛹 Skateboard — 1.00 USD → 0.02/day</li>
                <li>🚲 Bicycle — 1.50 USD → 0.03/day</li>
                <li>🏍️ Motorcycle — 5.00 USD → 0.11/day</li>
                <li>🚗 Car — 10.00 USD → 0.23/day</li>
                <li>🚜 Automobile — 15.00 USD → 0.36/day</li>
                <li>🛴 Rocket — 20.00 USD → 0.50/day</li>
                <li>🚁 Helicopter — 30.00 USD → 0.78/day</li>
                <li>🚤 Speedboat — 50.00 USD → 1.40/day</li>
                <li>✈️ Airplane — 100.00 USD → 2.90/day</li>
                <li>🛸 UFO — 200.00 USD → 5.00/day</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h5 className="font-semibold text-accent flex items-center gap-2 mb-2">
                <Smile className="w-4 h-4" /> Emoticon Packs (4 packs)
              </h5>
              <p className="text-sm mb-2">Buy emoji packs to use in chat! Once purchased, an emoticon button appears in the chat input.</p>
              <ul className="text-xs space-y-1">
                <li>😀 Faces Pack — 0.50 USD (30 emoticons)</li>
                <li>🐶 Animals Pack — 1.00 USD (30 emoticons)</li>
                <li>❤️ Hearts & Love Pack — 1.00 USD (30 emoticons)</li>
                <li>🎉 Party Pack — 1.50 USD (30 emoticons)</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-card/70 border border-border/70">
              <h5 className="font-semibold flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" /> Avatar Customization
              </h5>
              <p className="text-sm">Buy backgrounds, faces, frames, and avatar items to customize your look! Items include animated effects and exclusive styles.</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <h5 className="font-semibold text-sky-500 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" /> XP Boosts (4 types)
            </h5>
            <ul className="text-sm space-y-1">
              <li>⚡ 2x XP (1h) — 0.10 USD</li>
              <li>⚡ 3x XP (1h) — 0.20 USD</li>
              <li>🔥 2x XP (24h) — 0.50 USD</li>
              <li>🔥 3x XP (24h) — 0.75 USD</li>
            </ul>
          </div>

          <Button variant="gold" size="sm" onClick={() => navigate('/store')}>
            <Store className="w-4 h-4 mr-2" />
            Visit Store
          </Button>
        </div>
      )
    },
    {
      id: 'credit-packs',
      icon: <Coins className="w-5 h-5" />,
      title: 'Credit Packs',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30 text-center">
              <div className="text-3xl mb-2">💜</div>
              <h4 className="font-bold text-violet-500">Standard</h4>
              <p className="text-2xl font-bold">$10</p>
              <p className="text-lg text-primary">50 USD</p>
              <p className="text-caption text-muted-foreground mt-2">Merchant status (purple) for 30 days</p>
            </div>

            <div className="p-4 rounded-lg bg-gold/10 border border-gold/30 text-center">
              <div className="text-3xl mb-2">👑</div>
              <h4 className="font-bold text-gold">Pro</h4>
              <p className="text-2xl font-bold">$20</p>
              <p className="text-lg text-primary">100 USD</p>
              <p className="text-caption text-muted-foreground mt-2">Merchant status (gold) for 45 days</p>
            </div>

            <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/30 text-center">
              <div className="text-3xl mb-2">💎</div>
              <h4 className="font-bold text-pink-500">Elite</h4>
              <p className="text-2xl font-bold">$50</p>
              <p className="text-lg text-primary">500 USD</p>
              <p className="text-caption text-muted-foreground mt-2">Mentor status (pink) for 60 days + Merchant</p>
            </div>
          </div>

          <p className="text-body text-muted-foreground text-center">Contact an admin to purchase credit packs.</p>
        </div>
      )
    },
    {
      id: 'economy',
      icon: <Coins className="w-5 h-5" />,
      title: 'Economy',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-3">💰 Ways to Earn Credits:</h4>
            <ul className="space-y-2 text-sm">
              <li>✅ <strong>Daily Asset Collection</strong> — Collect from Profile page (once per 24h)</li>
              <li>✅ <strong>Daily Spin</strong> — Free spin once per 24 hours</li>
              <li>✅ <strong>Redeem Codes</strong> — Codes drop every 5 min in Newbies room (5–10 credits)</li>
              <li>✅ <strong>Pet Feeding</strong> — Feed friends' pets for rewards (max 5 feeders/pet/day)</li>
              <li>✅ <strong>Game Winnings</strong> — Win credits from Lowcard, Dice, Lucky Number, Bimo</li>
              <li>✅ <strong>Gift Contests</strong> — Win prizes in admin-run gift shower contests</li>
              <li>✅ <strong>Invite Contests</strong> — Invite friends for bonus credits</li>
              <li>✅ <strong>Daily Loss Refund</strong> — Automatic partial refund of game losses (once per day)</li>
              <li>✅ <strong>Gift Conversion</strong> — Convert received gifts to credits at 20% rate</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🛒 Spending Credits:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Buy pets, assets, avatar items from the Store</li>
              <li>• Buy companions from the Store and equip one in Profile</li>
              <li>• Purchase emoticon packs</li>
              <li>• Buy XP boosts (2x/3x for 1h or 24h)</li>
              <li>• Send gifts (10s cooldown between single gifts, 20s for showers)</li>
              <li>• Transfer credits to other users</li>
              <li>• Wager in games</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-card/70 border border-border/70">
            <h4 className="font-semibold mb-3">📊 Gift Conversion:</h4>
            <p className="text-sm">Received gifts accumulate as "unconverted gifts" on your profile. Convert them to credits at 20% of their original value anytime from your Profile page.</p>
          </div>
        </div>
      )
    },
    {
      id: 'xp-levels',
      icon: <Trophy className="w-5 h-5" />,
      title: 'XP & Levels',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">⭐ Earning XP:</h4>
            <ul className="space-y-2 text-sm">
              <li><strong>Sending messages:</strong> +1 XP per 10 messages</li>
              <li><strong>Sending gifts:</strong> XP based on gift value</li>
              <li><strong>Redeeming codes:</strong> +10 XP</li>
              <li><strong>Joining games:</strong> +10 XP</li>
              <li><strong>Winning games:</strong> +20 XP</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-card/70 border border-border/70">
            <h4 className="font-semibold mb-2">📊 Level Calculation:</h4>
            <code className="text-sm px-2 py-1 bg-background rounded">Level = floor(XP / 100) + 1</code>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-2">🚀 XP Boosts:</h4>
            <p className="text-sm">Purchase temporary multipliers (2x/3x for 1 or 24 hours) from the Store! XP from messages, gifts, and games is multiplied while active.</p>
          </div>
        </div>
      )
    },
    {
      id: 'pets',
      icon: <PawPrint className="w-5 h-5" />,
      title: 'Pets & Feeding',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">🐾 Pet System:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Buy pets from the Store to display on your profile</li>
              <li>• Pets appear in room entry announcements</li>
              <li>• Your most expensive pet is shown on your profile card</li>
              <li>• Friends can feed your pets for rewards!</li>
              <li>• 13 pets available from Rooster (2.50) to Whale (500.00)</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🍖 Feeding Rules:</h4>
            <ul className="space-y-2 text-sm">
              <li>⚠️ <strong>You must own the same pet type</strong> to feed a friend's pet</li>
              <li>• Maximum 5 feeders per pet per day</li>
              <li>• Higher-priced pets give larger rewards</li>
              <li>• 10% chance of winning a random asset instead of credits!</li>
              <li>• Feeding creates a Bimo Alert notification for the pet owner</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'contests',
      icon: <Gift className="w-5 h-5" />,
      title: 'Gift & Invite Contests',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🏆 Gift Shower Contests:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Timed competitions started by admins in chatrooms</li>
              <li>• A specific gift type is chosen for each contest</li>
              <li>• Use <code className="px-1 bg-background rounded">/gift</code> and <code className="px-1 bg-background rounded">/shower</code> with the specified gift to participate</li>
              <li>• Ranking based on number of gifts sent</li>
              <li>• Prize pool distributed among top 10 senders</li>
              <li>• One gift contest allowed per day per room</li>
              <li>• Active contests show a banner in the chatroom header</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <h4 className="font-semibold text-accent mb-3">🎫 Invite Contests:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Invite friends via email from the Home page</li>
              <li>• Top 5 inviters win tiered credit prizes</li>
              <li>• Grand prize includes credits + a top-tier pet</li>
              <li>• Contest runs for a configurable number of days</li>
              <li>• Track progress on the Contests page</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'roles',
      icon: <Crown className="w-5 h-5" />,
      title: 'User Roles',
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold">Username Colors:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="w-4 h-4 rounded-full bg-destructive" />
              <span className="font-semibold text-destructive">Red</span>
              <span className="text-body text-muted-foreground">— System Admin (full platform control, can ban/unban)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <span className="w-4 h-4 rounded-full bg-orange-500" />
              <span className="font-semibold text-orange-500">Orange</span>
              <span className="text-body text-muted-foreground">— Global Chat Admin (kick/mute/ban in all rooms)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg">
              <span className="w-4 h-4 rounded-full bg-foreground" />
              <span className="font-semibold">Black</span>
              <span className="text-body text-muted-foreground">— Staff (internal team members)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <span className="w-4 h-4 rounded-full bg-pink-500" />
              <span className="font-semibold text-pink-500">Pink</span>
              <span className="text-body text-muted-foreground">— Mentor (Elite pack — 60 days)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gold/10 border border-gold/20">
              <span className="w-4 h-4 rounded-full bg-gold" />
              <span className="font-semibold text-gold">Gold</span>
              <span className="text-body text-muted-foreground">— Merchant Pro (Pro pack — 45 days)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <span className="w-4 h-4 rounded-full bg-violet-500" />
              <span className="font-semibold text-violet-500">Purple</span>
              <span className="text-body text-muted-foreground">— Merchant Standard (Standard pack — 30 days)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <span className="w-4 h-4 rounded-full bg-sky-500" />
              <span className="font-semibold text-sky-500">Blue</span>
              <span className="text-body text-muted-foreground">— Regular user</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Merchant/Mentor roles are time-limited and expire automatically. Browse all role holders on the <strong>People</strong> page.</p>
        </div>
      )
    },
    {
      id: 'moderation',
      icon: <Shield className="w-5 h-5" />,
      title: 'Moderation & Safety',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-3">🔧 Room Owner / Moderator:</h4>
            <ul className="space-y-2 text-sm">
              <li><code className="px-2 py-1 bg-background rounded">/kick &lt;username&gt;</code> — Remove user (10 min cooldown before rejoin)</li>
              <li><code className="px-2 py-1 bg-background rounded">/mute &lt;username&gt;</code> — Mute user for 5 minutes</li>
              <li><code className="px-2 py-1 bg-background rounded">/warn &lt;username&gt; &lt;reason&gt;</code> — Issue a warning (shown publicly)</li>
              <li>Room Settings: Edit description, toggle private, add/remove moderators</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-3">🔨 Admin Ban System:</h4>
            <ul className="space-y-2 text-sm">
              <li>Admins can ban/unban users via <code>/ban</code> and <code>/unban</code></li>
              <li>Banned users are immediately kicked from all rooms</li>
              <li>Banned users are force-signed out in real-time</li>
              <li>Banned users see a "suspended" message on login</li>
              <li>Duplicate ban prevention: cannot ban already-banned users</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-card/70 border border-border/70">
            <h4 className="font-semibold mb-3">🔒 Safety Guidelines:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Never share your password</li>
              <li>• Be respectful to all users</li>
              <li>• Report inappropriate behavior to admins</li>
              <li>• Double-check usernames before credit transfers</li>
              <li>• Blocked users cannot contact you</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'social',
      icon: <Users className="w-5 h-5" />,
      title: 'Social Features',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">👥 Friends & Messaging:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Send/receive friend requests (real-time notifications)</li>
              <li>• Accept or decline requests from Friends page</li>
              <li>• See friends' online status with presence indicators</li>
              <li>• Private Messages open as tabs in navigation</li>
              <li>• Transfer credits to friends from your Profile page</li>
              <li>• Block/unblock users</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">👤 Profiles:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Like other users' profiles (counts on leaderboard)</li>
              <li>• View stats, transactions, owned pets, and assets</li>
              <li>• Upload profile image & set status</li>
              <li>• Convert received gifts to credits (20% rate)</li>
              <li>• Feed friends' pets from their profile</li>
              <li>• View transaction history</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-3">🔔 Bimo Alerts:</h4>
            <ul className="text-sm space-y-1">
              <li>• Profile likes</li>
              <li>• Pet feeding events</li>
              <li>• Credit refunds (daily loss refund)</li>
              <li>• Daily credits available</li>
              <li>• Gift received notifications</li>
              <li>• Contest win notifications</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <h4 className="font-semibold text-accent mb-3">📧 Email Invites:</h4>
            <ul className="text-sm space-y-1">
              <li>• Invite friends by email from the Home page</li>
              <li>• Each invite tracked (pending → registered)</li>
              <li>• Cannot invite already-registered emails</li>
              <li>• Cannot invite yourself</li>
              <li>• Earn bonus credits when your invitee registers</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'leaderboards',
      icon: <Trophy className="w-5 h-5" />,
      title: 'Leaderboards',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🏆 Categories:</h4>
            <ul className="space-y-2 text-sm">
              <li>⭐ <strong>Top Levels</strong> — Highest level users (all-time)</li>
              <li>🎮 <strong>Top Games</strong> — Most games played (last 30 days)</li>
              <li>🎁 <strong>Top Gift Senders</strong> — Most gifts sent (all-time)</li>
              <li>👍 <strong>Top Profile Likes</strong> — Most liked profiles (all-time)</li>
              <li>🎁 <strong>Top Gift Receivers</strong> — Most gifts received (all-time)</li>
              <li>🎟️ <strong>Top Redeemers</strong> — Most codes redeemed (last 30 days)</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">Top 5 users shown per category. Click the eye icon to visit a user's profile.</p>

          <Button variant="outline" size="sm" onClick={() => navigate('/leaderboards')}>
            <Trophy className="w-4 h-4 mr-2" />
            View Leaderboards
          </Button>
        </div>
      )
    },
    {
      id: 'people',
      icon: <Users className="w-5 h-5" />,
      title: 'People Page',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">👥 Browse by Role:</h4>
            <ul className="space-y-2 text-sm">
              <li>🔴 <strong>System Admins</strong> — Full platform administrators</li>
              <li>🟠 <strong>Global Admins</strong> — Chat admins with moderation powers</li>
              <li>⚫ <strong>Staff</strong> — Internal team members</li>
              <li>💜 <strong>Merchants</strong> — Users with active merchant status</li>
              <li>💗 <strong>Mentors</strong> — Users with active mentor status</li>
            </ul>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate('/people')}>
            <Users className="w-4 h-4 mr-2" />
            View People
          </Button>
        </div>
      )
    },
    {
      id: 'presence',
      icon: <Globe className="w-5 h-5" />,
      title: 'Presence & Status',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-3">🟢 Presence System:</h4>
            <ul className="space-y-2 text-sm">
              <li>🟢 <strong>Online</strong> — Actively using the app</li>
              <li>🟡 <strong>Away</strong> — Set manually via /away or presence selector</li>
              <li>🔴 <strong>Busy</strong> — Do not disturb</li>
              <li>⚫ <strong>Offline</strong> — Not connected</li>
            </ul>
            <p className="text-sm mt-2 text-muted-foreground">Presence updates in real-time across all rooms, friend lists, and profile views. Automatic disconnect detection sets you offline when you close the app.</p>
          </div>
        </div>
      )
    },
    {
      id: 'vouchers',
      icon: <Coins className="w-5 h-5" />,
      title: 'Vouchers',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🎫 Voucher System:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Admins can generate voucher codes with credit amounts</li>
              <li>• Users redeem vouchers from the Home page</li>
              <li>• Each voucher can only be used once</li>
              <li>• Credits are added instantly to your balance</li>
            </ul>
          </div>
        </div>
      )
    },
  ];

  return (
    <NewAppLayout>
      <div className="p-4 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Help Center
            </h1>
            <p className="text-muted-foreground text-sm">Complete guide to every feature in bimo33</p>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6"
        >
          <Button variant="outline" size="sm" onClick={() => navigate('/store')} className="flex items-center gap-2">
            <Store className="w-4 h-4" /> Store
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/daily-spin')} className="flex items-center gap-2">
            <Gift className="w-4 h-4" /> Daily Spin
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/leaderboards')} className="flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Ranks
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/chatrooms')} className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Rooms
          </Button>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {sections.map((section, i) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <AccordionItem value={section.id} className="border rounded-xl bg-secondary/20 px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="text-primary">{section.icon}</span>
                      <span className="font-semibold">{section.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-body text-muted-foreground pb-4">
                    {section.content}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </NewAppLayout>
  );
}

