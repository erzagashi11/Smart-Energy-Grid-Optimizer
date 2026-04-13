'use client';

import { motion } from 'framer-motion';

interface TargetLineProps {
  target: number;
  maxPower: number;
}

export default function TargetLine({ target, maxPower }: TargetLineProps) {
  const yPercent = 100 - (target / maxPower) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute left-0 right-0 border-t-2 border-dashed border-neon-orange"
      style={{
        top: `${yPercent}%`,
        pointerEvents: 'none',
      }}
    >
      {/* Left side marker - connects to y-axis label */}
      <div className="absolute -left-[60px] -top-[10px] flex items-center gap-1">
        <div className="w-3 h-0.5 bg-neon-orange"></div>
        <div className="text-xs font-mono text-neon-orange font-bold">{target}</div>
      </div>
      
      {/* Right side label */}
      <div className="absolute right-0 -top-3 bg-dark-card px-2 py-1 rounded text-xs font-mono text-neon-orange border border-neon-orange/50">
        Target: {target}
      </div>
    </motion.div>
  );
}
