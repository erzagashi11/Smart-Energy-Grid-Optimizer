/**
 * Utility functions for power calculations using difference arrays
 */

/**
 * Builds a difference array for efficient range updates
 * @param stations - Initial station counts per city
 * @param r - Range of each station
 * @returns Difference array where prefix sum gives power per city
 */
export function buildBasePowerDiff(stations: number[], r: number): number[] {
  const n = stations.length;
  const diff = new Array<number>(n + 1).fill(0);

  for (let i = 0; i < n; i++) {
    const left = Math.max(0, i - r);
    const right = Math.min(n, i + r + 1);
    diff[left] += stations[i];
    diff[right] -= stations[i];
  }

  return diff;
}

/**
 * Converts difference array to prefix sum (actual power per city)
 */
export function diffToPower(diff: number[]): number[] {
  const n = diff.length - 1;
  const power = new Array<number>(n);
  let sum = 0;

  for (let i = 0; i < n; i++) {
    sum += diff[i];
    power[i] = sum;
  }

  return power;
}

/**
 * Gets min and max power from difference array
 */
export function getPowerBounds(diff: number[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let sum = 0;
  const n = diff.length - 1;

  for (let i = 0; i < n; i++) {
    sum += diff[i];
    if (sum < min) min = sum;
    if (sum > max) max = sum;
  }

  return { min, max };
}
