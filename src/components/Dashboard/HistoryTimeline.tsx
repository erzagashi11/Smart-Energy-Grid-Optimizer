'use client';

import { motion } from 'framer-motion';
import { TrialTrace } from '@/lib/types';

interface HistoryTimelineProps {
  trials: TrialTrace[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export default function HistoryTimeline({
  trials,
  currentIndex,
  onSelect,
}: HistoryTimelineProps) {
  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-semibold mb-3 text-text-secondary">Trial History</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {trials.map((trial, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(index)}
            className={`w-full text-left p-3 rounded-lg transition-all border ${
              index === currentIndex
                ? 'bg-neon-blue/15 border-neon-blue/50 neon-glow-blue'
                : 'bg-dark-card/50 border-dark-border/50 hover:border-neon-blue/30 hover:bg-dark-card/70'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-secondary font-semibold">#{index + 1}</span>
                <span className="text-sm font-mono text-text-primary">mid = {Math.floor(trial.mid)}</span>
              </div>
              {trial.feasible ? (
                <span className="text-accent-green text-sm">✅</span>
              ) : (
                <span className="text-red-400 text-sm">❌</span>
              )}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              Bounds: [{Math.floor(trial.low)}, {Math.floor(trial.high)}] • k: {trial.kUsed}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
