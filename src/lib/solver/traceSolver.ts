import { buildBasePowerDiff, diffToPower, getPowerBounds } from './powerUtils';
import { maxPower } from './maxPower';

export type FeasibilityStep = {
  i: number;
  target: number; // mid value being tested
  powerBefore: number; // power at i before adding
  add: number; // added amount (0 if none)
  placedAt: number | null; // city index for Simple Excel mode, null for plant placement
  effectEnd: number | null; // calculated from placedAt, null if no placement
  kRemainingAfter: number;
  feasibleSoFar: boolean;
  /** Real Mode: plant index that received +1 (placement on plant, not city) */
  plantPlacedAt?: number;
  /** Real Mode: display name for plant placement labels */
  plantNameAt?: string;
  /** Real Mode: total plant capacity units spent for this step (same unit as `k`) */
  plantCapacityAdded?: number;
  /** Real Mode: resulting weakest city power gain after recomputation */
  cityPowerGain?: number;
};

export type TrialTrace = {
  low: number;
  mid: number;
  high: number;
  feasible: boolean;
  steps: FeasibilityStep[];
  /** Real Mode: one micro-step per +1 k to a plant (playback / chart) */
  plantSteps?: FeasibilityStep[];
  /** Real Mode: city-by-city detail rows; stops early when infeasible (Details table) */
  detailSteps?: FeasibilityStep[];
  kUsed: number; // k used in this trial
};

export type SolveOutput = {
  answer: number;
  basePower: number[];
  trials: TrialTrace[];
  finalDistribution?: number[];
  k: number; // original k value for reference
  kUsed?: number; // k used in final solution (for instant solve)
  executionTimeMs?: number; // execution time in milliseconds
  totalSteps?: number; // total feasibility steps across all trials
  n?: number; // number of cities
  r?: number; // range value
};

/**
 * Feasibility check with detailed step-by-step trace
 */
function checkWithTrace(
  diff: number[],
  val: number,
  n: number,
  r: number,
  k: number
): { feasible: boolean; steps: FeasibilityStep[]; kUsed: number } {
  const diffCopy = diff.slice();
  const steps: FeasibilityStep[] = [];
  let sum = 0;
  let remaining = k;

  for (let i = 0; i < n; i++) {
    sum += diffCopy[i];
    const powerBefore = sum;
    let add = 0;
    let placedAt: number | null = null;
    let effectEnd: number | null = null;
    let feasibleSoFar = true;

    if (sum < val) {
      const needed = val - sum;
      add = needed;
      if (remaining < add) {
        feasibleSoFar = false;
        const wouldPlaceAt = Math.min(n - 1, i + r);
        const wouldEffectEnd = Math.min(n, wouldPlaceAt + r + 1);
        steps.push({
          i,
          target: val,
          powerBefore,
          add: needed, // Sa u desh, jo 0
          placedAt: wouldPlaceAt, // Ku do e vendosje po të kishe k
          effectEnd: wouldEffectEnd,
          kRemainingAfter: remaining,
          feasibleSoFar: false,
        });
        return { feasible: false, steps, kUsed: k - remaining };
      }

      remaining -= add;
      placedAt = Math.min(n - 1, i + r);
      // Station at placedAt affects cities from (placedAt - r) to (placedAt + r)
      const start = Math.max(0, placedAt - r);
      effectEnd = Math.min(n, placedAt + r + 1);
      // Add to difference array: +add at start, -add at end
      diffCopy[start] += add;
      diffCopy[effectEnd] -= add;
      sum += add;
    }

    steps.push({
      i,
      target: val,
      powerBefore,
      add,
      placedAt,
      effectEnd,
      kRemainingAfter: remaining,
      feasibleSoFar: true,
    });
  }

  return { feasible: true, steps, kUsed: k - remaining };
}

/**
 * Binary search solver with full trace for visualization
 */
export function solveWithTrace(
  stations: number[],
  r: number,
  k: number
): SolveOutput {
  // Measure optimized algorithm execution time (without tracing overhead)
  const optimizedStartTime = performance.now();
  const optimizedAnswer = maxPower(stations, r, k);
  const optimizedExecutionTimeMs = performance.now() - optimizedStartTime;
  
  const n = stations.length;
  const baseDiff = buildBasePowerDiff(stations, r);
  const basePower = diffToPower(baseDiff);
  const { min: minPower, max: maxPowerValue } = getPowerBounds(baseDiff);

  const trials: TrialTrace[] = [];
  let lo = minPower;
  let hi = maxPowerValue + k;
  let answer = minPower;
  let totalSteps = 0;

  while (lo <= hi) {
    const mid = Math.floor(lo + (hi - lo) / 2);
    const { feasible, steps, kUsed } = checkWithTrace(baseDiff, mid, n, r, k);
    totalSteps += steps.length;

    trials.push({
      low: lo,
      mid,
      high: hi,
      feasible,
      steps,
      kUsed,
    });

    if (feasible) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Compute final distribution using optimizedAnswer
  const finalDiff = buildBasePowerDiff(stations, r);
  let sum = 0;
  let remaining = k;

  for (let i = 0; i < n; i++) {
    sum += finalDiff[i];
    if (sum < optimizedAnswer) {
      const add = optimizedAnswer - sum;
      if (remaining >= add) {
        remaining -= add;
        // Place station at i + r (greedy: as far right as possible)
        const placedAt = Math.min(n - 1, i + r);
        // Station at placedAt affects cities from (placedAt - r) to (placedAt + r)
        const start = Math.max(0, placedAt - r);
        const end = Math.min(n, placedAt + r + 1);
        // Add to difference array: +add at start, -add at end
        finalDiff[start] += add;
        finalDiff[end] -= add;
        sum += add;
      }
    }
  }

  const finalDistribution = diffToPower(finalDiff);
  const kUsed = k - remaining;

  // Use optimizedAnswer to ensure consistency (should match answer from tracing)
  // If they don't match, there's a bug, but we'll use optimizedAnswer as the source of truth
  return {
    answer: optimizedAnswer, // Use answer from optimized algorithm (without tracing)
    basePower,
    trials,
    finalDistribution,
    k,
    kUsed,
    executionTimeMs: optimizedExecutionTimeMs, // Use optimized algorithm time (without tracing)
    totalSteps,
    n,
    r,
  };
}
