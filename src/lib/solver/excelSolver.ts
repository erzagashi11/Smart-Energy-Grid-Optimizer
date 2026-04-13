import type { FeasibilityStep, TrialTrace, SolveOutput } from './traceSolver';
import type { PlanningResult } from '../types';

/**
 * Excel mode: power flows only from plants to cities. No neighborhood/range logic.
 * Each addition goes directly to one city. Feasibility: sum max(0, target - power[i]) <= k.
 */
export function maxPowerExcel(powers: number[], k: number): number {
  const floors = powers.map((p) => Math.floor(p));
  const n = floors.length;
  if (n === 0) return 0;

  const minP = Math.min(...floors);
  const maxP = Math.max(...floors);

  const totalDeficit = (target: number): number => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (floors[i] < target) sum += target - floors[i];
    }
    return sum;
  };

  const check = (target: number): boolean => totalDeficit(target) <= k;

  let low = minP;
  let high = maxP + k;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (check(mid)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

export function computeFinalDistributionExcel(
  powers: number[],
  k: number,
  targetMin: number
): { distribution: number[]; kUsed: number } {
  const floors = powers.map((p) => Math.floor(p));
  const result = [...floors];
  let remaining = k;

  for (let i = 0; i < result.length; i++) {
    if (result[i] < targetMin) {
      const add = Math.min(targetMin - result[i], remaining);
      result[i] += add;
      remaining -= add;
      if (remaining <= 0) break;
    }
  }

  return {
    distribution: result,
    kUsed: k - remaining,
  };
}

function checkWithTraceExcel(
  powers: number[],
  target: number,
  k: number
): { feasible: boolean; steps: FeasibilityStep[]; kUsed: number } {
  const floors = powers.map((p) => Math.floor(p));
  const n = floors.length;
  const result = [...floors];
  const steps: FeasibilityStep[] = [];
  let remaining = k;

  for (let i = 0; i < n; i++) {
    const powerBefore = result[i];
    let add = 0;
    const feasibleSoFar = remaining >= 0;

    if (result[i] < target) {
      const needed = target - result[i];
      add = needed;
      if (remaining < add) {
        steps.push({
          i,
          target,
          powerBefore,
          add: needed,
          placedAt: i,
          effectEnd: i + 1,
          kRemainingAfter: remaining,
          feasibleSoFar: false,
        });
        return { feasible: false, steps, kUsed: k - remaining };
      }

      remaining -= add;
      result[i] += add;
    }

    steps.push({
      i,
      target,
      powerBefore,
      add,
      placedAt: add > 0 ? i : null,
      effectEnd: add > 0 ? i + 1 : null,
      kRemainingAfter: remaining,
      feasibleSoFar: true,
    });
  }

  return { feasible: true, steps, kUsed: k - remaining };
}

/**
 * Same feasibility logic as checkWithTraceExcel, but always emits one step per city (0..n-1)
 * so playback visits every city. Used for Excel Real mode visualization (binary search still
 * uses plant-based feasibility separately).
 */
export function checkWithTraceExcelAlwaysComplete(
  powers: number[],
  target: number,
  k: number
): { feasible: boolean; steps: FeasibilityStep[]; kUsed: number } {
  const floors = powers.map((p) => Math.floor(p));
  const n = floors.length;
  const result = [...floors];
  const steps: FeasibilityStep[] = [];
  let remaining = k;
  let failed = false;

  for (let i = 0; i < n; i++) {
    if (failed) {
      steps.push({
        i,
        target,
        powerBefore: result[i],
        add: 0,
        placedAt: null,
        effectEnd: null,
        kRemainingAfter: remaining,
        feasibleSoFar: false,
      });
      continue;
    }

    const powerBefore = result[i];
    let add = 0;

    if (result[i] < target) {
      const needed = target - result[i];
      add = needed;
      if (remaining < add) {
        failed = true;
        steps.push({
          i,
          target,
          powerBefore,
          add: needed,
          placedAt: i,
          effectEnd: i + 1,
          kRemainingAfter: remaining,
          feasibleSoFar: false,
        });
        continue;
      }
      remaining -= add;
      result[i] += add;
    }

    steps.push({
      i,
      target,
      powerBefore,
      add,
      placedAt: add > 0 ? i : null,
      effectEnd: add > 0 ? i + 1 : null,
      kRemainingAfter: remaining,
      feasibleSoFar: true,
    });
  }

  return { feasible: !failed, steps, kUsed: k - remaining };
}

export function solveWithTraceExcel(powers: number[], k: number): SolveOutput {
  const startTime = performance.now();
  const floors = powers.map((p) => Math.floor(p));
  const n = floors.length;
  if (n === 0) {
    return {
      answer: 0,
      basePower: [],
      trials: [],
      finalDistribution: [],
      k,
      kUsed: 0,
      executionTimeMs: performance.now() - startTime,
      totalSteps: 0,
      n: 0,
      r: 0,
    };
  }

  const minP = Math.min(...floors);
  const maxP = Math.max(...floors);
  let low = minP;
  let high = maxP + k;

  const trials: TrialTrace[] = [];
  let totalSteps = 0;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const { feasible, steps, kUsed } = checkWithTraceExcel(floors, mid, k);
    totalSteps += steps.length;

    trials.push({
      low,
      mid,
      high,
      feasible,
      steps,
      kUsed,
    });

    if (feasible) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const answer = low;

  const { distribution: finalDistribution, kUsed } = computeFinalDistributionExcel(
    powers,
    k,
    answer
  );

  return {
    answer,
    basePower: floors,
    trials,
    finalDistribution,
    k,
    kUsed,
    executionTimeMs: performance.now() - startTime,
    totalSteps,
    n,
    r: 0,
  };
}

export function computePlanningResultExcel(
  powers: number[],
  targetMin: number,
  maxBudget: number | null
): PlanningResult {
  const baseFloors = powers.map((p) => Math.floor(p));
  const placementPlan: Array<{
    index: number;
    placementIndex: number;
    addedPower: number;
    coverageInterval: [number, number];
    citiesImproved: number[];
  }> = [];
  const finalDistribution = [...baseFloors];
  let totalKUsed = 0;

  for (let i = 0; i < finalDistribution.length; i++) {
    if (finalDistribution[i] < targetMin) {
      const add = targetMin - finalDistribution[i];
      totalKUsed += add;
      finalDistribution[i] = targetMin;
      placementPlan.push({
        index: placementPlan.length + 1,
        placementIndex: i,
        addedPower: add,
        coverageInterval: [i, i],
        citiesImproved: [i],
      });
    }
  }

  const feasible = maxBudget === null || totalKUsed <= maxBudget;
  const budgetRemaining = maxBudget !== null ? maxBudget - totalKUsed : null;
  const minimumAchieved = Math.min(...finalDistribution);
  const baseMin = Math.min(...baseFloors);
  const powerIncrease = minimumAchieved - baseMin;
  const efficiencyRatio = totalKUsed > 0 ? powerIncrease / totalKUsed : 0;
  const citiesMeetingTarget = finalDistribution.filter((p) => p >= targetMin).length;
  const percentageMeetingTarget = (powers.length > 0 ? citiesMeetingTarget / powers.length : 0) * 100;

  return {
    kMin: totalKUsed,
    feasible,
    budgetRemaining,
    placementPlan,
    totalCostUsed: totalKUsed,
    minimumAchieved,
    efficiencyRatio,
    percentageMeetingTarget,
    finalDistribution,
  };
}
