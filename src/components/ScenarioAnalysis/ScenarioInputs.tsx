'use client';

import { SolveInput } from '@/lib/types';
import StationsEditor from '../ParamsPanel/StationsEditor';

interface ScenarioInputsProps {
  title: string;
  scenario: {
    name: string;
    stations: number[];
    r: number;
    k: number;
    result: any;
  };
  onScenarioChange: (scenario: any) => void;
  onCopyFrom: () => void;
}

export default function ScenarioInputs({
  title,
  scenario,
  onScenarioChange,
  onCopyFrom,
}: ScenarioInputsProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-neon-blue">{title}</h3>
        <button
          onClick={onCopyFrom}
          className="px-3 py-1.5 text-sm bg-dark-card hover:bg-dark-card/80 border border-dark-border rounded-lg transition-colors"
        >
          Copy from {title === 'Scenario A' ? 'B' : 'A'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Range (r)</label>
          <div className="flex gap-2">
            <input
              type="range"
              min="1"
              max="5"
              value={scenario.r}
              onChange={(e) => onScenarioChange({ ...scenario, r: parseInt(e.target.value) })}
              className="flex-1"
            />
            <input
              type="number"
              min="1"
              max="5"
              value={scenario.r}
              onChange={(e) => onScenarioChange({ ...scenario, r: parseInt(e.target.value) || 1 })}
              className="w-16 px-2 py-1 bg-dark-card border border-dark-border rounded text-white font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Additional Stations (k)</label>
          <input
            type="number"
            min="0"
            max="20"
            value={scenario.k}
            onChange={(e) => onScenarioChange({ ...scenario, k: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-white font-mono"
          />
        </div>

        <StationsEditor
          stations={scenario.stations}
          onChange={(stations) => onScenarioChange({ ...scenario, stations })}
        />
      </div>
    </div>
  );
}
