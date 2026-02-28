import { cn } from '@/lib/utils';
import {
  getAvatarItemById,
  computeFrameCss,
  needsSvgBorder,
  makeBorderPoints,
  BorderStyle
} from '@/lib/avatarItems';

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

// polygon points for zigzag/spiked/ornate borders are produced by the
// shared `makeBorderPoints` helper in avatarItems.ts; the old local
// zigzag helper has been removed.
export function CustomAvatar({ avatar, imageUrl, avatarItems, size = 'md', className }: CustomAvatarProps) {
  // Resolve avatar item IDs to actual items when necessary
  const resolvedBg = avatarItems?.background ? getAvatarItemById(avatarItems.background) : undefined;
  const resolvedFace = avatarItems?.face ? getAvatarItemById(avatarItems.face) : undefined;
  const resolvedFrame = avatarItems?.frame ? getAvatarItemById(avatarItems.frame) : undefined;

  const bgStyle = resolvedBg?.cssValue ? { background: resolvedBg.cssValue } : undefined;
  const bgContent = resolvedBg?.emoji ?? (avatarItems?.background && !resolvedBg ? avatarItems.background : undefined);
  const faceContent = resolvedFace?.emoji ?? (avatarItems?.face && !resolvedFace ? avatarItems.face : undefined);

  // compute whatever CSS and helper classes are needed for the frame
  const { style: frameStyle, className: frameClass } = computeFrameCss(resolvedFrame, 4);
  const frameContent = resolvedFrame?.emoji;

  const isSvgBorder = needsSvgBorder(resolvedFrame?.borderStyle);

  return (
    // outer wrapper holds the optional frame border; ensure it's always a circle
    // so the border follows the rounded background and avatar inside.
    <div
      className={cn('relative rounded-full overflow-hidden', sizeClasses[size], className, frameClass)}
      style={frameStyle}
    >
      {isSvgBorder && resolvedFrame?.cssValue && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
        >
          <polygon
            points={makeBorderPoints(resolvedFrame?.borderStyle as BorderStyle)}
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
