import { cn } from '@/lib/utils';
import { getAvatarItemById } from '@/lib/avatarItems';

interface AvatarItems {
  background?: string;
  face?: string;
  frame?: string;
}

interface CustomAvatarProps {
  avatar: string;
  imageUrl?: string;
  avatarItems?: AvatarItems;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-3xl'
};

// helper that generates a zigzag polygon around a 100x100 box
function makeZigzagPoints(segments = 32, outer = 48, inner = 42) {
  const pts: string[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (Math.PI * 2 * i) / segments;
    const r = i % 2 === 0 ? outer : inner;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

export function CustomAvatar({ avatar, imageUrl, avatarItems, size = 'md', className }: CustomAvatarProps) {
  // Resolve avatar item IDs to actual items when necessary
  const resolvedBg = avatarItems?.background ? getAvatarItemById(avatarItems.background) : undefined;
  const resolvedFace = avatarItems?.face ? getAvatarItemById(avatarItems.face) : undefined;
  const resolvedFrame = avatarItems?.frame ? getAvatarItemById(avatarItems.frame) : undefined;

  const bgStyle = resolvedBg?.cssValue ? { background: resolvedBg.cssValue } : undefined;
  const bgContent = resolvedBg?.emoji ?? (avatarItems?.background && !resolvedBg ? avatarItems.background : undefined);
  const faceContent = resolvedFace?.emoji ?? (avatarItems?.face && !resolvedFace ? avatarItems.face : undefined);

  // normal solid border style, used when we do not have a zigzag frame
  const frameStyle =
    resolvedFrame && resolvedFrame.borderStyle !== 'zigzag' && resolvedFrame.cssValue
      ? { border: `4px solid ${resolvedFrame.cssValue}` }
      : undefined;
  const frameContent = resolvedFrame?.emoji;

  const isZigzag = resolvedFrame?.borderStyle === 'zigzag';

  return (
    // outer wrapper holds the optional frame border; ensure it's always a circle
    // so the border follows the rounded background and avatar inside.
    <div
      className={cn('relative rounded-full overflow-hidden', sizeClasses[size], className)}
      style={frameStyle}
    >
      {isZigzag && resolvedFrame?.cssValue && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
        >
          <polygon
            points={makeZigzagPoints()}
            fill="none"
            stroke={resolvedFrame.cssValue}
            strokeWidth="4"
            strokeLinejoin="miter"
          />
        </svg>
      )}

      {frameContent && (
        <span className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
          {frameContent}
        </span>
      )}

      <div
        style={bgStyle}
        className="rounded-full flex items-center justify-center relative shrink-0 w-full h-full"
      >
        {/* Background layer (emoji fallback) */}
        {bgContent && (
          <span className="absolute inset-0 flex items-center justify-center opacity-30">
            {bgContent}
          </span>
        )}

        {/* Main avatar: prefer uploaded image, fallback to face item (if equipped), otherwise avatar emoji */}
        {imageUrl ? (
          <img src={imageUrl} alt="avatar" className="relative z-10 w-full h-full object-cover rounded-full" />
        ) : (
          <span className="relative z-10">{faceContent ?? avatar}</span>
        )}
      </div>
    </div>
  );
}
