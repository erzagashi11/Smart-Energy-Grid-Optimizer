'use client';

import { ComparisonMetrics } from '@/lib/types';
import { motion } from 'framer-motion';

interface ComparisonResultsProps {
  comparison: ComparisonMetrics;
}

export default function ComparisonResults({ comparison }: ComparisonResultsProps) {
  const metrics = [
    { label: 'Minimum Power', a: comparison.minimumPower.a, b: comparison.minimumPower.b, format: (v: number) => v.toFixed(1) },
    { label: 'Mean Power', a: comparison.meanPower.a, b: comparison.meanPower.b, format: (v: number) => v.toFixed(2) },
    { label: 'Standard Deviation', a: comparison.standardDeviation.a, b: comparison.standardDeviation.b, format: (v: number) => v.toFixed(2) },
    { label: 'Budget Used', a: comparison.budgetUsed.a, b: comparison.budgetUsed.b, format: (v: number) => v.toString() },
    { label: 'Fairness Score', a: comparison.fairnessScore.a, b: comparison.fairnessScore.b, format: (v: number) => v.toFixed(3) },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold mb-4 text-neon-blue">Comparison Results</h3>
      
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-3 px-4 text-text-secondary">Metric</th>
              <th className="text-left py-3 px-4 text-text-secondary">Scenario A</th>
              <th className="text-left py-3 px-4 text-text-secondary">Scenario B</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, idx) => {
              const winner = metric.a > metric.b ? 'a' : metric.b > metric.a ? 'b' : null;
              return (
                <motion.tr
                  key={metric.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border-b border-dark-border/30 hover:bg-dark-card/50 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold">{metric.label}</td>
                  <td className={`py-3 px-4 font-mono ${winner === 'a' ? 'text-accent-green' : ''}`}>
                    {metric.format(metric.a)}
                  </td>
                  <td className={`py-3 px-4 font-mono ${winner === 'b' ? 'text-accent-green' : ''}`}>
                    {metric.format(metric.b)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-accent-blue/10 border border-accent-blue/50 rounded-lg"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="font-semibold text-accent-blue mb-1">Recommendation</div>
            <div className="text-text-primary">{comparison.recommendation}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
