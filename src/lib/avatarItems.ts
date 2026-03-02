import type { CSSProperties } from 'react';

// Avatar customization items for the store
export interface AvatarItem {
  id: string;
  name: string;
  type: 'background' | 'face' | 'frame';
  emoji: string;
  price: number;
  cssValue?: string;
  /**
   * how the frame border should be rendered
   */
  borderStyle?: 
    | 'solid' 
    | 'zigzag' 
    | 'dashed' 
    | 'dotted' 
    | 'double' 
    | 'glow' 
    | 'neon-pulse' 
    | 'gradient-ring' 
    | 'spiked' 
    | 'ornate'
    | 'circle'
    | 'zigzag-circle'
    | 'square'
    | 'hexagon'
    | 'octagon'
    | 'diamond'
    | 'rounded-rectangle'
    | 'starburst'
    | 'scalloped'
    | 'double-ring'
    | 'dashed-ring'
    | 'dotted-ring'
    | 'bevel-edge'
    | 'rope-twist'
    | 'vine-wreath'
    | 'floral-rosette'
    | 'floral-daisy'
    | 'floral-lotus'
    | 'floral-baroque'
    | 'floral-wreath';
  description: string;
}
export const AVATAR_ITEMS: AvatarItem[] = [
  // Backgrounds
// Backgrounds
{ id: 'bg_sunset', name: 'Sunset', type: 'background', emoji: '', price: 1.86, cssValue: 'linear-gradient(135deg, #ff6b6b, #feca57)', description: 'Warm sunset gradient' },
{ id: 'bg_ocean', name: 'Ocean', type: 'background', emoji: '', price: 1.33, cssValue: 'linear-gradient(135deg, #48dbfb, #0abde3)', description: 'Cool ocean gradient' },
{ id: 'bg_forest', name: 'Forest', type: 'background', emoji: '', price: 1.69, cssValue: 'linear-gradient(135deg, #26de81, #20bf6b)', description: 'Nature green gradient' },
{ id: 'bg_galaxy', name: 'Galaxy', type: 'background', emoji: '', price: 1.59, cssValue: 'linear-gradient(135deg, #5f27cd, #341f97)', description: 'Deep space gradient' },
{ id: 'bg_fire', name: 'Fire', type: 'background', emoji: '', price: 1.62, cssValue: 'linear-gradient(135deg, #ff9f43, #ee5a24)', description: 'Hot fire gradient' },
{ id: 'bg_ice', name: 'Ice', type: 'background', emoji: '', price: 1.29, cssValue: 'linear-gradient(135deg, #74b9ff, #0984e3)', description: 'Frozen ice gradient' },
{ id: 'bg_rainbow', name: 'Rainbow', type: 'background', emoji: '', price: 1.28, cssValue: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #5f27cd)', description: 'Colorful rainbow' },
{ id: 'bg_gold', name: 'Gold', type: 'background', emoji: '', price: 1.87, cssValue: 'linear-gradient(135deg, #f9ca24, #f0932b)', description: 'Premium gold gradient' },
{ id: 'bg_midnight', name: 'Midnight', type: 'background', emoji: '', price: 1.38, cssValue: 'linear-gradient(135deg, #2c3e50, #4a69bd)', description: 'Dark night gradient' },
{ id: 'bg_cherry', name: 'Cherry Blossom', type: 'background', emoji: '', price: 1.57, cssValue: 'linear-gradient(135deg, #ff9ff3, #f368e0)', description: 'Beautiful pink gradient' },
{ id: 'bg_lavender', name: 'Lavender', type: 'background', emoji: '', price: 1.41, cssValue: 'linear-gradient(135deg, #c7a4ff, #a29bfe)', description: 'Soft lavender gradient' },
{ id: 'bg_mint', name: 'Mint', type: 'background', emoji: '', price: 1.69, cssValue: 'linear-gradient(135deg, #55efc4, #00b894)', description: 'Fresh mint gradient' },
{ id: 'bg_peach', name: 'Peach', type: 'background', emoji: '', price: 1.16, cssValue: 'linear-gradient(135deg, #fab1a0, #ff7675)', description: 'Sweet peach gradient' },
{ id: 'bg_coffee', name: 'Coffee', type: 'background', emoji: '', price: 1.27, cssValue: 'linear-gradient(135deg, #6f4e37, #3e2723)', description: 'Rich coffee tones' },
{ id: 'bg_sky', name: 'Sky', type: 'background', emoji: '', price: 1.93, cssValue: 'linear-gradient(135deg, #81ecec, #74b9ff)', description: 'Bright sky blue gradient' },
{ id: 'bg_plum', name: 'Plum', type: 'background', emoji: '', price: 1.36, cssValue: 'linear-gradient(135deg, #8e44ad, #5e3370)', description: 'Deep plum gradient' },
{ id: 'bg_sand', name: 'Sand', type: 'background', emoji: '', price: 1.89, cssValue: 'linear-gradient(135deg, #f6e58d, #eccc68)', description: 'Warm sand gradient' },
{ id: 'bg_teal', name: 'Teal', type: 'background', emoji: '', price: 4.37, cssValue: 'linear-gradient(135deg, #1abc9c, #16a085)', description: 'Clean teal gradient' },
{ id: 'bg_rose', name: 'Rose', type: 'background', emoji: '', price: 4.18, cssValue: 'linear-gradient(135deg, #ff7675, #e84393)', description: 'Romantic rose gradient' },
{ id: 'bg_ember', name: 'Ember', type: 'background', emoji: '', price: 1.81, cssValue: 'linear-gradient(135deg, #d35400, #e67e22)', description: 'Glowing ember gradient' },
{ id: 'bg_aurora', name: 'Aurora', type: 'background', emoji: '', price: 1.80, cssValue: 'linear-gradient(135deg, #00cec9, #6c5ce7)', description: 'Aurora borealis colors' },
{ id: 'bg_slate', name: 'Slate', type: 'background', emoji: '', price: 1.08, cssValue: 'linear-gradient(135deg, #636e72, #2d3436)', description: 'Modern slate gradient' },
{ id: 'bg_coral', name: 'Coral', type: 'background', emoji: '', price: 2.85, cssValue: 'linear-gradient(135deg, #ff7f50, #ff6b81)', description: 'Vibrant coral gradient' },
{ id: 'bg_indigo', name: 'Indigo', type: 'background', emoji: '', price: 1.30, cssValue: 'linear-gradient(135deg, #3f51b5, #1a237e)', description: 'Deep indigo gradient' },
{ id: 'bg_lime', name: 'Lime', type: 'background', emoji: '', price: 1.48, cssValue: 'linear-gradient(135deg, #badc58, #6ab04c)', description: 'Zesty lime gradient' },
{ id: 'bg_smoke', name: 'Smoke', type: 'background', emoji: '', price: 1.24, cssValue: 'linear-gradient(135deg, #b2bec3, #636e72)', description: 'Soft smoky gradient' },
{ id: 'bg_ruby', name: 'Ruby', type: 'background', emoji: '', price: 3.19, cssValue: 'linear-gradient(135deg, #e84118, #c23616)', description: 'Luxurious ruby red' },
{ id: 'bg_olive', name: 'Olive', type: 'background', emoji: '', price: 1.46, cssValue: 'linear-gradient(135deg, #6ab04c, #4f772d)', description: 'Earthy olive tones' },
{ id: 'bg_denim', name: 'Denim', type: 'background', emoji: '', price: 1.57, cssValue: 'linear-gradient(135deg, #487eb0, #273c75)', description: 'Classic denim blue' },
{ id: 'bg_neon', name: 'Neon', type: 'background', emoji: '', price: 1.28, cssValue: 'linear-gradient(135deg, #00ffcc, #ff00ff)', description: 'High-energy neon gradient' },
{ id: 'bg_mocha', name: 'Mocha', type: 'background', emoji: '', price: 1.82, cssValue: 'linear-gradient(135deg, #a47148, #5d4037)', description: 'Warm mocha gradient' },
{ id: 'bg_arctic', name: 'Arctic', type: 'background', emoji: '', price: 1.09, cssValue: 'linear-gradient(135deg, #dfe6e9, #b2bec3)', description: 'Cold arctic tones' },
{ id: 'bg_volcano', name: 'Volcano', type: 'background', emoji: '', price: 4.52, cssValue: 'linear-gradient(135deg, #b31217, #e52d27)', description: 'Molten lava gradient' },
{ id: 'bg_seafoam', name: 'Seafoam', type: 'background', emoji: '', price: 1.77, cssValue: 'linear-gradient(135deg, #7bed9f, #2ed573)', description: 'Light seafoam green' },
{ id: 'bg_amethyst', name: 'Amethyst', type: 'background', emoji: '', price: 1.28, cssValue: 'linear-gradient(135deg, #9b59b6, #6c3483)', description: 'Gemstone purple gradient' },
{ id: 'bg_bronze', name: 'Bronze', type: 'background', emoji: '', price: 1.27, cssValue: 'linear-gradient(135deg, #cd7f32, #8d5524)', description: 'Metallic bronze tones' },
{ id: 'bg_storm', name: 'Storm', type: 'background', emoji: '', price: 1.72, cssValue: 'linear-gradient(135deg, #485563, #29323c)', description: 'Stormy sky gradient' },
{ id: 'bg_cottoncandy', name: 'Cotton Candy', type: 'background', emoji: '', price: 1.80, cssValue: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)', description: 'Sweet pastel blend' },
{ id: 'bg_marine', name: 'Marine', type: 'background', emoji: '', price: 1.54, cssValue: 'linear-gradient(135deg, #1e3799, #0c2461)', description: 'Deep marine blue' },
{ id: 'bg_charcoal', name: 'Charcoal', type: 'background', emoji: '', price: 1.04, cssValue: 'linear-gradient(135deg, #3d3d3d, #1e1e1e)', description: 'Dark charcoal gradient' },
{ id: 'bg_blush', name: 'Blush', type: 'background', emoji: '', price: 1.52, cssValue: 'linear-gradient(135deg, #f8a5c2, #f78fb3)', description: 'Soft blush pink' },
{ id: 'bg_emerald', name: 'Emerald', type: 'background', emoji: '', price: 1.22, cssValue: 'linear-gradient(135deg, #2ecc71, #1e8449)', description: 'Rich emerald green' },
{ id: 'bg_sapphire', name: 'Sapphire', type: 'background', emoji: '', price: 1.65, cssValue: 'linear-gradient(135deg, #2980b9, #1b4f72)', description: 'Precious sapphire blue' },
{ id: 'bg_obsidian', name: 'Obsidian', type: 'background', emoji: '', price: 1.55, cssValue: 'linear-gradient(135deg, #0f2027, #000000)', description: 'Volcanic glass black' },
{ id: 'bg_honey', name: 'Honey', type: 'background', emoji: '', price: 1.07, cssValue: 'linear-gradient(135deg, #f6b93b, #e58e26)', description: 'Golden honey tones' },
{ id: 'bg_moss', name: 'Moss', type: 'background', emoji: '', price: 1.33, cssValue: 'linear-gradient(135deg, #556b2f, #3e4f1c)', description: 'Deep forest moss' },
{ id: 'bg_sunrise', name: 'Sunrise', type: 'background', emoji: '', price: 3.77, cssValue: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', description: 'Soft morning sunrise' },
{ id: 'bg_twilight', name: 'Twilight', type: 'background', emoji: '', price: 1.41, cssValue: 'linear-gradient(135deg, #355c7d, #6c5b7b)', description: 'Evening twilight hues' },
{ id: 'bg_cyber', name: 'Cyber', type: 'background', emoji: '', price: 1.75, cssValue: 'linear-gradient(135deg, #00e6e6, #1b1464)', description: 'Futuristic cyber glow' },
{ id: 'bg_prism', name: 'Prism', type: 'background', emoji: '', price: 2.48, cssValue: 'linear-gradient(135deg, #ff3f34, #ffa801, #05c46b, #0fbcf9)', description: 'Multi-color prism gradient' },
{ id: 'bg_synthwave', name: 'Synthwave', type: 'background', emoji: '', price: 2.45, cssValue: 'linear-gradient(135deg, #f72585, #7209b7, #3a0ca3, #4cc9f0)', description: 'Retro synthwave colors' },
{ id: 'bg_oasis', name: 'Oasis', type: 'background', emoji: '', price: 1.46, cssValue: 'linear-gradient(135deg, #fef9c3, #a8e6cf, #56cfe1)', description: 'Refreshing desert oasis' },
{ id: 'bg_cosmicdust', name: 'Cosmic Dust', type: 'background', emoji: '', price: 2.43, cssValue: 'linear-gradient(135deg, #2c2c54, #40407a, #706fd3, #34ace0)', description: 'Star-filled cosmic gradient' },
{ id: 'bg_tropical', name: 'Tropical', type: 'background', emoji: '', price: 4.69, cssValue: 'linear-gradient(135deg, #ffbe76, #ff7979, #badc58, #22a6b3)', description: 'Vibrant tropical blend' },


// Faces (animal icons)
{ id: 'face_dog', name: 'Dog Face', type: 'face', emoji: '🐶', price: 1.04, description: 'Cute dog face' },
{ id: 'face_cat', name: 'Cat Face', type: 'face', emoji: '🐱', price: 1.06, description: 'Playful cat face' },
{ id: 'face_fox', name: 'Fox Face', type: 'face', emoji: '🦊', price: 1.36, description: 'Sly fox face' },
{ id: 'face_panda', name: 'Panda Face', type: 'face', emoji: '🐼', price: 1.08, description: 'Adorable panda face' },
{ id: 'face_bear', name: 'Bear Face', type: 'face', emoji: '🐻', price: 1.04, description: 'Friendly bear face' },
{ id: 'face_rabbit', name: 'Rabbit Face', type: 'face', emoji: '🐰', price: 1.63, description: 'Happy rabbit face' },
{ id: 'face_tiger', name: 'Tiger Face', type: 'face', emoji: '🐯', price: 1.89, description: 'Fierce tiger face' },
{ id: 'face_pig', name: 'Pig Face', type: 'face', emoji: '🐷', price: 1.18, description: 'Silly pig face' },
{ id: 'face_monkey', name: 'Monkey Face', type: 'face', emoji: '🐵', price: 1.53, description: 'Cheeky monkey face' },
{ id: 'face_frog', name: 'Frog Face', type: 'face', emoji: '🐸', price: 1.28, description: 'Funny frog face' },
{ id: 'face_owl', name: 'Owl Face', type: 'face', emoji: '🦉', price: 1.82, description: 'Wise owl face' },
{ id: 'face_elephant', name: 'Elephant Face', type: 'face', emoji: '🐘', price: 1.09, description: 'Majestic elephant face' },
{ id: 'face_lion', name: 'Lion Face', type: 'face', emoji: '🦁', price: 1.34, description: 'King of jungle face' },
{ id: 'face_wolf', name: 'Wolf Face', type: 'face', emoji: '🐺', price: 1.81, description: 'Wild wolf face' },
{ id: 'face_koala', name: 'Koala Face', type: 'face', emoji: '🐨', price: 1.03, description: 'Cute koala face' },
{ id: 'face_penguin', name: 'Penguin Face', type: 'face', emoji: '🐧', price: 1.19, description: 'Chilly penguin face' },
{ id: 'face_sheep', name: 'Sheep Face', type: 'face', emoji: '🐑', price: 2.31, description: 'Soft sheep face' },
{ id: 'face_chick', name: 'Chick Face', type: 'face', emoji: '🐤', price: 2.07, description: 'Tiny chick face' },
{ id: 'face_dragon', name: 'Dragon Face', type: 'face', emoji: '🐲', price: 1.82, description: 'Mythical dragon face' },
{ id: 'face_unicorn', name: 'Unicorn Face', type: 'face', emoji: '🦄', price: 1.84, description: 'Magical unicorn face' },
{ id: 'face_horse', name: 'Horse Face', type: 'face', emoji: '🐴', price: 2.41, description: 'Strong horse face' },
{ id: 'face_cow', name: 'Cow Face', type: 'face', emoji: '🐮', price: 2.74, description: 'Friendly cow face' },
{ id: 'face_deer', name: 'Deer Face', type: 'face', emoji: '🦌', price: 2.57, description: 'Graceful deer face' },
{ id: 'face_mouse', name: 'Mouse Face', type: 'face', emoji: '🐭', price: 2.06, description: 'Tiny mouse face' },
{ id: 'face_raccoon', name: 'Raccoon Face', type: 'face', emoji: '🦝', price: 2.64, description: 'Sneaky raccoon face' },
{ id: 'face_sloth', name: 'Sloth Face', type: 'face', emoji: '🦥', price: 2.21, description: 'Lazy sloth face' },
{ id: 'face_crocodile', name: 'Crocodile Face', type: 'face', emoji: '🐊', price: 1.87, description: 'Fearsome crocodile face' },
{ id: 'face_octopus', name: 'Octopus Face', type: 'face', emoji: '🐙', price: 2.28, description: 'Smart octopus face' },
{ id: 'face_bat', name: 'Bat Face', type: 'face', emoji: '🦇', price: 2.75, description: 'Mysterious bat face' },
{ id: 'face_shark', name: 'Shark Face', type: 'face', emoji: '🦈', price: 2.37, description: 'Deadly shark face' },
{ id: 'face_parrot', name: 'Parrot Face', type: 'face', emoji: '🦜', price: 2.37, description: 'Colorful parrot face' },
{ id: 'face_peacock', name: 'Peacock Face', type: 'face', emoji: '🦚', price: 2.45, description: 'Elegant peacock face' },
{ id: 'face_whale', name: 'Whale Face', type: 'face', emoji: '🐳', price: 2.74, description: 'Gentle whale face' },
{ id: 'face_dolphin', name: 'Dolphin Face', type: 'face', emoji: '🐬', price: 2.72, description: 'Playful dolphin face' },
{ id: 'face_turtle', name: 'Turtle Face', type: 'face', emoji: '🐢', price: 2.70, description: 'Calm turtle face' },
{ id: 'face_lobster', name: 'Lobster Face', type: 'face', emoji: '🦞', price: 3.52, description: 'Snappy lobster face' },
{ id: 'face_bee', name: 'Bee Face', type: 'face', emoji: '🐝', price: 3.09, description: 'Busy bee face' },
{ id: 'face_ladybug', name: 'Ladybug Face', type: 'face', emoji: '🐞', price: 3.51, description: 'Lucky ladybug face' },
{ id: 'face_spider', name: 'Spider Face', type: 'face', emoji: '🕷️', price: 3.19, description: 'Creepy spider face' },
{ id: 'face_skull', name: 'Skull Face', type: 'face', emoji: '💀', price: 2.91, description: 'Spooky skull face' },
{ id: 'face_alien', name: 'Alien Face', type: 'face', emoji: '👽', price: 3.45, description: 'Mysterious alien face' },
{ id: 'face_robot', name: 'Robot Face', type: 'face', emoji: '🤖', price: 3.53, description: 'Futuristic robot face' },
{ id: 'face_ghost', name: 'Ghost Face', type: 'face', emoji: '👻', price: 3.16, description: 'Playful ghost face' },

// Frames (shape-only; frame color is inherited from equipped background)
{ id: 'frame_circle', name: 'Circular', type: 'frame', emoji: '', price: 1.87, cssValue: '#000000', borderStyle: 'circle', description: 'Clean circular frame' },
{ id: 'frame_zigzag_circle', name: 'Zigzag Circle', type: 'frame', emoji: '', price: 2.70, cssValue: '#000000', borderStyle: 'zigzag-circle', description: 'Zigzag circular frame' },
{ id: 'frame_square', name: 'Square', type: 'frame', emoji: '', price: 1.52, cssValue: '#000000', borderStyle: 'square', description: 'Simple square frame' },
{ id: 'frame_hexagon', name: 'Hexagon', type: 'frame', emoji: '', price: 2.14, cssValue: '#000000', borderStyle: 'hexagon', description: 'Six-sided geometric frame' },
{ id: 'frame_octagon', name: 'Octagon', type: 'frame', emoji: '', price: 2.28, cssValue: '#000000', borderStyle: 'octagon', description: 'Eight-sided geometric frame' },
{ id: 'frame_diamond', name: 'Diamond', type: 'frame', emoji: '', price: 2.76, cssValue: '#000000', borderStyle: 'diamond', description: 'Diamond-cut angular frame' },
{ id: 'frame_rounded_rectangle', name: 'Rounded Rectangle', type: 'frame', emoji: '', price: 2.81, cssValue: '#000000', borderStyle: 'rounded-rectangle', description: 'Soft rectangular frame' },
{ id: 'frame_starburst', name: 'Starburst', type: 'frame', emoji: '', price: 2.89, cssValue: '#000000', borderStyle: 'starburst', description: 'Radiant spiked frame' },
{ id: 'frame_scalloped', name: 'Scalloped', type: 'frame', emoji: '', price: 1.85, cssValue: '#000000', borderStyle: 'scalloped', description: 'Curved scallop edge frame' },
{ id: 'frame_double_ring', name: 'Double Ring', type: 'frame', emoji: '', price: 2.60, cssValue: '#000000', borderStyle: 'double-ring', description: 'Classic double-line ring' },
{ id: 'frame_dashed_ring', name: 'Dashed Ring', type: 'frame', emoji: '', price: 2.21, cssValue: '#000000', borderStyle: 'dashed-ring', description: 'Dashed circular frame' },
{ id: 'frame_dotted_ring', name: 'Dotted Ring', type: 'frame', emoji: '', price: 2.44, cssValue: '#000000', borderStyle: 'dotted-ring', description: 'Dotted circular frame' },
{ id: 'frame_bevel_edge', name: 'Bevel Edge', type: 'frame', emoji: '', price: 2.28, cssValue: '#000000', borderStyle: 'bevel-edge', description: 'Beveled angular frame' },
{ id: 'frame_rope_twist', name: 'Rope Twist', type: 'frame', emoji: '', price: 2.41, cssValue: '#000000', borderStyle: 'rope-twist', description: 'Twisted rope-like frame' },
{ id: 'frame_vine_wreath', name: 'Vine Wreath', type: 'frame', emoji: '', price: 3.42, cssValue: '#000000', borderStyle: 'vine-wreath', description: 'Organic wreath-like frame' },
{ id: 'frame_floral_rosette', name: 'Floral Rosette', type: 'frame', emoji: '', price: 3.31, cssValue: '#000000', borderStyle: 'floral-rosette', description: 'Mirror-style carved rosette border' },
{ id: 'frame_floral_daisy', name: 'Floral Daisy', type: 'frame', emoji: '', price: 3.24, cssValue: '#000000', borderStyle: 'floral-daisy', description: 'Daisy petal ring frame' },
{ id: 'frame_floral_lotus', name: 'Floral Lotus', type: 'frame', emoji: '', price: 3.57, cssValue: '#000000', borderStyle: 'floral-lotus', description: 'Layered lotus petal frame' },
{ id: 'frame_floral_baroque', name: 'Floral Baroque', type: 'frame', emoji: '', price: 4.33, cssValue: '#000000', borderStyle: 'floral-baroque', description: 'Ornate mirror floral frame' },
{ id: 'frame_floral_wreath', name: 'Floral Wreath', type: 'frame', emoji: '', price: 3.89, cssValue: '#000000', borderStyle: 'floral-wreath', description: 'Botanical wreath floral frame' },
];

export function getAvatarItemsByType(type: AvatarItem['type']): AvatarItem[] {
  return AVATAR_ITEMS.filter(item => item.type === type);
}

export function getAvatarItemById(id: string): AvatarItem | undefined {
  const directItem = AVATAR_ITEMS.find(item => item.id === id);
  if (directItem) return directItem;

  const mapped = LEGACY_FRAME_ID_MAP[id];
  if (mapped) {
    return AVATAR_ITEMS.find(item => item.id === mapped);
  }

  return undefined;
}

export const AVATAR_ITEM_TYPES: AvatarItem['type'][] = ['background', 'face', 'frame'];

// expose the border style type so other parts of the app can reference it
export type BorderStyle = AvatarItem['borderStyle'];

/**
 * CSS helper result for frame rendering.  `style` contains inline
 * properties, `className` can be applied via `cn()`.
 */
export interface FrameCss {
  style?: CSSProperties;
  className?: string;
}

/**
 * Determine whether a style is drawn with an SVG overlay instead of a
 * normal border.  Currently zigzag, spiked and ornate use SVGs.
 */
export function needsSvgBorder(style?: BorderStyle): boolean {
  return style === 'zigzag'
    || style === 'spiked'
    || style === 'ornate'
    || style === 'zigzag-circle'
    || style === 'hexagon'
    || style === 'octagon'
    || style === 'diamond'
    || style === 'starburst'
    || style === 'scalloped'
    || style === 'bevel-edge'
    || style === 'rope-twist'
    || style === 'vine-wreath'
    || style === 'floral-rosette'
    || style === 'floral-daisy'
    || style === 'floral-lotus'
    || style === 'floral-baroque'
    || style === 'floral-wreath';
}

/**
 * Returns a polygon point string suitable for an SVG border.  Different
 * border styles produce different shapes; callers should only render an
 * SVG when `needsSvgBorder` returns true.
 */
export function makeBorderPoints(style?: BorderStyle, segments = 32): string {
  const pts: string[] = [];
  let segmentCount = segments;

  if (style === 'hexagon') segmentCount = 6;
  else if (style === 'octagon' || style === 'bevel-edge') segmentCount = 8;
  else if (style === 'diamond') segmentCount = 4;
  else if (style === 'starburst') segmentCount = 24;
  else if (style === 'floral-rosette' || style === 'floral-daisy') segmentCount = 24;
  else if (style === 'floral-lotus') segmentCount = 18;
  else if (style === 'floral-baroque') segmentCount = 28;
  else if (style === 'floral-wreath') segmentCount = 20;

  for (let i = 0; i < segmentCount; i++) {
    const angle = (Math.PI * 2 * i) / segmentCount - Math.PI / 2;
    let r: number;

    if (style === 'spiked') {
      // deeper inner radius creates long spikes
      r = i % 2 === 0 ? 48 : 20;
    } else if (style === 'zigzag' || style === 'zigzag-circle') {
      r = i % 2 === 0 ? 48 : 42;
    } else if (style === 'starburst') {
      r = i % 2 === 0 ? 48 : 34;
    } else if (style === 'scalloped') {
      r = 45 + 3 * Math.sin(angle * 8);
    } else if (style === 'rope-twist') {
      r = 46 + 2 * Math.sin(angle * 14);
    } else if (style === 'vine-wreath') {
      r = 44 + 4 * Math.sin(angle * 10);
    } else if (style === 'bevel-edge') {
      r = i % 2 === 0 ? 48 : 44;
    } else if (style === 'floral-rosette') {
      r = i % 2 === 0 ? 48 : 40;
    } else if (style === 'floral-daisy') {
      r = i % 2 === 0 ? 48 : 36;
    } else if (style === 'floral-lotus') {
      r = i % 3 === 0 ? 48 : 38;
    } else if (style === 'floral-baroque') {
      r = 44 + 4 * Math.sin(angle * 7) + 1.5 * Math.sin(angle * 14);
    } else if (style === 'floral-wreath') {
      r = 45 + 3 * Math.sin(angle * 10);
    } else if (style === 'ornate') {
      // gentle wavy pattern using a sine wave; keep radii close
      r = 46 + 2 * Math.sin(angle * 6);
    } else {
      // fallback circle
      r = 48;
    }

    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * Compute inline CSS (and occasionally helper class names) for a frame
 * avatar item.  Handles every borderStyle value that a frame can have.
 */
export function computeFrameCss(
  item: AvatarItem | undefined,
  borderWidth = 4,
  frameTint?: string
): FrameCss {
  if (!item || item.type !== 'frame') {
    return {};
  }

  const tint = frameTint || item.cssValue || '#000000';
  const css: CSSProperties = {};
  let className = '';

  switch (item.borderStyle) {
    case 'circle':
      css.border = `${borderWidth}px solid ${tint}`;
      break;
    case 'square':
      css.border = `${borderWidth}px solid ${tint}`;
      css.borderRadius = 0;
      break;
    case 'rounded-rectangle':
      css.border = `${borderWidth}px solid ${tint}`;
      css.borderRadius = 12;
      break;
    case 'zigzag-circle':
    case 'hexagon':
    case 'octagon':
    case 'diamond':
    case 'starburst':
    case 'scalloped':
    case 'bevel-edge':
    case 'rope-twist':
    case 'vine-wreath':
    case 'floral-rosette':
    case 'floral-daisy':
    case 'floral-lotus':
    case 'floral-baroque':
    case 'floral-wreath':
      break;
    case 'double-ring':
      css.border = `${Math.max(2, borderWidth - 1)}px double ${tint}`;
      break;
    case 'dashed-ring':
      css.border = `${borderWidth}px dashed ${tint}`;
      break;
    case 'dotted-ring':
      css.border = `${borderWidth}px dotted ${tint}`;
      break;
    case 'dashed':
    case 'dotted':
    case 'double':
    case 'solid':
    case undefined:
      css.border = `${borderWidth}px ${item.borderStyle || 'solid'} ${tint}`;
      break;
    case 'glow':
      css.boxShadow = `0 0 ${borderWidth * 2}px ${tint}`;
      break;
    case 'neon-pulse':
      css.boxShadow = `0 0 ${borderWidth * 2}px ${tint}`;
      className = 'animate-pulse-glow';
      break;
    case 'gradient-ring':
      css.border = `${borderWidth}px solid transparent`;
      css.borderImage = `${tint} 1`;
      break;
    case 'zigzag':
    case 'spiked':
    case 'ornate':
      // these styles are drawn with an SVG overlay; leave the normal
      // border empty and let the consumer render the polygon
      break;
    default:
      css.border = `${borderWidth}px solid ${tint}`;
  }

  return { style: css, className };
}

const LEGACY_FRAME_ID_MAP: Record<
  string,
  | 'frame_circle'
  | 'frame_zigzag_circle'
  | 'frame_square'
  | 'frame_floral_rosette'
  | 'frame_floral_daisy'
  | 'frame_floral_lotus'
  | 'frame_floral_baroque'
  | 'frame_floral_wreath'
> = {
  frame_bronze: 'frame_circle',
  frame_neon_pink: 'frame_circle',
  frame_neon_blue: 'frame_circle',
  frame_emerald: 'frame_circle',
  frame_ruby: 'frame_circle',
  frame_sapphire: 'frame_circle',
  frame_obsidian: 'frame_circle',
  frame_royal_purple: 'frame_circle',
  frame_minimal_white: 'frame_circle',
  frame_dashed_lime: 'frame_circle',
  frame_dotted_pink: 'frame_circle',
  frame_double_gold: 'frame_circle',
  frame_glow_cyan: 'frame_circle',
  frame_neon_red: 'frame_circle',
  frame_zigzag: 'frame_zigzag_circle',
  frame_spiked_crimson: 'frame_zigzag_circle',
  frame_spiked_crimson_2: 'frame_zigzag_circle',
  frame_ornate_royal: 'frame_zigzag_circle',
  frame_photo_floral: 'frame_floral_rosette',
  frame_photo_floral_corners: 'frame_floral_daisy',
  frame_photo_vintage: 'frame_floral_baroque',
  frame_photo_polaroid: 'frame_floral_lotus',
  frame_photo_filmstrip: 'frame_floral_wreath'
};
