import { FeasibilityStep, TrialTrace, SolveOutput } from './solver/traceSolver';

// Single primary mode for the app – Optimization Simulator.
export type AppMode = 'optimization';

export type SolveInput = {
  stations: number[];
  r: number;
  k: number;
  mode: 'optimal' | 'manual';
  trace: boolean;
};

export type Scenario = {
  name: string;
  description: string;
  stations: number[];
  r: number;
  k: number;
  color: 'blue' | 'green' | 'orange';
};

export type PlaybackState = {
  isPlaying: boolean;
  currentTrialIndex: number;
  currentStepIndex: number;
  speed: number; // steps per second
};

export type AppState = {
  input: SolveInput;
  output: SolveOutput | null;
  playback: PlaybackState | null;
  selectedScenario: Scenario | null;
};

export type PlacementPlan = {
  index: number;
  placementIndex: number;
  addedPower: number;
  coverageInterval: [number, number];
  citiesImproved: number[];
};

export type PlanningResult = {
  kMin: number;
  feasible: boolean;
  budgetRemaining: number | null;
  placementPlan: PlacementPlan[];
  totalCostUsed: number;
  minimumAchieved: number;
  efficiencyRatio: number;
  percentageMeetingTarget: number;
  finalDistribution: number[];
};

// Metadata used only by the Planning tab to enrich locations with semantic meaning.
// This does not affect the core optimization logic – it is purely for UI and insights.
export type PlanningLocationMeta = {
  name: string;
  demand: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export type ScenarioComparison = {
  scenarioA: {
    name: string;
    stations: number[];
    r: number;
    k: number;
    result: SolveOutput | null;
  };
  scenarioB: {
    name: string;
    stations: number[];
    r: number;
    k: number;
    result: SolveOutput | null;
  };
};

export type ComparisonMetrics = {
  minimumPower: { a: number; b: number };
  meanPower: { a: number; b: number };
  standardDeviation: { a: number; b: number };
  budgetUsed: { a: number; b: number };
  fairnessScore: { a: number; b: number };
  recommendation: string;
};

export type { FeasibilityStep, TrialTrace, SolveOutput };
