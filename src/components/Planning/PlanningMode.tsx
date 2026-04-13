'use client';

import { useState, useCallback } from 'react';
import { SolveInput, PlanningResult } from '@/lib/types';
import { computePlanningResult } from '@/lib/solver/planningSolver';
import PlanningInputs from './PlanningInputs';
import PlanningResults from './PlanningResults';
import PlanningVisualization from './PlanningVisualization';
interface PlanningModeProps {
  input: SolveInput;
  onInputChange: (input: Partial<SolveInput>) => void;
  /** When true, stations come from Excel uploads — keep array read-only in planning inputs */
  excelMode?: boolean;
  // External control props (when used in unified view)
  targetMin?: number;
  onTargetMinChange?: (value: number) => void;
  planningResult?: PlanningResult | null;
  onGeneratePlan?: () => void;
  onResultChange?: (result: PlanningResult | null) => void;
}

export default function PlanningMode({
  input,
  onInputChange,
  targetMin: externalTargetMin,
  onTargetMinChange,
  planningResult: externalResult,
  onGeneratePlan,
  onResultChange,
  excelMode = false,
}: PlanningModeProps) {
  // Internal state (for standalone use)
  const [internalTargetMin, setInternalTargetMin] = useState<number>(5);
  const [appliedTargetMin, setAppliedTargetMin] = useState<number>(5); // Only updates on Generate Plan
  const [internalResult, setInternalResult] = useState<PlanningResult | null>(null);

  // Use external values if provided, otherwise use internal state
  const targetMin = externalTargetMin ?? internalTargetMin;
  const setTargetMin = onTargetMinChange ?? setInternalTargetMin;
  const result = externalResult ?? internalResult;
  const setResult = (r: PlanningResult | null) => {
    setInternalResult(r);
    onResultChange?.(r);
  };

  const handleCalculate = useCallback(() => {
    const targetToUse = externalTargetMin ?? internalTargetMin;
    setAppliedTargetMin(targetToUse);
    
    if (onGeneratePlan) {
      onGeneratePlan();
    } else {
      const planningResult = computePlanningResult(
        input.stations,
        input.r,
        targetToUse,
        null
      );
      setResult(planningResult);
    }
  }, [input.stations, input.r, externalTargetMin, internalTargetMin, onGeneratePlan, setResult]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div>
          <h2 className="text-2xl font-bold text-neon-purple mb-2">
            Planning Mode
          </h2>
          <p className="text-text-secondary text-sm">
            Given a target minimum power, find the required stations and recommended placements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Planning Inputs */}
        <div className="lg:col-span-3 space-y-6">
          <PlanningInputs
            input={input}
            onInputChange={onInputChange}
            targetMin={targetMin}
            onTargetMinChange={setTargetMin}
            onCalculate={handleCalculate}
            planningResult={result}
            excelMode={excelMode}
          />
        </div>

        {/* Center Panel - Visualization */}
        <div className="lg:col-span-6 space-y-4">
          <PlanningVisualization
            input={input}
            result={result}
            targetMin={appliedTargetMin}
            excelMode={excelMode}
          />
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-3 space-y-6">
          <PlanningResults
            result={result}
            targetMin={appliedTargetMin}
            stations={input.stations}
          />
        </div>
      </div>
    </div>
  );
}
