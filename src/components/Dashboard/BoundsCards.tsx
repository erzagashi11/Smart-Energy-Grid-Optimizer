'use client';

import { motion } from 'framer-motion';

interface BoundsCardsProps {
  low: number;
  mid: number;
  high: number;
}

function int(n: number): number {
  return Math.floor(n);
}

export default function BoundsCards({ low, mid, high }: BoundsCardsProps) {
  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-semibold mb-3 text-text-secondary">Binary Search Bounds</h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-dark-card/50 rounded-lg border border-dark-border/30">
          <span className="text-sm text-text-secondary">Low</span>
          <span className="font-mono font-bold text-accent-blue text-lg">{int(low)}</span>
        </div>
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center justify-between p-3 bg-neon-blue/15 border border-neon-blue/40 rounded-lg neon-glow-blue"
        >
          <span className="text-sm font-semibold text-accent-blue">Mid (Testing)</span>
          <span className="font-mono font-bold text-accent-blue text-lg">{int(mid)}</span>
        </motion.div>
        <div className="flex items-center justify-between p-3 bg-dark-card/50 rounded-lg border border-dark-border/30">
          <span className="text-sm text-text-secondary">High</span>
          <span className="font-mono font-bold text-accent-green text-lg">{int(high)}</span>
        </div>
      </div>
    </div>
  );
}
