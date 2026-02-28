import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface SpinReward {
  type: 'credits' | 'asset' | 'pet' | 'xp';
  amount?: number;
  assetId?: string;
  emoji: string;
  name: string;
  // optional weight for determining segment size; if omitted all segments are equal
  weight?: number;
}

interface Props {
  rewards: SpinReward[];
  rotation: number; // degrees
  spinning: boolean;
  size?: number; // px
  /** show textual names below emoji on each segment */
  showLabels?: boolean;
}

const COLORS = [
  '#7c3aed', // purple
  '#f97316', // orange
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#eab308', // yellow
];

export default function SpinWheel({ rewards, rotation, spinning, size = 320, showLabels = true }: Props) {
  // calculate total weight and per-segment angles
  const { gradient, centers, segments } = useMemo(() => {
    const totalWeight = rewards.reduce((s, r) => s + (r.weight ?? 1), 0);
    let angleAcc = 0;
    const stops: string[] = [];
    const centers: number[] = [];
    const segments: { start: number; end: number }[] = [];

    rewards.forEach((r, i) => {
      const w = (r.weight ?? 1) / totalWeight;
      const segAngle = w * 360;
      stops.push(`${COLORS[i % COLORS.length]} ${angleAcc}deg ${angleAcc + segAngle}deg`);
      centers.push(angleAcc + segAngle / 2);
      segments.push({ start: angleAcc, end: angleAcc + segAngle });
      angleAcc += segAngle;
    });

    return {
      gradient: `conic-gradient(${stops.join(',')})`,
      centers,
      segments,
    };
  }, [rewards]);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
        <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary shadow" />
      </div>

      {/* Wheel outer ring */}
      <motion.div
        style={{ rotate: rotation }}
        animate={{ rotate: rotation }}
        transition={{ duration: spinning ? 4 : 0.6, ease: spinning ? 'circOut' : 'easeOut' }}
        className="rounded-full shadow-2xl overflow-hidden"
      >
        <div
          className="rounded-full flex items-center justify-center relative"
          style={{
            width: size,
            height: size,
            background: gradient,
            border: '6px solid rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.25)'
          }}
        >
          {/* Labels placed at the CENTER of each segment (radially) */}
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pointer-events-none absolute inset-0">
            <g transform={`translate(${size / 2}, ${size / 2})`}>
              {rewards.map((r, i) => {
                // calculate center of the segment using the precomputed centers array
                const centerDeg = centers[i];
                const centerRad = (centerDeg - 90) * (Math.PI / 180); // shift 90° to point up
                // Place label at ~60% of the radius from center
                const labelRadius = (size / 2 - 6) * 0.6;
                const x = Math.cos(centerRad) * labelRadius;
                const y = Math.sin(centerRad) * labelRadius;

                // Rotate text so it points outward; use degree center
                const rotateDeg = centerDeg;

                return (
                  <g key={i} transform={`translate(${x}, ${y}) rotate(${rotateDeg})`}>
                    {showLabels && (
                    <text
                        x={0}
                        y={-15}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontSize={15}
                        fontWeight={600}
                        fill="#fff"
                    >
                        {r.name}
                    </text>
                    )}

                    <text
                    x={0}
                    y={10}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={32}
                    fontWeight={50}
                    >
                    {r.type === 'credits'
                        ? '💵'
                        : r.type === 'xp'
                        ? '⭐'
                        : r.emoji}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </motion.div>

      {/* Center medallion */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-white/90 to-white/70 flex items-center justify-center border border-white/20 shadow">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Tap to</div>
            <div className="font-bold text-lg">Spin</div>
          </div>
        </div>
      </div>
    </div>
  );
}
