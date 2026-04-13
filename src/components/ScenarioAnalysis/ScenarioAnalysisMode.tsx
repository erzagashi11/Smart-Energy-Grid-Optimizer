'use client';

import { useState, useCallback } from 'react';
import { SolveInput, ScenarioComparison, ComparisonMetrics } from '@/lib/types';
import { runScenarioAnalysis } from '@/lib/solver/comparisonSolver';
import { computeComparisonMetrics } from '@/lib/solver/comparisonSolver';
import ScenarioInputs from './ScenarioInputs';
import ComparisonResults from './ComparisonResults';
import SensitivityAnalysis from './SensitivityAnalysis';
import ScenarioVisualization from './ScenarioVisualization';

interface ScenarioAnalysisModeProps {
  input: SolveInput;
  onInputChange: (input: Partial<SolveInput>) => void;
  onComparisonChange?: (comparison: ComparisonMetrics | null) => void;
}

export default function ScenarioAnalysisMode({ input, onInputChange, onComparisonChange }: ScenarioAnalysisModeProps) {
  const [scenarioA, setScenarioA] = useState({
    name: 'Scenario A',
    stations: [...input.stations],
    r: input.r,
    k: input.k,
    result: null as any,
  });

  const [scenarioB, setScenarioB] = useState({
    name: 'Scenario B',
    stations: [...input.stations],
    r: input.r,
    k: input.k,
    result: null as any,
  });

  const [comparison, setComparison] = useState<ComparisonMetrics | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | 'both'>('both');

  const handleRunComparison = useCallback(() => {
    const resultA = runScenarioAnalysis(scenarioA.stations, scenarioA.r, scenarioA.k);
    const resultB = runScenarioAnalysis(scenarioB.stations, scenarioB.r, scenarioB.k);

    const scenarioComparison: ScenarioComparison = {
      scenarioA: {
        name: scenarioA.name,
        stations: scenarioA.stations,
        r: scenarioA.r,
        k: scenarioA.k,
        result: {
          answer: resultA.answer,
          basePower: [],
          trials: [],
          finalDistribution: resultA.finalDistribution,
          k: scenarioA.k,
          kUsed: resultA.kUsed,
        },
      },
      scenarioB: {
        name: scenarioB.name,
        stations: scenarioB.stations,
        r: scenarioB.r,
        k: scenarioB.k,
        result: {
          answer: resultB.answer,
          basePower: [],
          trials: [],
          finalDistribution: resultB.finalDistribution,
          k: scenarioB.k,
          kUsed: resultB.kUsed,
        },
      },
    };

    setScenarioA(prev => ({ ...prev, result: scenarioComparison.scenarioA.result }));
    setScenarioB(prev => ({ ...prev, result: scenarioComparison.scenarioB.result }));

    const metrics = computeComparisonMetrics(scenarioComparison);
    setComparison(metrics);
    onComparisonChange?.(metrics);
  }, [scenarioA, scenarioB, onComparisonChange]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-neon-blue mb-2">
            Scenario Analysis Mode
          </h2>
          <p className="text-text-secondary">
            Compare two different parameter configurations and analyze sensitivity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScenarioInputs
          title="Scenario A"
          scenario={scenarioA}
          onScenarioChange={setScenarioA}
          onCopyFrom={() => setScenarioA({ ...scenarioB, name: 'Scenario A' })}
        />
        <ScenarioInputs
          title="Scenario B"
          scenario={scenarioB}
          onScenarioChange={setScenarioB}
          onCopyFrom={() => setScenarioB({ ...scenarioA, name: 'Scenario B' })}
        />
      </div>

      <div className="glass-card p-6">
        <button
          onClick={handleRunComparison}
          className="w-full px-6 py-4 bg-gradient-to-r from-accent-blue to-neon-purple hover:from-accent-blue/80 hover:to-neon-purple/80 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
        >
          Run Comparison
        </button>
      </div>

      {comparison && (
        <>
          <ComparisonResults comparison={comparison} />
          <ScenarioVisualization
            input={input}
            scenarioA={scenarioA}
            scenarioB={scenarioB}
            selectedScenario={selectedScenario}
            onSelectedScenarioChange={setSelectedScenario}
          />
          <SensitivityAnalysis
            scenarioA={scenarioA}
            scenarioB={scenarioB}
          />
        </>
      )}
    </div>
  );
}
