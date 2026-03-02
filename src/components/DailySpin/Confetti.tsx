import React from 'react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#7c3aed', '#ec4899'];

export default function Confetti({ count = 24 }: { count?: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 6 + Math.random() * 10,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      endY: 300 + Math.random() * 200,
      duration: 1.6 + Math.random() * 0.8,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {pieces.map((piece) => {
        return (
          <motion.div
            key={piece.id}
            initial={{ opacity: 1, y: -20, rotate: piece.rotate, x: `${piece.left}%` }}
            animate={{ opacity: 0, y: piece.endY }}
            transition={{ duration: piece.duration, ease: 'easeOut' }}
            style={{ width: piece.size, height: piece.size, background: piece.color, left: `${piece.left}%` }}
            className="absolute rounded-sm"
          />
        );
      })}
    </div>
  );
}
