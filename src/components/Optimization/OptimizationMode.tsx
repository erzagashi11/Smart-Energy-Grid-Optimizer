'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppState, SolveInput, PlaybackState } from '@/lib/types';
import { buildBasePowerDiff } from '@/lib/solver/powerUtils';
import ParamsPanel from '@/components/ParamsPanel/ParamsPanel';
import VisualizationStage, { ExcelVisualizationContext } from '@/components/Visualization/VisualizationStage';
import PlaybackControls from '@/components/Playback/PlaybackControls';
import BinarySearchDashboard from '@/components/Dashboard/BinarySearchDashboard';
import PerformancePanel from '@/components/Dashboard/PerformancePanel';
import ResultsPanel from '@/components/Results/ResultsPanel';
import ViewToggle from '@/components/MapView/ViewToggle';

interface OptimizationModeProps {
  input: SolveInput;
  output: AppState['output'];
  playback: PlaybackState | null;
  onInputChange: (input: Partial<SolveInput>) => void;
  onPlaybackChange: (playback: Partial<PlaybackState> | null) => void;
  onSolve: () => void;
  onSolveWithTrace: () => void;
  heatmapMode: boolean;
  onHeatmapModeChange: (enabled: boolean) => void;
  explainMode?: boolean;
  onExplainModeChange?: (enabled: boolean) => void;
  onExportPDF?: () => void;
  onExportJSON?: () => void;
  excelMode?: boolean;
  excelError?: string | null;
  excelInputKey?: number;
  excelContext?: ExcelVisualizationContext | null;
  excelStrategy?: 'simple' | 'real';
  onExcelStrategyChange?: (strategy: 'simple' | 'real') => void;
  onExcelCitiesFile?: (file: File | null) => void;
  onExcelPlantsFile?: (file: File | null) => void;
  onClearExcel?: () => void;
}

export default function OptimizationMode({
  input,
  output,
  playback,
  onInputChange,
  onPlaybackChange,
  onSolve,
  onSolveWithTrace,
  heatmapMode,
  onHeatmapModeChange,
  explainMode = false,
  onExplainModeChange,
  onExportPDF,
  onExportJSON,
  excelMode = false,
  excelError = null,
  excelInputKey = 0,
  excelContext = null,
  excelStrategy = 'simple',
  onExcelStrategyChange,
  onExcelCitiesFile,
  onExcelPlantsFile,
  onClearExcel,
}: OptimizationModeProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'map'>('chart');
  const [showPlacementsOverlay, setShowPlacementsOverlay] = useState(false);

  // Get current trial and step
  const currentTrialIndex = playback?.currentTrialIndex ?? 0;
  const currentStepIndex = playback?.currentStepIndex ?? 0;
  const currentTrial = output?.trials?.[currentTrialIndex];
  const currentStep = currentTrial?.steps?.[currentStepIndex];
  // Check if we're at the final solution
  const isAtFinalSolution = output?.trials && currentTrial && currentStep
    ? currentTrialIndex === output.trials.length - 1
      && currentStepIndex === currentTrial.steps.length - 1
      && currentTrial.feasible
    : false;
  
  // Check if we should show final solution (for instant solve or after all trials)
  const isAtFinalStep = useMemo(() => {
    if (!output) return false;
    
    // If no playback (instant solve), show final distribution
    if ((!currentTrial && !currentStep) || (!output.trials || output.trials.length === 0)) {
      if (output.finalDistribution) {
        return true;
      }
    }
    
    if (!output.trials || !currentTrial || !currentStep) return false;
    
    // Find the last feasible trial
    const lastFeasibleTrialIndex = output.trials
      .map((t, i) => ({ trial: t, index: i }))
      .filter(({ trial }) => trial.feasible)
      .pop()?.index;
    
    if (lastFeasibleTrialIndex === undefined) return false;
    
    const trialIdx = output.trials.indexOf(currentTrial);
    const isLastFeasibleTrial = trialIdx === lastFeasibleTrialIndex;
    const isLastStep = currentStepIndex === currentTrial.steps.length - 1;
    
    return isLastFeasibleTrial && isLastStep && currentTrial.feasible;
  }, [output, currentTrial, currentStep, currentStepIndex]);
  
  // Calculate all placements for final solution
  const allPlacements = useMemo(() => {
    if (!output) return [];

    if ((!output.trials || output.trials.length === 0) && output.finalDistribution && output.answer !== undefined) {
      const placements: Array<{ cityId: number; addedPower: number }> = [];

      if (excelMode) {
        const bp = output.basePower || input.stations;
        for (let i = 0; i < input.stations.length; i++) {
          const add = output.finalDistribution[i] - (bp[i] ?? 0);
          if (add > 0) placements.push({ cityId: i, addedPower: add });
        }
        return placements;
      }

      const n = input.stations.length;
      const r = input.r;
      const targetMin = output.answer;
      const diff = buildBasePowerDiff(input.stations, input.r);
      let sum = 0;
      let remaining = input.k;

      for (let i = 0; i < n; i++) {
        sum += diff[i];
        if (sum < targetMin) {
          const add = targetMin - sum;
          if (remaining >= add) {
            remaining -= add;
            const placedAt = Math.min(n - 1, i + r);
            const existing = placements.find((p) => p.cityId === placedAt);
            if (existing) existing.addedPower += add;
            else placements.push({ cityId: placedAt, addedPower: add });
            const start = Math.max(0, placedAt - r);
            const end = Math.min(n, placedAt + r + 1);
            diff[start] += add;
            diff[end] -= add;
            sum += add;
          }
        }
      }
      return placements;
    }
    
    // For trace solve (has trials)
    if (!output.trials || output.trials.length === 0) return [];
    
    // Find the last feasible trial
    const lastFeasibleTrial = output.trials
      .filter(t => t.feasible)
      .pop();
    
    if (!lastFeasibleTrial) return [];
    
    // Aggregate all placements from all steps of the last feasible trial
    const placements: Array<{ cityId: number; addedPower: number }> = [];
    
    lastFeasibleTrial.steps.forEach(step => {
      if (step.placedAt !== null && step.add > 0 && step.feasibleSoFar) {
        // Aggregate if same city
        const existing = placements.find(p => p.cityId === step.placedAt);
        if (existing) {
          existing.addedPower += step.add;
        } else {
          placements.push({
            cityId: step.placedAt,
            addedPower: step.add,
          });
        }
      }
    });
    
    return placements;
  }, [output, input.stations, input.r, input.k, excelMode]);
  
  // Auto-show placements for instant solve
  useEffect(() => {
    if (isAtFinalStep && allPlacements.length > 0 && (!output?.trials || output.trials.length === 0)) {
      setShowPlacementsOverlay(true);
    }
  }, [isAtFinalStep, allPlacements.length, output?.trials]);



  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-neon-blue mb-2">
            Optimization Mode – Maximize Minimum Power
          </h2>
          <p className="text-text-secondary">
            Use binary search to find the maximum achievable minimum power with the given constraints.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Inputs and Controls */}
        <div className="lg:col-span-3 space-y-6">
          <ParamsPanel
            input={input}
            onChange={onInputChange}
            onSolve={onSolve}
            onSolveWithTrace={onSolveWithTrace}
            excelMode={excelMode}
            excelError={excelError}
            excelInputKey={excelInputKey}
            excelStrategy={excelStrategy}
            onExcelStrategyChange={onExcelStrategyChange}
            onExcelCitiesFile={onExcelCitiesFile}
            onExcelPlantsFile={onExcelPlantsFile}
            onClearExcel={onClearExcel}
          />
        </div>

        {/* Center/Right - Visualization */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-neon-blue">City Power Skyline</h2>
              <div className="flex items-center gap-3">
                <ViewToggle
                  currentView={viewMode}
                  onViewChange={setViewMode}
                  showFlowTab={false}
                />
                {/* Show Placements button - only in final solution mode */}
                {isAtFinalStep && allPlacements.length > 0 && (
                  <button
                    onClick={() => setShowPlacementsOverlay(!showPlacementsOverlay)}
                    className="glass-card px-3 py-1.5 rounded-lg border border-accent-orange/50 hover:border-accent-orange transition-colors flex items-center gap-2 text-xs font-semibold shadow-md"
                  >
                    <span>Show Placements</span>
                    {showPlacementsOverlay && <span className="text-accent-orange">✓</span>}
                  </button>
                )}
              </div>
            </div>
            <VisualizationStage
              input={input}
              output={output}
              currentTrial={currentTrial}
              currentStep={currentStep}
              currentStepIndex={currentStepIndex}
              heatmapMode={heatmapMode}
              explainMode={explainMode}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showPlacementsOverlay={showPlacementsOverlay}
              onShowPlacementsOverlayChange={setShowPlacementsOverlay}
              excelContext={excelContext}
            />
          </div>

          {output?.trials && output.trials.length > 0 && (
            <PlaybackControls
              playback={playback}
              trials={output.trials}
              onChange={onPlaybackChange}
            />
          )}
        </div>

        {/* Right Column - Dashboard */}
        <div className="lg:col-span-3 space-y-6">
          <BinarySearchDashboard
            output={output}
            currentTrialIndex={currentTrialIndex}
            onTrialSelect={(index) => onPlaybackChange({ currentTrialIndex: index, currentStepIndex: 0 })}
          />
          <PerformancePanel
            output={output}
            input={{
              n: input.stations.length,
              r: input.r,
              k: input.k,
            }}
          />
        </div>
      </div>

      {/* Bottom - Results */}
      <div className="mt-6 space-y-6">
        <ResultsPanel output={output} cityNames={excelContext?.cityNames} />
      </div>
    </div>
  );
}
