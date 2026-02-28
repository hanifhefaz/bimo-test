import React, { useEffect, useMemo, useState } from 'react';
import Lottie from 'lottie-react';

type Props = {
  animationData?: any | string;
  size?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

const cache = new Map<string, any>();

// Neutral placeholder SVG (avoids using emojis)
function Placeholder({ size = 64 }: { size?: number | string }) {
  const s = typeof size === 'number' ? size : 64;
  return (
    <div style={{ width: s, height: s }} className="flex items-center justify-center">
      <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="100" height="100" rx="16" fill="url(#g)" />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#06d6a0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function PetAnimation({ animationData, size = 64, loop = true, autoplay = true, className = '' }: Props) {
  const [data, setData] = useState<any>(typeof animationData === 'string' ? null : animationData || null);

  useEffect(() => {
    setData(typeof animationData === 'string' ? null : animationData || null);
  }, [animationData]);

  // If animationData is a string (URL), fetch and cache it
  useEffect(() => {
    let mounted = true;
    async function fetchIfNeeded() {
      if (typeof animationData === 'string') {
        const url = animationData;
        if (cache.has(url)) {
          if (mounted) setData(cache.get(url));
          return;
        }
        try {
          const res = await fetch(url);
          const json = await res.json();
          cache.set(url, json);
          if (mounted) setData(json);
        } catch (err) {
          // fallback to neutral placeholder
          console.warn('Failed to load Lottie animation', err);
        }
      }
    }
    fetchIfNeeded();
    return () => { mounted = false; };
  }, [animationData]);

  const style: React.CSSProperties = useMemo(() => ({ width: typeof size === 'number' ? size : size, height: typeof size === 'number' ? size : size }), [size]);

  // Guard: treat invalid animation JSON (e.g., empty file) as missing
  if (!data || (typeof data === 'object' && !('layers' in data) && !('v' in data))) {
    // No valid animation JSON available — show neutral placeholder
    return (
      <div className={`flex items-center justify-center ${className}`} style={style}>
        <Placeholder size={style.width as number | string} />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} style={style}>
      <Lottie animationData={data} loop={loop} autoplay={autoplay} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
