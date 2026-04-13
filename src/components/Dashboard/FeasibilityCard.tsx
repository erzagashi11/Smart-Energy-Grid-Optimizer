'use client';

import { motion } from 'framer-motion';

interface FeasibilityCardProps {
  feasible: boolean;
  kUsed: number;
  kTotal: number;
  minPower: number;
}

export default function FeasibilityCard({
  feasible,
  kUsed,
  kTotal,
  minPower,
}: FeasibilityCardProps) {
  return (
    <motion.div
      animate={{ 
        borderColor: feasible 
          ? 'rgba(102, 187, 106, 0.4)' 
          : 'rgba(255, 138, 101, 0.4)' 
      }}
      className="glass-card p-4 border-2 rounded-lg"
    >
      <h4 className="text-sm font-semibold mb-3 text-text-secondary">Feasibility Status</h4>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {feasible ? (
            <>
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-2xl"
              >
                ✅
              </motion.span>
              <span className="font-semibold text-accent-green text-base">Feasible</span>
            </>
          ) : (
            <>
              <span className="text-2xl">❌</span>
              <span className="font-semibold text-accent-orange text-base">Infeasible</span>
            </>
          )}
        </div>

        <div className="text-sm space-y-2 pt-2 border-t border-dark-border/30">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">k Used:</span>
            <span className="font-mono text-accent-blue font-semibold">{kUsed} / {kTotal}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Target Min:</span>
            <span className="font-mono text-text-primary font-semibold">{Math.floor(minPower)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
