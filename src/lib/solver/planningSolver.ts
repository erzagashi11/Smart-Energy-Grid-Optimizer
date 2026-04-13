import { buildBasePowerDiff, diffToPower } from './powerUtils';
import { PlacementPlan, PlanningResult } from '../types';

/**
 * Computes the minimum k required to achieve target minimum power T
 */
export function computeMinK(
  stations: number[],
  r: number,
  targetMin: number
): { kMin: number; placementPlan: PlacementPlan[]; finalDistribution: number[] } {
  const n = stations.length;
  const diff = buildBasePowerDiff(stations, r);
  const placementPlan: PlacementPlan[] = [];
  let sum = 0;
  let totalKUsed = 0;
  let planIndex = 1;

  for (let i = 0; i < n; i++) {
    sum += diff[i];
    if (sum < targetMin) {
      const add = targetMin - sum;
      totalKUsed += add;
      
      // Place station at i + r (greedy: as far right as possible)
      const placedAt = Math.min(n - 1, i + r);
      const start = Math.max(0, placedAt - r);
      const end = Math.min(n, placedAt + r + 1);
      
      // Calculate which cities are improved
      const citiesImproved: number[] = [];
      for (let j = start; j < end; j++) {
        citiesImproved.push(j);
      }
      
      placementPlan.push({
        index: planIndex++,
        placementIndex: placedAt,
        addedPower: add,
        coverageInterval: [start, end - 1],
        citiesImproved,
      });
      
      // Apply the change
      diff[start] += add;
      diff[end] -= add;
      sum += add;
    }
  }

  const finalDistribution = diffToPower(diff);

  return {
    kMin: totalKUsed,
    placementPlan,
    finalDistribution,
  };
}

/**
 * Computes planning result with budget check
 */
export function computePlanningResult(
  stations: number[],
  r: number,
  targetMin: number,
  maxBudget: number | null
): PlanningResult {
  const { kMin, placementPlan, finalDistribution } = computeMinK(stations, r, targetMin);
  
  const feasible = maxBudget === null || kMin <= maxBudget;
  const budgetRemaining = maxBudget !== null ? maxBudget - kMin : null;
  const totalCostUsed = kMin;
  const minimumAchieved = Math.min(...finalDistribution);
  
  // Efficiency: power increase per station
  const basePower = diffToPower(buildBasePowerDiff(stations, r));
  const baseMin = Math.min(...basePower);
  const powerIncrease = minimumAchieved - baseMin;
  const efficiencyRatio = kMin > 0 ? powerIncrease / kMin : 0;
  
  // Percentage of cities meeting target
  const citiesMeetingTarget = finalDistribution.filter(p => p >= targetMin).length;
  const percentageMeetingTarget = (citiesMeetingTarget / stations.length) * 100;

  return {
    kMin,
    feasible,
    budgetRemaining,
    placementPlan,
    totalCostUsed,
    minimumAchieved,
    efficiencyRatio,
    percentageMeetingTarget,
    finalDistribution,
  };
}
