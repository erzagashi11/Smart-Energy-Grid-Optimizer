'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SolveInput, SolveOutput, TrialTrace, FeasibilityStep } from '@/lib/types';
import { buildBasePowerDiff, diffToPower } from '@/lib/solver/powerUtils';
import { convertToMapData, ExcelMapMeta, ExcelPlantMapData, type PlantMapMarker } from '@/lib/mapUtils';
import SkylineChartCanvas from './SkylineChartCanvas';
import RangeOverlay from './RangeOverlay';
import TargetLine from './TargetLine';
import AddedLayer from './AddedLayer';
import AffectedCitiesLayer from './AffectedCitiesLayer';
import PlacementsOverlay from './PlacementsOverlay';
import DecisionExplanation from '../Explainability/DecisionExplanation';
import MapView from '../MapView/MapView';
import CleanMapView from '../MapView/CleanMapView';
import MapDrawer from '../MapView/MapDrawer';
import ViewToggle from '../MapView/ViewToggle';
import StepCard from './StepCard';
import FlowView from './FlowView';

import type { ComputedCityPower, ParsedPlantRow } from '@/lib/excel/excelMode';
import { computeCityPowersWithPlantPowers, cityDisplayName } from '@/lib/excel/excelMode';
import { allLatLngsInsideKosovoBounds } from '@/lib/geo/kosovoBounds';

/** When Excel mode is on, map/chart use uploaded city metadata alongside computed stations */
export type ExcelVisualizationContext = {
  excelMode: boolean;
  excelStrategy?: 'simple' | 'real';
  cityNames: string[];
  demands: number[];
  latLngs: Array<{ lat: number; lng: number }>;
  computedCities?: ComputedCityPower[];
  computedPlants?: ParsedPlantRow[];
};

interface VisualizationStageProps {
  input: SolveInput;
  output: SolveOutput | null;
  currentTrial: TrialTrace | undefined;
  currentStep: FeasibilityStep | undefined;
  /** Playback step index (preferred over indexOf on steps[]) so chart/map stay in sync */
  currentStepIndex?: number;
  heatmapMode?: boolean;
  explainMode?: boolean;
  viewMode?: 'chart' | 'map' | 'flow';
  onViewModeChange?: (mode: 'chart' | 'map') => void;
  showPlacementsOverlay?: boolean;
  onShowPlacementsOverlayChange?: (show: boolean) => void;
  excelContext?: ExcelVisualizationContext | null;
}

export default function VisualizationStage({
  input,
  output,
  currentTrial,
  currentStep,
  currentStepIndex: playbackStepIndex,
  heatmapMode = false,
  explainMode = false,
  viewMode: externalViewMode,
  onViewModeChange,
  showPlacementsOverlay: externalShowPlacementsOverlay,
  onShowPlacementsOverlayChange,
  excelContext = null,
}: VisualizationStageProps) {
  const [internalViewMode, setInternalViewMode] = useState<'chart' | 'map'>('chart');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  const [mapPowerStats, setMapPowerStats] = useState<any>(null);
  const [mapSelectedCity, setMapSelectedCity] = useState<any>(null);
  const [mapHoveredCity, setMapHoveredCity] = useState<any>(null);
  const [internalShowPlacementsOverlay, setInternalShowPlacementsOverlay] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const showPlacementsOverlay = externalShowPlacementsOverlay !== undefined 
    ? externalShowPlacementsOverlay 
    : internalShowPlacementsOverlay;
  const setShowPlacementsOverlay = onShowPlacementsOverlayChange || setInternalShowPlacementsOverlay;
  
  // Comparison slider state (0 = before, 100 = after)
  const [comparisonProgress, setComparisonProgress] = useState(100); // Default to after (final solution)

  const resolvedStepIndex = useMemo(() => {
    const steps = currentTrial?.steps;
    if (!steps?.length) return 0;
    const n = steps.length;
    if (typeof playbackStepIndex === 'number' && Number.isFinite(playbackStepIndex)) {
      const idx = Math.floor(playbackStepIndex);
      if (idx >= 0 && idx < n) return idx;
      if (idx >= n) return n - 1;
    }
    if (currentStep !== undefined) {
      const found = steps.indexOf(currentStep);
      if (found >= 0) return found;
    }
    return 0;
  }, [currentTrial, currentStep, playbackStepIndex]);

  // Check if we should show final solution
  // Show final solution if:
  // 1. We're at the last step of the last feasible trial, OR
  // 2. We have finalDistribution and no current step (instant solve)
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
    
    const currentTrialIndex = output.trials.indexOf(currentTrial);
    const isLastFeasibleTrial = currentTrialIndex === lastFeasibleTrialIndex;
    const isLastStep = resolvedStepIndex === currentTrial.steps.length - 1;
    
    return isLastFeasibleTrial && isLastStep && currentTrial.feasible;
  }, [output, currentTrial, currentStep, resolvedStepIndex]);

  const isExcelMode = !!excelContext?.excelMode;
  const effectiveR = isExcelMode ? 0 : input.r;

  /** Names for chart/overlays when Excel data covers all stations */
  const excelChartCityLabels = useMemo(() => {
    if (!excelContext?.excelMode || !excelContext.cityNames.length) return undefined;
    const n = input.stations.length;
    if (excelContext.cityNames.length < n) return undefined;
    return excelContext.cityNames.slice(0, n);
  }, [excelContext, input.stations.length]);

  const applyExcelSteps = (base: number[], steps: { add: number; placedAt: number | null; feasibleSoFar: boolean }[]) => {
    const result = [...base];
    for (const step of steps) {
      if (step.add > 0 && step.placedAt !== null && step.feasibleSoFar) {
        result[step.placedAt] += step.add;
      }
    }
    return result;
  };

  // Compute power distribution at current step
  const powerData = useMemo(() => {
    if (isExcelMode && output) {
      if (isAtFinalStep && output.finalDistribution) {
        return (output.finalDistribution as number[]).map((p) => Math.floor(p));
      }
      /* Simple + Real Excel: trial.steps = city-by-city scan (visit every city for chart/map) */
      if (!currentTrial || !currentStep) return (output.basePower || input.stations).map((p) => Math.floor(p));
      const stepIndex = resolvedStepIndex;
      const isLastStep = stepIndex === currentTrial.steps.length - 1;
      const stepsToApply = isLastStep && currentTrial.feasible ? stepIndex + 1 : stepIndex;
      return applyExcelSteps(
        (output.basePower || input.stations).map((p) => Math.floor(p)),
        currentTrial.steps.slice(0, stepsToApply)
      );
    }

    // Classic (manual) mode: diff-based
    if (isAtFinalStep) {
      if (output?.finalDistribution) return output.finalDistribution;
      if (output?.trials) {
        const lastFeasibleTrial = output.trials.filter((t) => t.feasible).pop();
        if (lastFeasibleTrial) {
          const diff = buildBasePowerDiff(input.stations, input.r);
          const n = input.stations.length;
          for (const step of lastFeasibleTrial.steps) {
            if (step.add > 0 && step.placedAt !== null && step.effectEnd !== null && step.feasibleSoFar) {
              const start = Math.max(0, step.placedAt - input.r);
              const end = Math.min(n, step.effectEnd);
              diff[start] += step.add;
              diff[end] -= step.add;
            }
          }
          return diffToPower(diff);
        }
      }
    }

    if (!output || !currentTrial || !currentStep) {
      return output?.finalDistribution || output?.basePower || input.stations;
    }

    const diff = buildBasePowerDiff(input.stations, input.r);
    const n = input.stations.length;
    const stepIndex = resolvedStepIndex;
    const isLastStep = stepIndex === currentTrial.steps.length - 1;
    const isFeasibleTrial = currentTrial.feasible;
    const stepsToApply = (isLastStep && isFeasibleTrial) ? currentTrial.steps.length : stepIndex;

    for (let idx = 0; idx < stepsToApply; idx++) {
      const step = currentTrial.steps[idx];
      if (step.add > 0 && step.placedAt !== null && step.effectEnd !== null && step.feasibleSoFar) {
        const start = Math.max(0, step.placedAt - input.r);
        const end = Math.min(n, step.effectEnd);
        diff[start] += step.add;
        diff[end] -= step.add;
      }
    }
    return diffToPower(diff);
  }, [output, currentTrial, currentStep, resolvedStepIndex, input.stations, input.r, isAtFinalStep, isExcelMode]);

  // Only show basePower overlay if not at final step
  const basePower = isAtFinalStep ? undefined : (output?.basePower || input.stations);
  
  // Calculate before and after power for comparison slider (only in final solution mode)
  const beforePower = useMemo(() => {
    if (!isAtFinalStep || !output) return null;
    const n = input.stations.length;
    const bp =
      output.basePower && output.basePower.length === n ? output.basePower : input.stations;
    if (!bp.length || bp.length !== n) return null;
    return bp.map((p) => Math.floor(Number(p)));
  }, [isAtFinalStep, output, input.stations]);

  const afterPower = useMemo(() => {
    if (!isAtFinalStep || !output) return null;
    const n = input.stations.length;
    if (output.finalDistribution && output.finalDistribution.length === n) {
      return output.finalDistribution.map((p) => Math.floor(Number(p)));
    }
    if (isExcelMode && output.trials) {
      const lastFeasibleTrial = output.trials.filter((t) => t.feasible).pop();
      if (lastFeasibleTrial?.steps?.length) {
        return applyExcelSteps(
          (output.basePower || input.stations).map((p) => Math.floor(p)),
          lastFeasibleTrial.steps
        );
      }
    }
    if (output.trials) {
      const lastFeasibleTrial = output.trials.filter((t) => t.feasible).pop();
      if (lastFeasibleTrial) {
        const diff = buildBasePowerDiff(input.stations, input.r);
        const n = input.stations.length;
        for (const step of lastFeasibleTrial.steps) {
          if (step.add > 0 && step.placedAt !== null && step.effectEnd !== null && step.feasibleSoFar) {
            const start = Math.max(0, step.placedAt - input.r);
            const end = Math.min(n, step.effectEnd);
            diff[start] += step.add;
            diff[end] -= step.add;
          }
        }
        return diffToPower(diff);
      }
    }
    return null;
  }, [isAtFinalStep, output, input.stations, input.r, isExcelMode]);
  
  // Interpolate power based on comparison slider (only in final solution mode)
  // For chart: smooth interpolation, for map: only before (0%) or after (100%)
  const interpolatedPowerData = useMemo(() => {
    if (!isAtFinalStep || !beforePower || !afterPower) {
      return powerData;
    }
    // Always use smooth interpolation for chart
    const progress = comparisonProgress / 100;
    return beforePower.map((before, i) => {
      const after = afterPower[i] ?? before;
      return Math.floor(before + (after - before) * progress);
    });
  }, [isAtFinalStep, beforePower, afterPower, comparisonProgress, powerData]);

  const excelMapMeta = useMemo((): ExcelMapMeta | null => {
    if (!excelContext?.excelMode) return null;
    const n = input.stations.length;
    const cc = excelContext.computedCities;

    let cityNames: string[];
    let demands: number[];
    let latLngs: Array<{ lat: number; lng: number }>;

    if (cc && cc.length === n) {
      cityNames = cc.map((c) => c.city_name);
      demands = cc.map((c) => c.demand);
      latLngs = cc.map((c) => ({ lat: c.lat, lng: c.lng }));
    } else if (
      excelContext.cityNames.length === n &&
      excelContext.demands.length === n &&
      excelContext.latLngs.length === n
    ) {
      cityNames = excelContext.cityNames;
      demands = excelContext.demands;
      latLngs = excelContext.latLngs;
    } else {
      return null;
    }

    let coveredBy = cc && cc.length === n ? cc.map((c) => c.covered_by) : undefined;
    if (
      excelContext.excelStrategy === 'real' &&
      output &&
      'plantKAllocations' in output &&
      excelContext.computedPlants?.length &&
      cc &&
      cc.length === n
    ) {
      const allocs = (output as { plantKAllocations?: number[] }).plantKAllocations ?? [];
      const plantPowers = excelContext.computedPlants.map((p, i) => Math.floor(p.power) + (allocs[i] ?? 0));
      const recomputed = computeCityPowersWithPlantPowers(cc, excelContext.computedPlants, plantPowers);
      coveredBy = recomputed.map((c) => c.covered_by);
    }
    return { cityNames, demands, latLngs, coveredBy };
  }, [excelContext, input.stations.length, output]);

  const excelPlantData = useMemo((): ExcelPlantMapData | null => {
    if (
      !excelContext?.excelMode ||
      !excelContext.computedPlants?.length ||
      excelContext.computedCities?.length !== input.stations.length
    ) {
      return null;
    }
    const plants = excelContext.computedPlants;
    const coveredCityCounts = plants.map((plant) =>
      excelContext.computedCities!.filter((c) => c.covered_by?.some((x) => x.plant_name === plant.plant_name)).length
    );
    const plantKAllocations =
      excelContext.excelStrategy === 'real' && output && 'plantKAllocations' in output
        ? (output as { plantKAllocations?: number[] }).plantKAllocations
        : undefined;
    return {
      plants: plants.map((p) => ({ plant_name: p.plant_name, lat: p.lat, lng: p.lng, power: p.power, radius: p.radius })),
      plantKAllocations,
      coveredCityCounts,
    };
  }, [excelContext, input.stations.length, output]);

  const excelPlantLatLngsForBounds = useMemo(
    () => excelPlantData?.plants.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [],
    [excelPlantData]
  );

  const showKosovoSvgOverlay = useMemo(() => {
    if (!excelContext?.excelMode || !excelMapMeta?.latLngs?.length) return false;
    return allLatLngsInsideKosovoBounds(excelMapMeta.latLngs);
  }, [excelContext?.excelMode, excelMapMeta]);

  const excelWeakestCityId = useMemo(() => {
    if (!excelContext?.excelMode) return undefined;
    const data = isAtFinalStep ? interpolatedPowerData : powerData;
    if (!data.length) return undefined;
    let min = Infinity;
    let idx = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) {
        min = data[i];
        idx = i;
      }
    }
    return idx;
  }, [excelContext?.excelMode, isAtFinalStep, interpolatedPowerData, powerData]);

  // Map data - show final state for instant solve, step state for trace solve
  const mapData = useMemo(() => {
    if (viewMode === 'map' && output) {
      // For instant solve (no trials, but has finalDistribution), show final state
      if (!currentTrial && !currentStep && output.finalDistribution) {
        // Show final solution with finalDistribution
        const baseMapData = convertToMapData(
          input,
          output,
          undefined, // no trial
          undefined, // no step
          output.answer, // target is the answer
          excelMapMeta,
          excelPlantData
        );
        
        // Apply interpolation if in final solution mode
        // For map: only before (0%) or after (100%), no smooth interpolation
        if (isAtFinalStep && beforePower && afterPower) {
          const useAfter = comparisonProgress >= 50;
          return {
            ...baseMapData,
            cities: baseMapData.cities.map((city, i) => ({
              ...city,
              power: useAfter ? afterPower[i] : beforePower[i],
            })),
          };
        }
        
        return baseMapData;
      }
      
      // When we have a current step, show the state BEFORE that step is applied
      // This means:
      // - Step 1 (index 0): Show state before step 1 (base power) - City 0 has base power (7)
      // - Step 2 (index 1): Show state after step 1 - City 0 has power 9 (7+2), City 1 has base power
      // - etc.
      // The current step's placement will be shown as "active placement" in CleanMapView
      // IMPORTANT: Always pass currentStep so we can show the active city and placement
      // convertToMapData will show state BEFORE current step, and CleanMapView will add activePlacementAdd
      // NO initial state preview - go directly to step 1 with City 0
      
      const baseMapData = convertToMapData(
        input,
        output,
        currentTrial,
        currentStep,
        currentTrial?.mid,
        excelMapMeta,
        excelPlantData,
        resolvedStepIndex
      );
      
      // Apply interpolation if in final solution mode
      // For map: only before (0%) or after (100%), no smooth interpolation
      if (isAtFinalStep && beforePower && afterPower) {
        const useAfter = comparisonProgress >= 50;
        return {
          ...baseMapData,
          cities: baseMapData.cities.map((city, i) => ({
            ...city,
            power: useAfter ? afterPower[i] : beforePower[i],
          })),
        };
      }
      
      return baseMapData;
    }
    return null;
  }, [viewMode, input, output, currentTrial, currentStep, resolvedStepIndex, isAtFinalStep, beforePower, afterPower, comparisonProgress, excelMapMeta, excelPlantData]);

  // Plant placements for Real mode (placements on plants, not cities)
  const plantPlacementsFromOutput = useMemo(() => {
    if (!output || excelContext?.excelStrategy !== 'real') return [];
    const pp = (output as { plantPlacements?: Array<{ plantIndex: number; addedPower: number }> }).plantPlacements;
    return pp ?? [];
  }, [output, excelContext?.excelStrategy]);

  // Calculate all placements from the last feasible trial (for placement history overlay)
  const allPlacements = useMemo(() => {
    if ((!output?.trials || output.trials.length === 0) && output?.finalDistribution && output?.answer !== undefined) {
      const placements: Array<{ cityId: number; addedPower: number }> = [];

      if (isExcelMode && excelContext?.excelStrategy !== 'real') {
        // Simple mode: direct city support
        const bp = output.basePower || input.stations;
        for (let i = 0; i < input.stations.length; i++) {
          const add = output.finalDistribution[i] - (bp[i] ?? 0);
          if (add > 0) placements.push({ cityId: i, addedPower: add });
        }
        return placements;
      }
      if (isExcelMode && excelContext?.excelStrategy === 'real') {
        return []; // Real mode uses plantPlacements, not city placements
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
    if (!output?.trials || output.trials.length === 0) return [];

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
  }, [output, input.stations, input.r, input.k, isExcelMode, excelContext?.excelStrategy]);

  // Auto-show placements for instant solve (no trials = instant solve)
  useEffect(() => {
    if (output && (!output.trials || output.trials.length === 0) && output.finalDistribution && allPlacements.length > 0) {
      setShowPlacementsOverlay(true);
    }
  }, [output, allPlacements.length]);

  // Calculate cities in range and affected cities for chart
  const citiesInRange = useMemo(() => {
    if (!currentStep || currentStep.i < 0) return [];
    const n = input.stations.length;
    const cities: number[] = [];
    for (let i = Math.max(0, currentStep.i - effectiveR); i <= Math.min(n - 1, currentStep.i + effectiveR); i++) {
      if (i !== currentStep.i) cities.push(i);
    }
    return cities;
  }, [currentStep, input.stations.length, effectiveR]);

  const activePlacementAffectedCities = useMemo(() => {
    if (!currentStep || currentStep.placedAt === null || currentStep.effectEnd === null) return [];
    const n = input.stations.length;
    const start = Math.max(0, currentStep.placedAt - effectiveR);
    const end = Math.min(n, currentStep.effectEnd);
    const cities: number[] = [];
    for (let i = start; i < end; i++) cities.push(i);
    return cities;
  }, [currentStep, input.stations.length, effectiveR]);

  // Track placement animation phase (same as in CleanMapView)
  const [placementAnimationPhase, setPlacementAnimationPhase] = useState<'before' | 'animating' | 'committed'>('before');
  
  useEffect(() => {
    // Only animate if step is feasible (has enough k remaining) and actually places a station
    if (currentStep && currentStep.add > 0 && currentStep.placedAt !== null && currentStep.feasibleSoFar && !isAtFinalStep) {
      setPlacementAnimationPhase('before');
      
      const animTimer = setTimeout(() => {
        setPlacementAnimationPhase('animating');
      }, 200);
      
      const commitTimer = setTimeout(() => {
        setPlacementAnimationPhase('committed');
      }, 1500);
      
      return () => {
        clearTimeout(animTimer);
        clearTimeout(commitTimer);
      };
    } else {
      setPlacementAnimationPhase('before');
    }
  }, [currentStep, isAtFinalStep]);

  // Determine current phase
  const currentPhase = useMemo(() => {
    if (isAtFinalStep) {
      return { icon: '✅', label: 'Final Solution', colorClass: 'accent-green' };
    }
    if (currentStep && currentTrial) {
      return { icon: '⚡', label: 'Feasibility Check', colorClass: 'accent-blue' };
    }
    if (output && !currentTrial && !currentStep) {
      return { icon: '🔍', label: 'Searching', colorClass: 'accent-orange' };
    }
    return null;
  }, [isAtFinalStep, currentStep, currentTrial, output]);

  return (
    <div>
      <div className="relative min-h-[450px] bg-dark-card/30 rounded-lg p-2">
        {/* Current Phase Indicator - only in chart view */}
        {viewMode === 'chart' && currentPhase && (
          <div className={`absolute top-2 left-1/2 transform -translate-x-1/2 z-30 glass-card px-3 py-1.5 rounded-lg border ${
            currentPhase.colorClass === 'accent-green' ? 'border-accent-green/50 bg-accent-green/10' :
            currentPhase.colorClass === 'accent-blue' ? 'border-accent-blue/50 bg-accent-blue/10' :
            'border-accent-orange/50 bg-accent-orange/10'
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span>{currentPhase.icon}</span>
              <span className={
                currentPhase.colorClass === 'accent-green' ? 'text-accent-green' :
                currentPhase.colorClass === 'accent-blue' ? 'text-accent-blue' :
                'text-accent-orange'
              }>{currentPhase.label}</span>
            </div>
          </div>
        )}
        
        {/* Comparison Slider - only in final solution mode (works for both chart and map) */}
        {isAtFinalStep && beforePower && afterPower && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 glass-card px-6 py-3 rounded-lg border border-accent-blue/50 bg-dark-card/95 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-4 min-w-[300px]">
              <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">Before</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={viewMode === 'map' ? (comparisonProgress < 50 ? 0 : 100) : comparisonProgress}
                  step={viewMode === 'map' ? 100 : 1}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (viewMode === 'map') {
                      setComparisonProgress(value < 50 ? 0 : 100);
                    } else {
                      setComparisonProgress(value);
                    }
                  }}
                  className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer comparison-slider"
                  style={{
                    background: viewMode === 'map' 
                      ? (comparisonProgress < 50 
                          ? 'linear-gradient(to right, rgba(255, 138, 101, 0.5) 0%, rgba(255, 138, 101, 0.5) 100%)'
                          : 'linear-gradient(to right, rgba(77, 160, 225, 0.3) 0%, rgba(77, 160, 225, 0.3) 100%)')
                      : `linear-gradient(to right, rgba(255, 138, 101, 0.5) 0%, rgba(255, 138, 101, 0.5) ${comparisonProgress}%, rgba(77, 160, 225, 0.3) ${comparisonProgress}%, rgba(77, 160, 225, 0.3) 100%)`
                  }}
                />
                <style dangerouslySetInnerHTML={{__html: `
                  .comparison-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: rgba(77, 160, 225, 0.9);
                    border: 2px solid white;
                    cursor: pointer;
                    box-shadow: 0 0 4px rgba(77, 160, 225, 0.6);
                  }
                  .comparison-slider::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: rgba(77, 160, 225, 0.9);
                    border: 2px solid white;
                    cursor: pointer;
                    box-shadow: 0 0 4px rgba(77, 160, 225, 0.6);
                  }
                `}} />
              </div>
              <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">After</span>
              {viewMode === 'chart' && (
                <span className="text-xs font-mono text-accent-blue min-w-[40px] text-right">{comparisonProgress}%</span>
              )}
            </div>
          </div>
        )}
        
        {viewMode === 'chart' ? (
          <>
            <div className="relative z-10">
              {/* Calculate unified maxPower for both canvas and target line */}
              {(() => {
                const targetValue = isAtFinalStep && output?.answer ? output.answer : currentTrial?.mid;

                return (
                  <>
                    <SkylineChartCanvas
                      powerData={isAtFinalStep ? interpolatedPowerData : powerData}
                      basePower={basePower}
                      n={input.stations.length}
                      heatmapMode={heatmapMode}
                      targetPower={targetValue}
                      activeCityId={isAtFinalStep ? undefined : currentStep?.i}
                      citiesInRange={isAtFinalStep ? [] : citiesInRange}
                      activePlacementAdd={isAtFinalStep ? 0 : (currentStep?.add || 0)}
                      activePlacementAffectedCities={isAtFinalStep ? [] : activePlacementAffectedCities}
                      placementAnimationPhase={isAtFinalStep ? 'before' : placementAnimationPhase}
                      allPlacements={isAtFinalStep && showPlacementsOverlay ? allPlacements : []}
                      cityLabels={excelChartCityLabels}
                    />
                  
                    {/* Overlays positioned relative to canvas - absolute positioning to match canvas bars */}
                    <div className="absolute inset-0 pointer-events-none">
                      {currentStep && !isAtFinalStep && currentStep.i >= 0 && (
                        <RangeOverlay
                          cityIndex={currentStep.i}
                          r={effectiveR}
                          n={input.stations.length}
                          placedAt={currentStep.placedAt !== null && currentStep.add > 0 ? currentStep.placedAt : -1}
                        />
                      )}
                    
                      {currentStep && !isAtFinalStep && currentStep.add > 0 && currentStep.placedAt !== null && currentStep.feasibleSoFar && (
                        <>
                          <AddedLayer
                            placedAt={currentStep.placedAt}
                            add={currentStep.add}
                            n={input.stations.length}
                            placementAnimationPhase={placementAnimationPhase}
                          />
                          <AffectedCitiesLayer
                            affectedCities={activePlacementAffectedCities}
                            add={currentStep.add}
                            n={input.stations.length}
                            placementAnimationPhase={placementAnimationPhase}
                          />
                        </>
                      )}
                                    
                      {/* Show placements overlay for final solution */}
                      {isAtFinalStep && showPlacementsOverlay && allPlacements.length > 0 && (
                        <PlacementsOverlay
                          placements={allPlacements}
                          n={input.stations.length}
                          cityLabels={excelChartCityLabels}
                        />
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        ) : viewMode === 'flow' && excelContext?.computedCities && excelContext?.computedPlants?.length ? (
          <FlowView
            cities={excelContext.computedCities}
            plants={excelContext.computedPlants}
            plantPowers={
              excelContext.excelStrategy === 'real' && output && 'plantKAllocations' in output
                ? excelContext.computedPlants.map(
                    (p, i) => p.power + ((output as { plantKAllocations?: number[] }).plantKAllocations?.[i] ?? 0)
                  )
                : excelContext.computedPlants.map((p) => p.power)
            }
            finalCityPowers={output?.finalDistribution}
            strategy={excelContext.excelStrategy ?? 'simple'}
          />
        ) : mapData ? (
          <div className="relative w-full h-full min-h-[500px]">
            <CleanMapView
              cities={mapData.cities}
              stations={mapData.stations.map((s) => ({
                ...s,
                isActivePlacement:
                  !isAtFinalStep &&
                  currentStep !== undefined &&
                  currentStep.placedAt !== null &&
                  currentStep.add > 0 &&
                  currentStep.feasibleSoFar &&
                  s.id === currentStep.placedAt &&
                  !(
                    currentTrial?.feasible &&
                    resolvedStepIndex === currentTrial.steps.length - 1
                  ),
              }))}
              plants={(mapData as { plants?: PlantMapMarker[] }).plants ?? []}
              excelMode={!!excelContext?.excelMode}
              weakestCityId={excelWeakestCityId}
              plantPlacements={excelContext?.excelStrategy === 'real' ? plantPlacementsFromOutput : []}
              activePlantPlacementId={
                excelContext?.excelStrategy === 'real' &&
                !isAtFinalStep &&
                currentStep?.plantPlacedAt !== undefined
                  ? currentStep.plantPlacedAt
                  : undefined
              }
              targetPower={isAtFinalStep && output?.answer ? output.answer : currentTrial?.mid}
              r={effectiveR}
              isFinalSolution={isAtFinalStep}
              finalAnswer={output?.answer}
              allPlacements={allPlacements}
              showPlacementsOverlay={showPlacementsOverlay}
              activeCityId={(() => {
                if (isAtFinalStep) return undefined;
                const isLastStepOfFeasible =
                  currentTrial?.feasible &&
                  resolvedStepIndex === currentTrial.steps.length - 1;
                if (isLastStepOfFeasible) return undefined;
                return currentStep?.i;
              })()}
              activePlacementStationId={(() => {
                if (isAtFinalStep) return undefined;
                const isLastStepOfFeasible =
                  currentTrial?.feasible &&
                  resolvedStepIndex === currentTrial.steps.length - 1;
                if (isLastStepOfFeasible) return undefined;
                return currentStep !== undefined &&
                  currentStep.placedAt !== null &&
                  currentStep.add > 0 &&
                  currentStep.feasibleSoFar
                  ? currentStep.placedAt
                  : undefined;
              })()}
              activePlacementAffectedCities={(() => {
                if (isAtFinalStep) return [];
                const isLastStepOfFeasible =
                  currentTrial?.feasible &&
                  resolvedStepIndex === currentTrial.steps.length - 1;
                if (isLastStepOfFeasible) return [];
                return currentStep !== undefined &&
                  currentStep.placedAt !== null &&
                  currentStep.effectEnd !== null &&
                  currentStep.feasibleSoFar
                  ? (() => {
                      const start = Math.max(0, currentStep.placedAt - effectiveR);
                      const end = Math.min(input.stations.length, currentStep.effectEnd);
                      const affected: number[] = [];
                      for (let i = start; i < end; i++) affected.push(i);
                      return affected;
                    })()
                  : [];
              })()}
              activePlacementAdd={(() => {
                if (isAtFinalStep) return 0;
                const isLastStepOfFeasible =
                  currentTrial?.feasible &&
                  resolvedStepIndex === currentTrial.steps.length - 1;
                if (isLastStepOfFeasible) return 0;
                return currentStep !== undefined && currentStep.add > 0 && currentStep.feasibleSoFar
                  ? currentStep.add
                  : 0;
              })()}
              mode={(() => {
                if (isAtFinalStep) return 'static';
                return currentStep !== undefined ? 'step' : 'static';
              })()}
              onCityClick={() => {}}
              onPowerStatsReady={setMapPowerStats}
              onCityHover={setMapHoveredCity}
              onCitySelect={setMapSelectedCity}
              showKosovoSvgOverlay={showKosovoSvgOverlay}
              excelLatLngs={excelMapMeta?.latLngs}
              excelPlantLatLngs={excelPlantLatLngsForBounds}
            />

            {/* Collapsible Drawer - Power Summary & City Info */}
            <MapDrawer
              selectedCity={mapSelectedCity}
              hoveredCity={mapHoveredCity}
              powerStats={mapPowerStats}
              targetPower={currentTrial?.mid}
              totalCities={input.stations.length}
              onCityClick={(id) => {
                // Could link to chart view here
              }}
            />
          </div>
        ) : null}
      </div>

      {isAtFinalStep ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-4 p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎉</span>
            <h3 className="text-lg font-semibold text-accent-green">Solution Complete!</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono mb-4">
            <div>
              <span className="text-text-secondary">Answer:</span>
              <div className="text-accent-blue font-bold text-lg">{output?.answer}</div>
            </div>
            <div>
              <span className="text-text-secondary">k Used:</span>
              <div className="text-accent-green font-bold text-lg">
                {output?.kUsed ?? currentTrial?.kUsed ?? 0} / {output?.k ?? 0}
              </div>
            </div>
            <div>
              <span className="text-text-secondary">Min Power:</span>
              <div className="text-text-primary font-bold text-lg">
                {Math.min(...powerData)}
              </div>
            </div>
            <div>
              <span className="text-text-secondary">Max Power:</span>
              <div className="text-text-primary font-bold text-lg">
                {Math.max(...powerData)}
              </div>
            </div>
          </div>
          {allPlacements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-accent-green/20 space-y-1 text-sm">
              <span className="text-text-secondary">Placements and their impact:</span>
              <div className="space-y-1 font-mono">
                {allPlacements.map(({ cityId, addedPower }) => {
                  const start = Math.max(0, cityId - effectiveR);
                  const end = Math.min(input.stations.length - 1, cityId + effectiveR);
                  const label = isExcelMode
                    ? cityDisplayName(excelContext?.cityNames, cityId)
                    : `City ${cityId}`;
                  return (
                    <div key={cityId} className="flex justify-between">
                      <span>
                        {label} (+{addedPower})
                      </span>
                      <span className="text-text-secondary">
                        affects cities [{start}–{end}]
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Each station raises coverage in its local interval; the global minimum is shaped by
                how these intervals overlap.
              </p>
            </div>
          )}
        </motion.div>
      ) : currentStep ? (
        <StepCard
          step={currentStep}
          stepIndex={resolvedStepIndex}
          totalSteps={currentTrial?.steps.length ?? 0}
          targetPower={currentTrial?.mid ?? 0}
          cityNames={excelContext?.cityNames}
        />
      ) : null}

      {explainMode && (
        <DecisionExplanation
          step={currentStep}
          r={effectiveR}
          n={input.stations.length}
        />
      )}
    </div>
  );
}
