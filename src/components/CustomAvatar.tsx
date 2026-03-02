import { cn } from '@/lib/utils';
import {
  getAvatarItemById,
  computeFrameCss,
  needsSvgBorder,
  makeBorderPoints
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

  const faceContent = resolvedFace?.emoji ?? (avatarItems?.face && !resolvedFace ? avatarItems.face : undefined);
  const frameShapeClass = isRectFrameStyle(resolvedFrame?.borderStyle) ? 'rounded-lg' : 'rounded-full';
  const frameStrokeColor = resolveFrameStrokeColor(resolvedBg?.cssValue);

  // compute whatever CSS and helper classes are needed for the frame
  const { style: frameStyle, className: frameClass } = computeFrameCss(resolvedFrame, 4, frameStrokeColor);

  const isSvgBorder = needsSvgBorder(resolvedFrame?.borderStyle);

  return (
    <div
      className={cn('relative overflow-hidden', frameShapeClass, sizeClasses[size], className, frameClass)}
      style={frameStyle}
    >
      {isSvgBorder && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
        >
          <polygon
            points={makeBorderPoints(resolvedFrame?.borderStyle)}
            strokeWidth="4"
            strokeLinejoin="miter"
            fill="none"
            stroke={frameStrokeColor}
          />
        </svg>
      )}

      <div
        className={cn('flex items-center justify-center relative shrink-0 w-full h-full', frameShapeClass)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="avatar" className={cn('relative z-10 w-full h-full object-cover', frameShapeClass)} />
        ) : (
          <span className="relative z-10">{faceContent ?? avatar}</span>
        )}
      </div>
    </div>
  );
}

function resolveFrameStrokeColor(backgroundCss?: string): string {
  if (!backgroundCss) return '#000000';
  const firstColor = backgroundCss.match(/#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)|hsla?\([^)]+\)/)?.[0];
  return firstColor || '#000000';
}

function isRectFrameStyle(style?: string): boolean {
  return style === 'square'
    || style === 'rounded-rectangle';
}
