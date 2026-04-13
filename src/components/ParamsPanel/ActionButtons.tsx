'use client';

import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onSolve: () => void;
  onSolveWithTrace: () => void;
  disabled?: boolean;
}

export default function ActionButtons({ onSolve, onSolveWithTrace, disabled = false }: ActionButtonsProps) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold mb-4 text-neon-orange">Actions</h3>
      <div className="space-y-3">
        <motion.button
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={onSolve}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-lg font-semibold ${
            disabled
              ? 'bg-dark-card/50 border border-dark-border text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-neon-blue to-neon-purple neon-glow-blue'
          }`}
        >
          Solve (Instant)
        </motion.button>
        <motion.button
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={onSolveWithTrace}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-lg font-semibold ${
            disabled
              ? 'bg-dark-card/50 border border-dark-border text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-neon-green to-neon-blue neon-glow-green'
          }`}
        >
          Solve & Visualize
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg font-semibold text-gray-300 hover:border-neon-blue transition-colors"
        >
          Reset
        </motion.button>
      </div>
    </div>
  );
}
