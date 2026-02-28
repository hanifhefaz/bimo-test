import React from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#7c3aed', '#ec4899'];

export default function Confetti({ count = 24 }: { count?: number }) {
  const pieces = Array.from({ length: count });

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const size = 6 + Math.random() * 10;
        const color = COLORS[i % COLORS.length];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, y: -20, rotate: Math.random() * 360, x: `${left}%` }}
            animate={{ opacity: 0, y: 300 + Math.random() * 200 }}
            transition={{ duration: 1.6 + Math.random() * 0.8, ease: 'easeOut' }}
            style={{ width: size, height: size, background: color, left: `${left}%` }}
            className="absolute rounded-sm"
          />
        );
      })}
    </div>
  );
}
