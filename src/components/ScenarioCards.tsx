'use client';

import { motion } from 'framer-motion';
import { Scenario } from '@/lib/types';
import { scenarios } from '@/lib/scenarios';

interface ScenarioCardsProps {
  selected: Scenario | null;
  onSelect: (scenario: Scenario) => void;
}

const colorClasses = {
  blue: 'border-neon-blue/50 hover:border-neon-blue neon-glow-blue',
  green: 'border-neon-green/50 hover:border-neon-green neon-glow-green',
  orange: 'border-neon-orange/50 hover:border-neon-orange neon-glow-orange',
};

export default function ScenarioCards({ selected, onSelect }: ScenarioCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {scenarios.map((scenario) => {
        const isSelected = selected?.name === scenario.name;
        return (
          <motion.div
            key={scenario.name}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(scenario)}
            className={`glass-card p-4 cursor-pointer transition-all ${
              colorClasses[scenario.color]
            } ${isSelected ? 'ring-2 ring-opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{scenario.name}</h3>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 rounded-full bg-current"
                />
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3">{scenario.description}</p>
            <div className="flex gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-500">n:</span> {scenario.stations.length}
              </div>
              <div>
                <span className="text-gray-500">r:</span> {scenario.r}
              </div>
              <div>
                <span className="text-gray-500">k:</span> {scenario.k}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
