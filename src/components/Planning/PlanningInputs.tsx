'use client';

import { SolveInput, PlanningResult } from '@/lib/types';

interface PlanningInputsProps {
  input: SolveInput;
  onInputChange: (input: Partial<SolveInput>) => void;
  targetMin: number;
  onTargetMinChange: (value: number) => void;
  onCalculate: () => void;
  planningResult?: PlanningResult | null;
  excelMode?: boolean;
}

export default function PlanningInputs({
  input,
  onInputChange,
  targetMin,
  onTargetMinChange,
  onCalculate,
  planningResult,
  excelMode = false,
}: PlanningInputsProps) {
  return (
    <div className="space-y-4 sticky top-4">
      {/* PLANNING MODE Header */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-neon-purple"></div>
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Planning Mode</span>
        </div>
        <p className="text-xs text-text-secondary">
          Determine the minimum resources needed to reach your target
        </p>
      </div>

      {/* Stations Array */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-3 text-green-400">Stations Array</h3>
        
        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-2">Number of Cities (n)</label>
          <div className="px-3 py-2 bg-dark-card border border-dark-border rounded text-white font-mono">
            {input.stations.length}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-2">Stations (comma-separated)</label>
          {excelMode && (
            <p className="text-xs text-amber-400/90 mb-2">Excel mode: edit stations from Optimizer Excel panel or clear uploads.</p>
          )}
          <textarea
            value={input.stations.join(', ')}
            onChange={(e) => {
              const values = e.target.value.split(',').map(v => parseInt(v.trim()) || 0).filter(v => !isNaN(v));
              onInputChange({ stations: values });
            }}
            disabled={excelMode}
            className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-white font-mono text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
          />
          <p className="text-xs text-green-400 mt-1">✓ {input.stations.length} stations entered</p>
        </div>
      </div>

      {/* Coverage Range */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-3 text-neon-blue">
          Coverage Range (r)
          {excelMode && (
            <span className="ml-2 text-amber-400/90 text-xs font-normal">— not used in Excel mode</span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, input.stations.length - 1)}
            value={input.r}
            onChange={(e) => onInputChange({ r: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={excelMode}
          />
          <span className={`w-8 text-center font-mono ${excelMode ? 'text-amber-400/80' : 'text-white'}`}>
            {input.r}
          </span>
        </div>
      </div>

      {/* Target Minimum Power */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-3 text-neon-purple">Target Minimum Power</h3>
        <p className="text-xs text-text-secondary mb-3">
          The minimum power level you want to achieve in all cities
        </p>
        <input
          type="number"
          min="1"
          value={targetMin}
          onChange={(e) => onTargetMinChange(parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-white font-mono text-lg"
        />
      </div>

      {/* Generate Plan Button */}
      <div className="glass-card p-4">
        <button
          onClick={onCalculate}
          disabled={input.stations.length === 0}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
        >
          Generate Plan
        </button>
      </div>

      {/* Quick Summary - Only shown after Generate Plan is clicked */}
      {planningResult && (
        <div className="glass-card p-4 border border-neon-purple/30">
          <h3 className="text-sm font-semibold mb-3 text-neon-purple">Quick Summary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Stations Needed:</span>
              <span className="font-mono font-semibold text-white">{planningResult.kMin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Feasible:</span>
              <span className={planningResult.feasible ? 'text-green-400' : 'text-red-400'}>
                {planningResult.feasible ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Min Achieved:</span>
              <span className="font-mono text-white">{planningResult.minimumAchieved}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
