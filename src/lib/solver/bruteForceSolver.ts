import { buildBasePowerDiff, diffToPower, getPowerBounds } from './powerUtils';

/**
 * Brute force solver that tries all possible power levels
 * Only use for small inputs (n <= 15)
 */
export function bruteForceSolve(
  stations: number[],
  r: number,
  k: number
): { answer: number; executionTimeMs: number } {
  const startTime = performance.now();
  const n = stations.length;
  const baseDiff = buildBasePowerDiff(stations, r);
  const { min: minPower, max: maxPower } = getPowerBounds(baseDiff);

  // Try all possible power levels from max down to min
  for (let target = maxPower + k; target >= minPower; target--) {
    const diff = baseDiff.slice();
    let sum = 0;
    let remaining = k;
    let feasible = true;

    for (let i = 0; i < n; i++) {
      sum += diff[i];
      if (sum < target) {
        const add = target - sum;
        if (remaining < add) {
          feasible = false;
          break;
        }
        remaining -= add;
        // Place station at i + r (greedy: as far right as possible)
        const placedAt = Math.min(n - 1, i + r);
        const start = Math.max(0, placedAt - r);
        const end = Math.min(n, placedAt + r + 1);
        diff[start] += add;
        diff[end] -= add;
        sum += add;
      }
    }

    if (feasible) {
      const executionTimeMs = performance.now() - startTime;
      return { answer: target, executionTimeMs };
    }
  }

  // Fallback (should never reach here)
  const executionTimeMs = performance.now() - startTime;
  return { answer: minPower, executionTimeMs };
}
