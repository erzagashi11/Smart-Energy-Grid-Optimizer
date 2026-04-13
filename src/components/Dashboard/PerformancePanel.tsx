'use client';

import { motion } from 'framer-motion';
import { SolveOutput } from '@/lib/types';

interface PerformancePanelProps {
  output: SolveOutput | null;
  input: { n: number; r: number; k: number };
}

export default function PerformancePanel({ output, input }: PerformancePanelProps) {
  if (!output) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-neon-blue">Performance Metrics</h3>
        <p className="text-sm text-gray-400 mt-2">Run &quot;Solve & Visualize&quot; to see metrics.</p>
      </div>
    );
  }

  const n = output.n ?? input.n;
  const r = output.r ?? input.r;
  const k = input.k;
  const executionTime = output.executionTimeMs ?? undefined;

  // Calculate complexity estimate
  const complexityEstimate = `O(n log M) ≈ O(${n} × log(${Math.max(...(output.basePower || []), 1) + k}))`;

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold mb-4 text-neon-blue">Performance & Complexity</h3>
      
      <div className="space-y-3">
        <div className="p-3 bg-dark-card/50 rounded-lg border border-dark-border/30">
          <div className="text-xs text-text-secondary mb-1">Input Size</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Number of Cities (n)</span>
            <span className="font-mono font-bold text-accent-blue">{n}</span>
          </div>
        </div>

        <div className="p-3 bg-dark-card/50 rounded-lg border border-dark-border/30">
          <div className="text-xs text-text-secondary mb-1">Range Parameter</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Range Value (r)</span>
            <span className="font-mono font-bold text-accent-green">{r}</span>
          </div>
        </div>

        <div className="p-3 bg-dark-card/50 rounded-lg border border-dark-border/30">
          <div className="text-xs text-text-secondary mb-1">Additional Power</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">k Available</span>
            <span className="font-mono font-bold text-neon-purple">{k}</span>
          </div>
        </div>

        {executionTime !== undefined && (
          <div className="p-3 bg-dark-card/50 rounded-lg border border-dark-border/30">
            <div className="text-xs text-text-secondary mb-1">Execution Time</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Time (ms)</span>
              <span className="font-mono font-bold text-accent-green">
                {executionTime < 0.01 
                  ? '< 0.01' 
                  : executionTime.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-neon-blue/10 rounded-lg border border-neon-blue/30 mt-4"
        >
          <div className="text-xs text-text-secondary mb-1">Complexity Analysis</div>
          <div className="text-sm font-mono text-neon-blue">{complexityEstimate}</div>
          <div className="text-xs text-text-secondary mt-2">
            Each trial: O(n) feasibility check
            <br />
            Total: O(n log M) where M is the power range
          </div>
        </motion.div>
      </div>
    </div>
  );
}
