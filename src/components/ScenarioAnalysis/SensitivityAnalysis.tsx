'use client';

import { useState, useMemo } from 'react';
import { runScenarioAnalysis } from '@/lib/solver/comparisonSolver';

interface SensitivityAnalysisProps {
  scenarioA: {
    stations: number[];
    r: number;
    k: number;
  };
  scenarioB: {
    stations: number[];
    r: number;
    k: number;
  };
}

export default function SensitivityAnalysis({ scenarioA, scenarioB }: SensitivityAnalysisProps) {
  const [kValue, setKValue] = useState(10);
  const [rValue, setRValue] = useState(2);

  // Generate k sensitivity data
  const kSensitivityData = useMemo(() => {
    const data: { k: number; minPower: number }[] = [];
    for (let k = 0; k <= 20; k++) {
      const result = runScenarioAnalysis(scenarioA.stations, scenarioA.r, k);
      data.push({ k, minPower: result.answer });
    }
    return data;
  }, [scenarioA.stations, scenarioA.r]);

  // Generate r sensitivity data
  const rSensitivityData = useMemo(() => {
    const data: { r: number; minPower: number }[] = [];
    for (let r = 1; r <= 5; r++) {
      const result = runScenarioAnalysis(scenarioA.stations, r, scenarioA.k);
      data.push({ r, minPower: result.answer });
    }
    return data;
  }, [scenarioA.stations, scenarioA.k]);

  const maxKPower = Math.max(...kSensitivityData.map(d => d.minPower));
  const maxRPower = Math.max(...rSensitivityData.map(d => d.minPower));
  const minKPower = Math.min(...kSensitivityData.map(d => d.minPower));
  const minRPower = Math.min(...rSensitivityData.map(d => d.minPower));

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold mb-4 text-neon-blue">Sensitivity Analysis</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            k (0 → 20): {kValue}
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={kValue}
            onChange={(e) => setKValue(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            r (1 → 5): {rValue}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={rValue}
            onChange={(e) => setRValue(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: k vs Minimum Power */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-text-primary">k vs Minimum Power</h4>
            <div className="relative h-64 bg-dark-card/30 rounded-lg p-4">
              <svg width="100%" height="100%" className="overflow-visible">
                {kSensitivityData.map((point, idx) => {
                  const x = (point.k / 20) * 100;
                  const y = 100 - ((point.minPower - minKPower) / (maxKPower - minKPower || 1)) * 100;
                  const nextPoint = kSensitivityData[idx + 1];
                  return (
                    <g key={point.k}>
                      {nextPoint && (
                        <line
                          x1={`${x}%`}
                          y1={`${y}%`}
                          x2={`${(nextPoint.k / 20) * 100}%`}
                          y2={`${100 - ((nextPoint.minPower - minKPower) / (maxKPower - minKPower || 1)) * 100}%`}
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-accent-blue"
                        />
                      )}
                      <circle
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="3"
                        fill="currentColor"
                        className="text-accent-blue"
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-text-secondary px-2">
                <span>0</span>
                <span>20</span>
              </div>
              <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between text-xs text-text-secondary py-2">
                <span>{maxKPower.toFixed(1)}</span>
                <span>{minKPower.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Chart 2: r vs Minimum Power */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-text-primary">r vs Minimum Power</h4>
            <div className="relative h-64 bg-dark-card/30 rounded-lg p-4">
              <svg width="100%" height="100%" className="overflow-visible">
                {rSensitivityData.map((point, idx) => {
                  const x = ((point.r - 1) / 4) * 100;
                  const y = 100 - ((point.minPower - minRPower) / (maxRPower - minRPower || 1)) * 100;
                  const nextPoint = rSensitivityData[idx + 1];
                  return (
                    <g key={point.r}>
                      {nextPoint && (
                        <line
                          x1={`${x}%`}
                          y1={`${y}%`}
                          x2={`${((nextPoint.r - 1) / 4) * 100}%`}
                          y2={`${100 - ((nextPoint.minPower - minRPower) / (maxRPower - minRPower || 1)) * 100}%`}
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-accent-green"
                        />
                      )}
                      <circle
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="3"
                        fill="currentColor"
                        className="text-accent-green"
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-text-secondary px-2">
                <span>1</span>
                <span>5</span>
              </div>
              <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between text-xs text-text-secondary py-2">
                <span>{maxRPower.toFixed(1)}</span>
                <span>{minRPower.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
