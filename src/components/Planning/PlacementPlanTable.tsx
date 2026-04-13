'use client';

import { PlacementPlan } from '@/lib/types';
import { motion } from 'framer-motion';

interface PlacementPlanTableProps {
  placementPlan: PlacementPlan[];
}

export default function PlacementPlanTable({ placementPlan }: PlacementPlanTableProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-neon-blue">Placement Plan</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-2 px-3 text-text-secondary">#</th>
              <th className="text-left py-2 px-3 text-text-secondary">Placement Index</th>
              <th className="text-left py-2 px-3 text-text-secondary">Added Power</th>
              <th className="text-left py-2 px-3 text-text-secondary">Coverage Interval</th>
              <th className="text-left py-2 px-3 text-text-secondary">Cities Improved</th>
            </tr>
          </thead>
          <tbody>
            {placementPlan.map((plan, idx) => (
              <motion.tr
                key={plan.index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-dark-border/30 hover:bg-dark-card/50 transition-colors"
              >
                <td className="py-2 px-3 font-mono">{plan.index}</td>
                <td className="py-2 px-3 font-mono text-accent-blue">{plan.placementIndex}</td>
                <td className="py-2 px-3 font-mono text-accent-green">+{plan.addedPower}</td>
                <td className="py-2 px-3 font-mono text-text-primary">
                  [{plan.coverageInterval[0]}–{plan.coverageInterval[1]}]
                </td>
                <td className="py-2 px-3 text-text-primary">{plan.citiesImproved.length}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
