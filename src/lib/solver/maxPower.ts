import { buildBasePowerDiff, diffToPower, getPowerBounds } from './powerUtils';

/**
 * Fast solver without tracing (for instant solve mode)
 */
export function maxPower(
  stations: number[],
  r: number,
  k: number
): number {
  const n = stations.length;
  const cnt = buildBasePowerDiff(stations, r);
  const { min: minPower, max: maxPower } = getPowerBounds(cnt);

  const check = (val: number): boolean => {
    const diff = cnt.slice();
    let sum = 0;
    let remaining = k;

    for (let i = 0; i < n; i++) {
      sum += diff[i];
      if (sum < val) {
        const add = val - sum;
        if (remaining < add) return false;
        remaining -= add;
        // Place station at i + r (greedy: as far right as possible)
        const placedAt = Math.min(n - 1, i + r);
        // Station at placedAt affects cities from (placedAt - r) to (placedAt + r)
        const start = Math.max(0, placedAt - r);
        const end = Math.min(n, placedAt + r + 1);
        // Add to difference array: +add at start, -add at end
        diff[start] += add;
        diff[end] -= add;
        sum += add;
      }
    }
    return true;
  };

  let lo = minPower;
  let hi = maxPower + k;
  let res = minPower;

  while (lo <= hi) {
    const mid = Math.floor(lo + (hi - lo) / 2);
    if (check(mid)) {
      res = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return res;
}

/**
 * Computes the final power distribution after optimal placement
 */
export function computeFinalDistribution(
  stations: number[],
  r: number,
  k: number,
  targetMin: number
): { distribution: number[]; kUsed: number } {
  const n = stations.length;
  const diff = buildBasePowerDiff(stations, r);
  let sum = 0;
  let remaining = k;

  for (let i = 0; i < n; i++) {
    sum += diff[i];
    if (sum < targetMin) {
      const add = targetMin - sum;
      if (remaining >= add) {
        remaining -= add;
        // Place station at i + r (greedy: as far right as possible)
        const placedAt = Math.min(n - 1, i + r);
        // Station at placedAt affects cities from (placedAt - r) to (placedAt + r)
        const start = Math.max(0, placedAt - r);
        const end = Math.min(n, placedAt + r + 1);
        // Add to difference array: +add at start, -add at end
        diff[start] += add;
        diff[end] -= add;
        sum += add;
      }
    }
  }

  return {
    distribution: diffToPower(diff),
    kUsed: k - remaining,
  };
}
