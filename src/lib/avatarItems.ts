// Avatar customization items for the store
export interface AvatarItem {
  id: string;
  name: string;
  type: 'background' | 'face' | 'frame';
  emoji: string;
  price: number;
  cssValue?: string;
  /**
   * how the frame border should be rendered; "solid" (default) or
   * "zigzag" for a jagged outline.  Only respected when `type === 'frame'`.
   */
  borderStyle?: 'solid' | 'zigzag';
  description: string;
}

export const AVATAR_ITEMS: AvatarItem[] = [
  // Backgrounds
// Backgrounds
{ id: 'bg_sunset', name: 'Sunset', type: 'background', emoji: '', price: 0.01, cssValue: 'linear-gradient(135deg, #ff6b6b, #feca57)', description: 'Warm sunset gradient' },
{ id: 'bg_ocean', name: 'Ocean', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #48dbfb, #0abde3)', description: 'Cool ocean gradient' },
{ id: 'bg_forest', name: 'Forest', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #26de81, #20bf6b)', description: 'Nature green gradient' },
{ id: 'bg_galaxy', name: 'Galaxy', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #5f27cd, #341f97)', description: 'Deep space gradient' },
{ id: 'bg_fire', name: 'Fire', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #ff9f43, #ee5a24)', description: 'Hot fire gradient' },
{ id: 'bg_ice', name: 'Ice', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #74b9ff, #0984e3)', description: 'Frozen ice gradient' },
{ id: 'bg_rainbow', name: 'Rainbow', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #5f27cd)', description: 'Colorful rainbow' },
{ id: 'bg_gold', name: 'Gold', type: 'background', emoji: '', price: 0.050, cssValue: 'linear-gradient(135deg, #f9ca24, #f0932b)', description: 'Premium gold gradient' },
{ id: 'bg_midnight', name: 'Midnight', type: 'background', emoji: '', price: 0.05, cssValue: 'linear-gradient(135deg, #2c3e50, #4a69bd)', description: 'Dark night gradient' },
{ id: 'bg_cherry', name: 'Cherry Blossom', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #ff9ff3, #f368e0)', description: 'Beautiful pink gradient' },
{ id: 'bg_lavender', name: 'Lavender', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #c7a4ff, #a29bfe)', description: 'Soft lavender gradient' },
{ id: 'bg_mint', name: 'Mint', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #55efc4, #00b894)', description: 'Fresh mint gradient' },
{ id: 'bg_peach', name: 'Peach', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #fab1a0, #ff7675)', description: 'Sweet peach gradient' },
{ id: 'bg_coffee', name: 'Coffee', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #6f4e37, #3e2723)', description: 'Rich coffee tones' },
{ id: 'bg_sky', name: 'Sky', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #81ecec, #74b9ff)', description: 'Bright sky blue gradient' },
{ id: 'bg_plum', name: 'Plum', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #8e44ad, #5e3370)', description: 'Deep plum gradient' },
{ id: 'bg_sand', name: 'Sand', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #f6e58d, #eccc68)', description: 'Warm sand gradient' },
{ id: 'bg_teal', name: 'Teal', type: 'background', emoji: '', price: 0.60, cssValue: 'linear-gradient(135deg, #1abc9c, #16a085)', description: 'Clean teal gradient' },
{ id: 'bg_rose', name: 'Rose', type: 'background', emoji: '', price: 0.75, cssValue: 'linear-gradient(135deg, #ff7675, #e84393)', description: 'Romantic rose gradient' },
{ id: 'bg_ember', name: 'Ember', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #d35400, #e67e22)', description: 'Glowing ember gradient' },
{ id: 'bg_aurora', name: 'Aurora', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #00cec9, #6c5ce7)', description: 'Aurora borealis colors' },
{ id: 'bg_slate', name: 'Slate', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #636e72, #2d3436)', description: 'Modern slate gradient' },
{ id: 'bg_coral', name: 'Coral', type: 'background', emoji: '', price: 0.15, cssValue: 'linear-gradient(135deg, #ff7f50, #ff6b81)', description: 'Vibrant coral gradient' },
{ id: 'bg_indigo', name: 'Indigo', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #3f51b5, #1a237e)', description: 'Deep indigo gradient' },
{ id: 'bg_lime', name: 'Lime', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #badc58, #6ab04c)', description: 'Zesty lime gradient' },
{ id: 'bg_smoke', name: 'Smoke', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #b2bec3, #636e72)', description: 'Soft smoky gradient' },
{ id: 'bg_ruby', name: 'Ruby', type: 'background', emoji: '', price: 0.30, cssValue: 'linear-gradient(135deg, #e84118, #c23616)', description: 'Luxurious ruby red' },
{ id: 'bg_olive', name: 'Olive', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #6ab04c, #4f772d)', description: 'Earthy olive tones' },
{ id: 'bg_denim', name: 'Denim', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #487eb0, #273c75)', description: 'Classic denim blue' },
{ id: 'bg_neon', name: 'Neon', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #00ffcc, #ff00ff)', description: 'High-energy neon gradient' },
{ id: 'bg_mocha', name: 'Mocha', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #a47148, #5d4037)', description: 'Warm mocha gradient' },
{ id: 'bg_arctic', name: 'Arctic', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #dfe6e9, #b2bec3)', description: 'Cold arctic tones' },
{ id: 'bg_volcano', name: 'Volcano', type: 'background', emoji: '', price: 1.00, cssValue: 'linear-gradient(135deg, #b31217, #e52d27)', description: 'Molten lava gradient' },
{ id: 'bg_seafoam', name: 'Seafoam', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #7bed9f, #2ed573)', description: 'Light seafoam green' },
{ id: 'bg_amethyst', name: 'Amethyst', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #9b59b6, #6c3483)', description: 'Gemstone purple gradient' },
{ id: 'bg_bronze', name: 'Bronze', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #cd7f32, #8d5524)', description: 'Metallic bronze tones' },
{ id: 'bg_storm', name: 'Storm', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #485563, #29323c)', description: 'Stormy sky gradient' },
{ id: 'bg_cottoncandy', name: 'Cotton Candy', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)', description: 'Sweet pastel blend' },
{ id: 'bg_marine', name: 'Marine', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #1e3799, #0c2461)', description: 'Deep marine blue' },
{ id: 'bg_charcoal', name: 'Charcoal', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #3d3d3d, #1e1e1e)', description: 'Dark charcoal gradient' },
{ id: 'bg_blush', name: 'Blush', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #f8a5c2, #f78fb3)', description: 'Soft blush pink' },
{ id: 'bg_emerald', name: 'Emerald', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #2ecc71, #1e8449)', description: 'Rich emerald green' },
{ id: 'bg_sapphire', name: 'Sapphire', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #2980b9, #1b4f72)', description: 'Precious sapphire blue' },
{ id: 'bg_obsidian', name: 'Obsidian', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #0f2027, #000000)', description: 'Volcanic glass black' },
{ id: 'bg_honey', name: 'Honey', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #f6b93b, #e58e26)', description: 'Golden honey tones' },
{ id: 'bg_moss', name: 'Moss', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #556b2f, #3e4f1c)', description: 'Deep forest moss' },
{ id: 'bg_sunrise', name: 'Sunrise', type: 'background', emoji: '', price: 0.50, cssValue: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', description: 'Soft morning sunrise' },
{ id: 'bg_twilight', name: 'Twilight', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #355c7d, #6c5b7b)', description: 'Evening twilight hues' },
{ id: 'bg_cyber', name: 'Cyber', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #00e6e6, #1b1464)', description: 'Futuristic cyber glow' },
{ id: 'bg_prism', name: 'Prism', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #ff3f34, #ffa801, #05c46b, #0fbcf9)', description: 'Multi-color prism gradient' },
{ id: 'bg_synthwave', name: 'Synthwave', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #f72585, #7209b7, #3a0ca3, #4cc9f0)', description: 'Retro synthwave colors' },
{ id: 'bg_oasis', name: 'Oasis', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #fef9c3, #a8e6cf, #56cfe1)', description: 'Refreshing desert oasis' },
{ id: 'bg_cosmicdust', name: 'Cosmic Dust', type: 'background', emoji: '', price: 0.10, cssValue: 'linear-gradient(135deg, #2c2c54, #40407a, #706fd3, #34ace0)', description: 'Star-filled cosmic gradient' },
{ id: 'bg_tropical', name: 'Tropical', type: 'background', emoji: '', price: 0.50, cssValue: 'linear-gradient(135deg, #ffbe76, #ff7979, #badc58, #22a6b3)', description: 'Vibrant tropical blend' },


// Faces (animal icons)
{ id: 'face_dog', name: 'Dog Face', type: 'face', emoji: '🐶', price: 0.01, description: 'Cute dog face' },
{ id: 'face_cat', name: 'Cat Face', type: 'face', emoji: '🐱', price: 0.05, description: 'Playful cat face' },
{ id: 'face_fox', name: 'Fox Face', type: 'face', emoji: '🦊', price: 0.05, description: 'Sly fox face' },
{ id: 'face_panda', name: 'Panda Face', type: 'face', emoji: '🐼', price: 0.05, description: 'Adorable panda face' },
{ id: 'face_bear', name: 'Bear Face', type: 'face', emoji: '🐻', price: 0.05, description: 'Friendly bear face' },
{ id: 'face_rabbit', name: 'Rabbit Face', type: 'face', emoji: '🐰', price: 0.05, description: 'Happy rabbit face' },
{ id: 'face_tiger', name: 'Tiger Face', type: 'face', emoji: '🐯', price: 0.05, description: 'Fierce tiger face' },
{ id: 'face_pig', name: 'Pig Face', type: 'face', emoji: '🐷', price: 0.05, description: 'Silly pig face' },
{ id: 'face_monkey', name: 'Monkey Face', type: 'face', emoji: '🐵', price: 0.10, description: 'Cheeky monkey face' },
{ id: 'face_frog', name: 'Frog Face', type: 'face', emoji: '🐸', price: 0.10, description: 'Funny frog face' },
{ id: 'face_owl', name: 'Owl Face', type: 'face', emoji: '🦉', price: 0.10, description: 'Wise owl face' },
{ id: 'face_elephant', name: 'Elephant Face', type: 'face', emoji: '🐘', price: 0.10, description: 'Majestic elephant face' },
{ id: 'face_lion', name: 'Lion Face', type: 'face', emoji: '🦁', price: 0.10, description: 'King of jungle face' },
{ id: 'face_wolf', name: 'Wolf Face', type: 'face', emoji: '🐺', price: 0.10, description: 'Wild wolf face' },
{ id: 'face_koala', name: 'Koala Face', type: 'face', emoji: '🐨', price: 0.10, description: 'Cute koala face' },
{ id: 'face_penguin', name: 'Penguin Face', type: 'face', emoji: '🐧', price: 0.10, description: 'Chilly penguin face' },
{ id: 'face_sheep', name: 'Sheep Face', type: 'face', emoji: '🐑', price: 0.15, description: 'Soft sheep face' },
{ id: 'face_chick', name: 'Chick Face', type: 'face', emoji: '🐤', price: 0.15, description: 'Tiny chick face' },
{ id: 'face_dragon', name: 'Dragon Face', type: 'face', emoji: '🐲', price: 0.15, description: 'Mythical dragon face' },
{ id: 'face_unicorn', name: 'Unicorn Face', type: 'face', emoji: '🦄', price: 0.15, description: 'Magical unicorn face' },
{ id: 'face_horse', name: 'Horse Face', type: 'face', emoji: '🐴', price: 0.15, description: 'Strong horse face' },
{ id: 'face_cow', name: 'Cow Face', type: 'face', emoji: '🐮', price: 0.15, description: 'Friendly cow face' },
{ id: 'face_deer', name: 'Deer Face', type: 'face', emoji: '🦌', price: 0.15, description: 'Graceful deer face' },
{ id: 'face_mouse', name: 'Mouse Face', type: 'face', emoji: '🐭', price: 0.20, description: 'Tiny mouse face' },
{ id: 'face_raccoon', name: 'Raccoon Face', type: 'face', emoji: '🦝', price: 0.20, description: 'Sneaky raccoon face' },
{ id: 'face_sloth', name: 'Sloth Face', type: 'face', emoji: '🦥', price: 0.20, description: 'Lazy sloth face' },
{ id: 'face_crocodile', name: 'Crocodile Face', type: 'face', emoji: '🐊', price: 0.20, description: 'Fearsome crocodile face' },
{ id: 'face_octopus', name: 'Octopus Face', type: 'face', emoji: '🐙', price: 0.20, description: 'Smart octopus face' },
{ id: 'face_bat', name: 'Bat Face', type: 'face', emoji: '🦇', price: 0.20, description: 'Mysterious bat face' },
{ id: 'face_shark', name: 'Shark Face', type: 'face', emoji: '🦈', price: 0.20, description: 'Deadly shark face' },
{ id: 'face_parrot', name: 'Parrot Face', type: 'face', emoji: '🦜', price: 0.20, description: 'Colorful parrot face' },
{ id: 'face_peacock', name: 'Peacock Face', type: 'face', emoji: '🦚', price: 0.20, description: 'Elegant peacock face' },
{ id: 'face_whale', name: 'Whale Face', type: 'face', emoji: '🐳', price: 0.20, description: 'Gentle whale face' },
{ id: 'face_dolphin', name: 'Dolphin Face', type: 'face', emoji: '🐬', price: 0.20, description: 'Playful dolphin face' },
{ id: 'face_turtle', name: 'Turtle Face', type: 'face', emoji: '🐢', price: 0.20, description: 'Calm turtle face' },
{ id: 'face_lobster', name: 'Lobster Face', type: 'face', emoji: '🦞', price: 0.25, description: 'Snappy lobster face' },
{ id: 'face_bee', name: 'Bee Face', type: 'face', emoji: '🐝', price: 0.25, description: 'Busy bee face' },
{ id: 'face_ladybug', name: 'Ladybug Face', type: 'face', emoji: '🐞', price: 0.25, description: 'Lucky ladybug face' },
{ id: 'face_spider', name: 'Spider Face', type: 'face', emoji: '🕷️', price: 0.25, description: 'Creepy spider face' },
{ id: 'face_skull', name: 'Skull Face', type: 'face', emoji: '💀', price: 0.25, description: 'Spooky skull face' },
{ id: 'face_alien', name: 'Alien Face', type: 'face', emoji: '👽', price: 0.25, description: 'Mysterious alien face' },
{ id: 'face_robot', name: 'Robot Face', type: 'face', emoji: '🤖', price: 0.25, description: 'Futuristic robot face' },
{ id: 'face_ghost', name: 'Ghost Face', type: 'face', emoji: '👻', price: 0.25, description: 'Playful ghost face' },

// Frames (decorate the avatar with a circular border)
{ id: 'frame_bronze', name: 'Bronze Frame', type: 'frame', emoji: '🥉', price: 0.12, cssValue: '#cd7f32', description: 'Classic bronze border' },

{ id: 'frame_platinum', name: 'Platinum Frame', type: 'frame', emoji: '💎', price: 0.30, cssValue: '#e5e4e2', description: 'Premium platinum border' },

{ id: 'frame_diamond', name: 'Diamond Frame', type: 'frame', emoji: '🔷', price: 0.50, cssValue: 'linear-gradient(45deg,#b9f2ff,#e0ffff)', description: 'Sparkling diamond border' },

{ id: 'frame_rainbow', name: 'Rainbow Frame', type: 'frame', emoji: '🌈', price: 0.25, cssValue: 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)', description: 'Colorful rainbow border' },

{ id: 'frame_neon_pink', name: 'Neon Pink Frame', type: 'frame', emoji: '💖', price: 0.22, cssValue: '#ff1493', description: 'Bright neon pink glow border' },

{ id: 'frame_neon_blue', name: 'Neon Blue Frame', type: 'frame', emoji: '🔵', price: 0.22, cssValue: '#00f0ff', description: 'Electric blue neon border' },

{ id: 'frame_emerald', name: 'Emerald Frame', type: 'frame', emoji: '💚', price: 0.28, cssValue: '#50c878', description: 'Rich emerald green border' },

{ id: 'frame_ruby', name: 'Ruby Frame', type: 'frame', emoji: '❤️', price: 0.28, cssValue: '#e0115f', description: 'Deep ruby red border' },

{ id: 'frame_sapphire', name: 'Sapphire Frame', type: 'frame', emoji: '💙', price: 0.28, cssValue: '#0f52ba', description: 'Royal sapphire blue border' },

{ id: 'frame_obsidian', name: 'Obsidian Frame', type: 'frame', emoji: '🖤', price: 0.18, cssValue: '#0b0b0b', description: 'Dark obsidian border' },

{ id: 'frame_fire', name: 'Fire Frame', type: 'frame', emoji: '🔥', price: 0.35, cssValue: 'linear-gradient(45deg,#ff4500,#ffae00)', description: 'Fiery animated-style border' },

{ id: 'frame_ice', name: 'Ice Frame', type: 'frame', emoji: '❄️', price: 0.24, cssValue: 'linear-gradient(45deg,#aeefff,#e0ffff)', description: 'Cool icy blue border' },

{ id: 'frame_galaxy', name: 'Galaxy Frame', type: 'frame', emoji: '🌌', price: 0.40, cssValue: 'linear-gradient(45deg,#2b1055,#7597de)', description: 'Cosmic galaxy border' },

{ id: 'frame_royal_purple', name: 'Royal Purple Frame', type: 'frame', emoji: '👑', price: 0.26, cssValue: '#6a0dad', description: 'Regal purple border' },

{ id: 'frame_minimal_white', name: 'Minimal White Frame', type: 'frame', emoji: '⚪', price: 0.08, cssValue: '#ffffff', description: 'Clean minimalist white border' },

  // example of a zigzag outline frame
  { id: 'frame_zigzag', name: 'Zigzag Frame', type: 'frame', emoji: '🔷', price: 0.40, cssValue: '#00f', borderStyle: 'zigzag', description: 'Fun zigzag border' }
];

export function getAvatarItemsByType(type: AvatarItem['type']): AvatarItem[] {
  return AVATAR_ITEMS.filter(item => item.type === type);
}

export function getAvatarItemById(id: string): AvatarItem | undefined {
  return AVATAR_ITEMS.find(item => item.id === id);
}

export const AVATAR_ITEM_TYPES: AvatarItem['type'][] = ['background', 'face', 'frame'];
