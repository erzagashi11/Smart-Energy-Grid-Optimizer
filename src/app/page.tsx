'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, SolveInput, PlaybackState, AppMode, PlanningResult } from '@/lib/types';
import { solveWithTrace } from '@/lib/solver/traceSolver';
import { maxPower, computeFinalDistribution } from '@/lib/solver/maxPower';
import {
  maxPowerExcel,
  solveWithTraceExcel,
  computeFinalDistributionExcel,
  computePlanningResultExcel,
} from '@/lib/solver/excelSolver';
import { solveRealMode, solveWithTraceReal } from '@/lib/solver/excelRealSolver';
import { buildBasePowerDiff, diffToPower } from '@/lib/solver/powerUtils';
import { computePlanningResult } from '@/lib/solver/planningSolver';
import { exportToPDF, exportToJSON } from '@/lib/exportUtils';
import HeaderBar from '@/components/HeaderBar';
import OptimizationMode from '@/components/Optimization/OptimizationMode';
import PlanningMode from '@/components/Planning/PlanningMode';
import {
  parseCitiesExcel,
  parsePlantsExcel,
  validateCitiesData,
  validatePlantsData,
  computeCityPowers,
  buildStationsArrayFromCities,
  type ComputedCityPower,
  type ParsedPlantRow,
} from '@/lib/excel/excelMode';
import type { ExcelVisualizationContext } from '@/components/Visualization/VisualizationStage';

const initialOptimizationState: AppState = {
  input: {
    stations: [4, 2, 1, 3, 5, 2, 4, 3, 1, 2],
    r: 2,
    k: 5,
    mode: 'optimal',
    trace: false,
  },
  output: null,
  playback: null,
  selectedScenario: null,
};

export default function Home() {
  // Optimization simulator state
  const [optimizationState, setOptimizationState] = useState<AppState>(initialOptimizationState);
  
  // Extended mode state for Optimizer/Planning toggle
  const [viewMode, setViewMode] = useState<'optimizer' | 'planning'>('optimizer');
  
  // Planning mode state
  const [targetMin, setTargetMin] = useState<number>(5);
  const [planningResult, setPlanningResult] = useState<PlanningResult | null>(null);
  
  const [currentMode, setCurrentMode] = useState<AppMode>('optimization');
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [optimizationExplainMode, setOptimizationExplainMode] = useState(false);

  const [excelMode, setExcelMode] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelStrategy, setExcelStrategy] = useState<'simple' | 'real'>('simple');
  const [computedCities, setComputedCities] = useState<ComputedCityPower[] | null>(null);
  const [computedPlants, setComputedPlants] = useState<ParsedPlantRow[] | null>(null);
  const [excelInputKey, setExcelInputKey] = useState(0);
  const manualStationsBackupRef = useRef<number[]>(initialOptimizationState.input.stations);
  const citiesFileRef = useRef<File | null>(null);
  const plantsFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!excelMode) {
      manualStationsBackupRef.current = [...optimizationState.input.stations];
    }
  }, [excelMode, optimizationState.input.stations]);

  const excelContext: ExcelVisualizationContext | null = useMemo(() => {
    if (!excelMode || !computedCities?.length) return null;
    return {
      excelMode: true,
      excelStrategy,
      cityNames: computedCities.map((c) => c.city_name),
      demands: computedCities.map((c) => c.demand),
      latLngs: computedCities.map((c) => ({ lat: c.lat, lng: c.lng })),
      computedCities,
      computedPlants: computedPlants ?? [],
    };
  }, [excelMode, excelStrategy, computedCities, computedPlants]);

  const clearExcel = useCallback(() => {
    citiesFileRef.current = null;
    plantsFileRef.current = null;
    setExcelInputKey((k) => k + 1);
    setComputedCities(null);
    setComputedPlants(null);
    setExcelError(null);
    setExcelMode(false);
    setOptimizationState((prev) => ({
      ...prev,
      input: { ...prev.input, stations: [...manualStationsBackupRef.current] },
      output: null,
      playback: null,
    }));
  }, []);

  const processExcelPair = useCallback(async (cities: File, plants: File) => {
    setExcelError(null);
    try {
      const rawC = await parseCitiesExcel(cities);
      const rawP = await parsePlantsExcel(plants);
      const vC = validateCitiesData(rawC);
      if (!vC.ok) {
        setExcelError(vC.error);
        return;
      }
      const vP = validatePlantsData(rawP);
      if (!vP.ok) {
        setExcelError(vP.error);
        return;
      }
      const computed = computeCityPowers(vC.rows, vP.rows);
      const stations = buildStationsArrayFromCities(computed);
      setComputedPlants(vP.rows);
      setOptimizationState((prev) => ({
        ...prev,
        input: { ...prev.input, stations },
        output: null,
        playback: null,
      }));
      setComputedCities(computed);
      setExcelMode(true);
    } catch (e) {
      setExcelError(e instanceof Error ? e.message : 'Failed to read Excel files.');
    }
  }, []);

  const onExcelCitiesFile = useCallback(
    (file: File | null) => {
      citiesFileRef.current = file;
      if (!file || !plantsFileRef.current) {
        if (excelMode) clearExcel();
        return;
      }
      void processExcelPair(file, plantsFileRef.current);
    },
    [excelMode, clearExcel, processExcelPair]
  );

  const onExcelPlantsFile = useCallback(
    (file: File | null) => {
      plantsFileRef.current = file;
      if (!file || !citiesFileRef.current) {
        if (excelMode) clearExcel();
        return;
      }
      void processExcelPair(citiesFileRef.current, file);
    },
    [excelMode, clearExcel, processExcelPair]
  );

  // Optimization mode handlers
  const handleOptimizationSolve = useCallback(() => {
    const { stations, r, k } = optimizationState.input;

    if (excelMode && excelStrategy === 'real' && computedCities && computedPlants?.length) {
      const result = solveRealMode(computedCities, computedPlants, k);
      setOptimizationState((prev) => ({
        ...prev,
        output: result,
        playback: { isPlaying: false, currentTrialIndex: 0, currentStepIndex: 0, speed: 0.5 },
      }));
    } else if (excelMode) {
      const answer = maxPowerExcel(stations, k);
      const basePower = [...stations];
      const { distribution: finalDistribution, kUsed } = computeFinalDistributionExcel(
        stations,
        k,
        answer
      );
      setOptimizationState((prev) => ({
        ...prev,
        output: {
          answer,
          basePower,
          trials: [],
          finalDistribution,
          k,
          kUsed,
        },
        playback: null,
      }));
    } else {
      const answer = maxPower(stations, r, k);
      const baseDiff = buildBasePowerDiff(stations, r);
      const basePower = diffToPower(baseDiff);
      const { distribution: finalDistribution, kUsed } = computeFinalDistribution(
        stations,
        r,
        k,
        answer
      );
      setOptimizationState((prev) => ({
        ...prev,
        output: {
          answer,
          basePower,
          trials: [],
          finalDistribution,
          k,
          kUsed,
        },
        playback: null,
      }));
    }
  }, [optimizationState.input, excelMode, excelStrategy, computedCities, computedPlants]);

  const handleOptimizationSolveWithTrace = useCallback(() => {
    const { stations, r, k } = optimizationState.input;

    if (excelMode && excelStrategy === 'real' && computedCities && computedPlants?.length) {
      const output = solveWithTraceReal(computedCities, computedPlants, k);
      setOptimizationState((prev) => ({
        ...prev,
        output,
        playback: { isPlaying: false, currentTrialIndex: 0, currentStepIndex: 0, speed: 0.5 },
      }));
    } else if (excelMode) {
      const output = solveWithTraceExcel(stations, k);
      setOptimizationState((prev) => ({
        ...prev,
        output,
        playback: {
          isPlaying: false,
          currentTrialIndex: 0,
          currentStepIndex: 0,
          speed: 0.5,
        },
      }));
    } else {
      const output = solveWithTrace(stations, r, k);
      setOptimizationState((prev) => ({
        ...prev,
        output,
        playback: {
          isPlaying: false,
          currentTrialIndex: 0,
          currentStepIndex: 0,
          speed: 0.5,
        },
      }));
    }
  }, [optimizationState.input, excelMode, excelStrategy, computedCities, computedPlants]);

  const handleOptimizationInputChange = useCallback((input: Partial<SolveInput>) => {
    setOptimizationState((prev) => ({
      ...prev,
      input: { ...prev.input, ...input },
      output: null,
      playback: null,
    }));
  }, []);

  const handleExcelStrategyChange = useCallback((strategy: 'simple' | 'real') => {
    setExcelStrategy(strategy);
    setOptimizationState((prev) => ({ ...prev, output: null, playback: null }));
  }, []);

  const handleOptimizationPlaybackChange = useCallback((playback: Partial<PlaybackState> | null) => {
    setOptimizationState((prev) => ({
      ...prev,
      playback: playback
        ? { ...(prev.playback || { isPlaying: false, currentTrialIndex: 0, currentStepIndex: 0, speed: 2 }), ...playback }
        : null,
    }));
  }, []);

  // Planning mode handlers
  const handlePlanningGenerate = useCallback(() => {
    const { stations, r } = optimizationState.input;

    if (excelMode) {
      const result = computePlanningResultExcel(stations, targetMin, null);
      setPlanningResult(result);
    } else {
      const result = computePlanningResult(stations, r, targetMin, null);
      setPlanningResult(result);
    }
  }, [optimizationState.input, targetMin, excelMode]);

  const handlePlanningInputChange = useCallback((input: Partial<SolveInput>) => {
    setOptimizationState((prev) => ({
      ...prev,
      input: { ...prev.input, ...input },
    }));
    setPlanningResult(null);
  }, []);

  // Export handlers for each mode
  const handleOptimizationExportPDF = useCallback(() => {
    exportToPDF('optimization', optimizationState, null, null);
  }, [optimizationState]);

  const handleOptimizationExportJSON = useCallback(() => {
    const data = {
      mode: 'optimization',
      timestamp: new Date().toISOString(),
      optimization: optimizationState,
    };
    exportToJSON(data, 'optimization-report.json');
  }, [optimizationState]);

  const handlePlanningExportPDF = useCallback(() => {
    exportToPDF('optimization', null, planningResult, null);
  }, [planningResult]);

  const handlePlanningExportJSON = useCallback(() => {
    const data = {
      mode: 'planning',
      timestamp: new Date().toISOString(),
      planning: planningResult,
      targetMin,
    };
    exportToJSON(data, 'planning-report.json');
  }, [planningResult, targetMin]);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <HeaderBar />
      
      {/* Mode Toggle Header */}
      <div className="container mx-auto px-4 pt-4">
        <div className="glass-card p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Smart Energy Grid Optimizer
              </h1>
              <p className="text-text-secondary text-sm">
                {viewMode === 'optimizer' 
                  ? 'Find the maximum achievable minimum power given your resources'
                  : 'Determine the minimum resources needed to reach your target'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">Mode:</span>
              <div className="flex bg-dark-card rounded-lg p-1 border border-dark-border">
                <button
                  onClick={() => setViewMode('optimizer')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    viewMode === 'optimizer'
                      ? 'bg-neon-blue text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Optimizer
                </button>
                <button
                  onClick={() => setViewMode('planning')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    viewMode === 'planning'
                      ? 'bg-neon-purple text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Planning
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 pb-6">
        <AnimatePresence mode="wait">
          {viewMode === 'optimizer' ? (
            <motion.div
              key="optimizer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <OptimizationMode
                input={optimizationState.input}
                output={optimizationState.output}
                playback={optimizationState.playback}
                onInputChange={handleOptimizationInputChange}
                onPlaybackChange={handleOptimizationPlaybackChange}
                onSolve={handleOptimizationSolve}
                onSolveWithTrace={handleOptimizationSolveWithTrace}
                heatmapMode={heatmapMode}
                onHeatmapModeChange={setHeatmapMode}
                explainMode={optimizationExplainMode}
                onExplainModeChange={setOptimizationExplainMode}
                onExportPDF={handleOptimizationExportPDF}
                onExportJSON={handleOptimizationExportJSON}
                excelMode={excelMode}
                excelError={excelError}
                excelInputKey={excelInputKey}
                excelContext={excelContext}
                excelStrategy={excelStrategy}
                onExcelStrategyChange={handleExcelStrategyChange}
                onExcelCitiesFile={onExcelCitiesFile}
                onExcelPlantsFile={onExcelPlantsFile}
                onClearExcel={clearExcel}
              />
            </motion.div>
          ) : (
            <motion.div
              key="planning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PlanningMode
                input={optimizationState.input}
                targetMin={targetMin}
                onTargetMinChange={setTargetMin}
                planningResult={planningResult}
                onGeneratePlan={handlePlanningGenerate}
                onInputChange={handlePlanningInputChange}
                excelMode={excelMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
