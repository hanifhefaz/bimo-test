import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Users, Gift, Gamepad2, Store, Trophy, Coins, Zap, Shield, HelpCircle, Sparkles, Crown, Heart, PawPrint, Palette, Smile, Rocket, Target, Clock, ChevronRight } from 'lucide-react';
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
                <li>• Sign up with email and password (can sign in later with email or username)</li>
                <li>• Verify your email before logging in</li>
                <li>• Username: 3–20 characters, starts with letter</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <h5 className="font-semibold text-accent mb-2">⏱️ Auto-Logout</h5>
              <p className="text-sm">You'll be logged out after 10 minutes of inactivity for security.</p>
            </div>

            <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold mb-2">👤 Profile Setup</h5>
              <ul className="text-sm space-y-1">
                <li>• Customize your avatar</li>
                <li>• Set a status message</li>
                <li>• Select your country</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <h5 className="font-semibold text-success mb-2">💰 Earn Credits</h5>
              <ul className="text-sm space-y-1">
                <li>• Daily Spin (once per 24h)</li>
                <li>• Asset profits (collected daily)</li>
                <li>• Games & gifts</li>
                <li>• Pet feeding & code redemption</li>
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
              <p className="text-sm">Perfect for newcomers! Redeem codes drop every 5 minutes.</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <h5 className="font-semibold text-primary mb-1">🌍 Country Rooms</h5>
              <p className="text-sm">Connect with users from your country.</p>
            </div>
            <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold mb-1">🏡 My Own Rooms</h5>
              <p className="text-sm">Create and manage your own chatrooms.</p>
            </div>
          </div>

          <h4 className="font-semibold mt-4">Features:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>See who's online with live presence indicators</li>
            <li>Messages appear instantly for all room members</li>
            <li>Entry announcements show your badge, level, pet, and asset</li>
            <li>Room tabs stay open - close by clicking the X button</li>
          </ul>

          <div className="p-3 rounded-lg bg-secondary/30 mt-4">
            <h5 className="font-semibold mb-2">💬 Private Messages</h5>
            <p className="text-sm">Click the message icon on a friend to open a private chat. Private chats open as tabs in the navigation bar!</p>
          </div>
        </div>
      )
    },
    {
      id: 'commands',
      icon: <Zap className="w-5 h-5" />,
      title: 'Chat Commands',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-primary mb-3">🎭 Social Commands (Free):</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="p-2 bg-background rounded"><code>/hug</code> 🤗</div>
              <div className="p-2 bg-background rounded"><code>/wave</code> 👋</div>
              <div className="p-2 bg-background rounded"><code>/dance</code> 💃</div>
              <div className="p-2 bg-background rounded"><code>/clap</code> 👏</div>
              <div className="p-2 bg-background rounded"><code>/laugh</code> 😂</div>
              <div className="p-2 bg-background rounded"><code>/cry</code> 😢</div>
              <div className="p-2 bg-background rounded"><code>/love</code> ❤️</div>
              <div className="p-2 bg-background rounded"><code>/angry</code> 😠</div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🎁 Gift Commands:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-background rounded">/gift &lt;item&gt; &lt;username&gt;</code>
                <span>— Send a gift to someone</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-background rounded">/shower &lt;item&gt;</code>
                <span>— Send gifts to everyone in room</span>
              </div>
              <p className="text-muted-foreground mt-2">Available gifts: rose, chocolate, diamond, crown, star, heart, cake, pizza, coffee, beer</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-3">🎟️ Redeem Codes:</h4>
            <div className="text-sm">
              <code className="px-2 py-1 bg-background rounded">/redeem &lt;CODE&gt;</code>
              <p className="mt-2">Claim codes in the Newbies room for credits + XP. Codes drop every 5 minutes and can be redeemed by anyone until they expire.</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-3">🔧 Moderator Commands:</h4>
            <div className="space-y-2 text-sm">
              <div><code className="px-2 py-1 bg-background rounded">/kick &lt;username&gt;</code> — Remove user (10 min cooldown)</div>
              <div><code className="px-2 py-1 bg-background rounded">/mute &lt;username&gt;</code> — Mute for 5 minutes</div>
              <div><code className="px-2 py-1 bg-background rounded">/warn &lt;username&gt; &lt;reason&gt;</code> — Issue warning</div>
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

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h5 className="font-semibold text-accent mb-2">🎯 Bimo</h5>
              <p className="text-sm mb-2">Special game with unique mechanics!</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start &lt;amount&gt;</code>
            </div>

            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <h5 className="font-semibold text-success mb-2">🔢 Lucky Number</h5>
              <p className="text-sm mb-2">Guess numbers to survive rounds and increase multipliers.</p>
              <code className="text-xs px-2 py-1 bg-background rounded">!start</code>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/30">
            <h4 className="font-semibold mb-3">How to Play:</h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Room owner adds a game bot: <code className="px-1 bg-background rounded">/add bot luckynumber</code></li>
              <li>Start a game: <code className="px-1 bg-background rounded">!start &lt;wager&gt;</code></li>
              <li>Others join: <code className="px-1 bg-background rounded">!j &lt;amount&gt;</code></li>
              <li>For Lucky Number: <code className="px-1 bg-background rounded">!guess &lt;1-100&gt;</code> and <code className="px-1 bg-background rounded">!cashout</code></li>
              <li>Survive rounds or be the last player standing to win!</li>
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
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/20">
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
                <PawPrint className="w-4 h-4" /> Pets
              </h5>
              <p className="text-sm">Animated companions on your profile and room entries. Friends can feed your pets for rewards!</p>
            </div>

            <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
              <h5 className="font-semibold text-gold flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4" /> Assets (Passive Income)
              </h5>
              <p className="text-sm mb-2">Buy assets that generate credits every 24 hours!</p>
              <ul className="text-xs space-y-1">
                <li>🛴 Scooter — 100 USD → 10/day</li>
                <li>🚗 Car — 1,000 USD → 100/day</li>
                <li>✈️ Airplane — 20,000 USD → 300/day</li>
                <li>🛸 UFO — 50,000 USD → 500/day</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">Buy multiple of the same asset for multiplied daily income!</p>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h5 className="font-semibold text-accent flex items-center gap-2 mb-2">
                <Smile className="w-4 h-4" /> Emoticon Packs
              </h5>
              <p className="text-sm">Buy emoji packs to use in chat! Once purchased, an emoticon button appears in the chat input.</p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 border border-white/10">
              <h5 className="font-semibold flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" /> Avatar Customization
              </h5>
              <p className="text-sm">Buy backgrounds, faces, and avatar items to customize your look!</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <h5 className="font-semibold text-sky-500 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" /> XP Boosts
            </h5>
            <p className="text-sm">Purchase 2x or 3x XP multipliers for 1 or 24 hours to level up faster!</p>
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
              <p className="text-2xl font-bold">$5</p>
              <p className="text-lg text-primary">10,000 USD</p>
              <p className="text-xs text-muted-foreground mt-2">Merchant status (purple) for 30 days</p>
            </div>

            <div className="p-4 rounded-lg bg-gold/10 border border-gold/30 text-center">
              <div className="text-3xl mb-2">👑</div>
              <h4 className="font-bold text-gold">Pro</h4>
              <p className="text-2xl font-bold">$10</p>
              <p className="text-lg text-primary">25,000 USD</p>
              <p className="text-xs text-muted-foreground mt-2">Merchant status (gold) for 30 days</p>
            </div>

            <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/30 text-center">
              <div className="text-3xl mb-2">💎</div>
              <h4 className="font-bold text-pink-500">Elite</h4>
              <p className="text-2xl font-bold">$20</p>
              <p className="text-lg text-primary">100,000 USD</p>
              <p className="text-xs text-muted-foreground mt-2">Mentor status (pink) for 60 days</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">Contact an admin to purchase credit packs.</p>
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
              <li>✅ <strong>Daily Asset Collection</strong> — Collect from Profile page</li>
              <li>✅ <strong>Daily Spin</strong> — Free spin once per 24 hours</li>
              <li>✅ <strong>Redeem Codes</strong> — Codes drop every 5 min in Newbies room</li>
              <li>✅ <strong>Pet Feeding</strong> — Feed friends' pets for rewards (max 5 feeders/pet/day)</li>
              <li>✅ <strong>Game Winnings</strong> — Win credits from games</li>
              <li>✅ <strong>Gift Contests</strong> — Win prizes in admin-run contests</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🛒 Spending Credits:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Buy pets, assets, avatar items</li>
              <li>• Purchase emoticon packs</li>
              <li>• Buy XP boosts</li>
              <li>• Send gifts (10s cooldown between single gifts)</li>
              <li>• Transfer to other users</li>
            </ul>
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

          <div className="p-4 rounded-lg bg-secondary/30">
            <h4 className="font-semibold mb-2">📊 Level Calculation:</h4>
            <code className="text-sm px-2 py-1 bg-background rounded">Level = floor(XP / 100) + 1</code>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-2">🚀 XP Boosts:</h4>
            <p className="text-sm">Purchase temporary multipliers (2x/3x for 1 or 24 hours) from the Store!</p>
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
              <li>• Friends can feed your pets for rewards!</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🍖 Feeding Rules:</h4>
            <ul className="space-y-2 text-sm">
              <li>⚠️ <strong>You must own the same pet type</strong> to feed a friend's pet</li>
              <li>• Maximum 5 feeders per pet per day</li>
              <li>• Higher-priced pets give larger rewards</li>
              <li>• 10% chance of winning a random asset instead of credits!</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'contests',
      icon: <Gift className="w-5 h-5" />,
      title: 'Gift Contests',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">🏆 How Contests Work:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Timed competitions in enabled rooms</li>
              <li>• Use <code className="px-1 bg-background rounded">/gift</code> and <code className="px-1 bg-background rounded">/shower</code> to participate</li>
              <li>• Ranking based on number of gifts sent</li>
              <li>• Prize pool distributed among top 10 senders</li>
              <li>• One contest allowed per day</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">Admins can start contests with <code className="px-1 bg-background rounded">/startcontest &lt;minutes&gt; &lt;prize&gt;</code></p>
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
              <span className="text-sm text-muted-foreground">— Admin (full platform control)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <span className="w-4 h-4 rounded-full bg-pink-500" />
              <span className="font-semibold text-pink-500">Pink</span>
              <span className="text-sm text-muted-foreground">— Mentor (Elite pack - 60 days)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gold/10 border border-gold/20">
              <span className="w-4 h-4 rounded-full bg-gold" />
              <span className="font-semibold text-gold">Gold</span>
              <span className="text-sm text-muted-foreground">— Merchant Pro (Pro pack - 30 days)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <span className="w-4 h-4 rounded-full bg-violet-500" />
              <span className="font-semibold text-violet-500">Purple</span>
              <span className="text-sm text-muted-foreground">— Merchant Standard (Standard pack - 30 days)</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <span className="w-4 h-4 rounded-full bg-sky-500" />
              <span className="font-semibold text-sky-500">Blue</span>
              <span className="text-sm text-muted-foreground">— Regular user</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'moderation',
      icon: <Shield className="w-5 h-5" />,
      title: 'Moderation',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-3">🔧 Room Owner Commands:</h4>
            <ul className="space-y-2 text-sm">
              <li><code className="px-2 py-1 bg-background rounded">/kick &lt;username&gt;</code> — Remove user (10 min cooldown)</li>
              <li><code className="px-2 py-1 bg-background rounded">/mute &lt;username&gt;</code> — Mute user for 5 minutes</li>
              <li><code className="px-2 py-1 bg-background rounded">/warn &lt;username&gt; &lt;reason&gt;</code> — Issue a warning</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-secondary/30">
            <h4 className="font-semibold mb-3">🔒 Safety Guidelines:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Never share your password</li>
              <li>• Be respectful to all users</li>
              <li>• Report inappropriate behavior</li>
              <li>• Double-check usernames before transfers</li>
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
              <li>• Send/receive friend requests</li>
              <li>• See friends' online status</li>
              <li>• Private Messages open as tabs in navigation</li>
              <li>• Transfer credits from your Profile</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <h4 className="font-semibold text-gold mb-3">👤 Profiles:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Like other users' profiles</li>
              <li>• View stats, transactions, and owned items</li>
              <li>• Upload profile image & set status</li>
              <li>• Convert received gifts to credits</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-3">🔔 Bimo Alerts:</h4>
            <p className="text-sm">Get notified when someone likes your profile, feeds your pet, credits are refunded, or daily credits are available!</p>
          </div>
        </div>
      )
    }
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
            <p className="text-muted-foreground text-sm">Everything you need to know about bimo33</p>
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
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
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
