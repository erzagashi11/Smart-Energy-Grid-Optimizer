'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SolveOutput } from '@/lib/types';
import StepBreakdown from './StepBreakdown';
import { cityDisplayName } from '@/lib/excel/excelMode';

interface ResultsPanelProps {
  output: SolveOutput | null;
  /** Excel: show city names in distribution chips */
  cityNames?: string[];
}

export default function ResultsPanel({ output, cityNames }: ResultsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!output) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-neon-blue">Results</h3>
        <p className="text-sm text-gray-400 mt-2">Click &quot;Solve&quot; or &quot;Solve & Visualize&quot; to see results.</p>
      </div>
    );
  }

  // Calculate kUsed: prefer from output.kUsed (instant solve), otherwise from last feasible trial
  let kUsed = output.kUsed;
  if (kUsed === undefined) {
    const lastFeasibleTrial = output.trials
      .slice()
      .reverse()
      .find(trial => trial.feasible);
    kUsed = lastFeasibleTrial?.kUsed ?? 0;
  }

  // Calculate additional statistics
  const basePower = output.basePower || [];
  const finalDistribution = output.finalDistribution || basePower;
  const initialMin = basePower.length > 0 ? Math.min(...basePower) : 0;
  const finalMin = output.answer;
  const improvement = finalMin - initialMin;
  const improvementPercent = initialMin > 0 ? ((improvement / initialMin) * 100).toFixed(1) : '0';
  
  // Count cities at minimum
  const citiesAtMin = finalDistribution.filter(p => p === finalMin).length;
  
  // Calculate average power
  const avgPower = finalDistribution.length > 0 
    ? (finalDistribution.reduce((a, b) => a + b, 0) / finalDistribution.length).toFixed(1)
    : '0';

  // Get algorithm performance stats
  const totalTrials = output.trials.length;
  const feasibleTrials = output.trials.filter(t => t.feasible).length;
  const infeasibleTrials = totalTrials - feasibleTrials;

  return (
    <div className="glass-card p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-accent-green">Optimization Results</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 bg-dark-card/70 border border-dark-border/50 rounded-lg text-sm text-text-primary hover:border-accent-blue/50 transition-colors"
          >
            {expanded ? '▼' : '▶'} Details
          </motion.button>
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-5 bg-dark-card/60 rounded-lg border border-dark-border/50 shadow-sm">
            <div className="text-sm text-text-secondary mb-2">Maximum Minimum Power</div>
            <div className="text-3xl font-mono font-bold text-accent-blue">{output.answer}</div>
            <div className="text-xs text-text-muted mt-1">Achieved minimum coverage</div>
          </div>

          <div className="p-5 bg-dark-card/60 rounded-lg border border-dark-border/50 shadow-sm">
            <div className="text-sm text-text-secondary mb-2">Stations Used (k)</div>
            <div className="text-3xl font-mono font-bold text-accent-green">{kUsed}</div>
            <div className="text-xs text-text-muted mt-1">Additional stations deployed</div>
          </div>

          <div className="p-5 bg-dark-card/60 rounded-lg border border-dark-border/50 shadow-sm">
            <div className="text-sm text-text-secondary mb-2">Binary Search Trials</div>
            <div className="text-3xl font-mono font-bold text-neon-purple">{totalTrials}</div>
            <div className="text-xs text-text-muted mt-1">{feasibleTrials} feasible, {infeasibleTrials} infeasible</div>
          </div>
        </div>        

        {/* Power Distribution Summary */}
        <div className="mb-4 p-4 bg-dark-card/40 rounded-lg border border-dark-border/30">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">Final Power Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {finalDistribution.map((power, idx) => (
              <div 
                key={idx} 
                className={`px-2 py-1 rounded text-xs font-mono ${
                  power === finalMin 
                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400' 
                    : 'bg-dark-card/60 border border-dark-border/30 text-text-secondary'
                }`}
              >
                {cityNames ? `${cityDisplayName(cityNames, idx)}: ${power}` : `City ${idx}: ${power}`}
              </div>
            ))}
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <StepBreakdown output={output} cityNames={cityNames} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
