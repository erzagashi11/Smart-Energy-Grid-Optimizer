import { maxPower, computeFinalDistribution } from './maxPower';
import { buildBasePowerDiff, diffToPower } from './powerUtils';
import { ComparisonMetrics, ScenarioComparison } from '../types';

/**
 * Calculate fairness score (normalized minimum power)
 */
function calculateFairnessScore(
  stations: number[],
  r: number,
  k: number,
  result: { answer: number; finalDistribution: number[] }
): number {
  const meanPower = result.finalDistribution.reduce((a, b) => a + b, 0) / result.finalDistribution.length;
  const normalizedMin = result.answer / (meanPower || 1);
  return Math.min(1, normalizedMin);
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compute comparison metrics between two scenarios
 */
export function computeComparisonMetrics(comparison: ScenarioComparison): ComparisonMetrics | null {
  if (!comparison.scenarioA.result || !comparison.scenarioB.result) {
    return null;
  }

  const resultA = comparison.scenarioA.result;
  const resultB = comparison.scenarioB.result;

  const distA = resultA.finalDistribution || [];
  const distB = resultB.finalDistribution || [];

  const meanA = distA.reduce((a, b) => a + b, 0) / distA.length;
  const meanB = distB.reduce((a, b) => a + b, 0) / distB.length;

  const stdA = calculateStandardDeviation(distA);
  const stdB = calculateStandardDeviation(distB);

  const fairnessA = calculateFairnessScore(
    comparison.scenarioA.stations,
    comparison.scenarioA.r,
    comparison.scenarioA.k,
    { answer: resultA.answer, finalDistribution: resultA.finalDistribution || [] }
  );
  const fairnessB = calculateFairnessScore(
    comparison.scenarioB.stations,
    comparison.scenarioB.r,
    comparison.scenarioB.k,
    { answer: resultB.answer, finalDistribution: resultB.finalDistribution || [] }
  );

  // Generate recommendation
  let recommendation = '';
  if (fairnessB > fairnessA && resultB.kUsed! < resultA.kUsed!) {
    recommendation = 'Scenario B provides better fairness with lower cost.';
  } else if (fairnessA > fairnessB && resultA.kUsed! < resultB.kUsed!) {
    recommendation = 'Scenario A provides better fairness with lower cost.';
  } else if (fairnessB > fairnessA) {
    recommendation = 'Scenario B provides better fairness but at higher cost.';
  } else if (fairnessA > fairnessB) {
    recommendation = 'Scenario A provides better fairness but at higher cost.';
  } else if (resultB.kUsed! < resultA.kUsed!) {
    recommendation = 'Scenario B achieves similar fairness with lower cost.';
  } else if (resultA.kUsed! < resultB.kUsed!) {
    recommendation = 'Scenario A achieves similar fairness with lower cost.';
  } else {
    recommendation = 'Both scenarios achieve similar results.';
  }

  return {
    minimumPower: {
      a: resultA.answer,
      b: resultB.answer,
    },
    meanPower: {
      a: meanA,
      b: meanB,
    },
    standardDeviation: {
      a: stdA,
      b: stdB,
    },
    budgetUsed: {
      a: resultA.kUsed || 0,
      b: resultB.kUsed || 0,
    },
    fairnessScore: {
      a: fairnessA,
      b: fairnessB,
    },
    recommendation,
  };
}

/**
 * Run scenario analysis
 */
export function runScenarioAnalysis(
  stations: number[],
  r: number,
  k: number
): { answer: number; finalDistribution: number[]; kUsed: number } {
  const answer = maxPower(stations, r, k);
  const { distribution, kUsed } = computeFinalDistribution(stations, r, k, answer);
  return {
    answer,
    finalDistribution: distribution,
    kUsed,
  };
}
