import type { FeasibilityStep, TrialTrace, SolveOutput } from './traceSolver';
import type { ParsedCityRow, ParsedPlantRow } from '@/lib/excel/excelMode';
import { floorCityPowersFromPlants } from '@/lib/excel/excelMode';
import { checkWithTraceExcelAlwaysComplete } from './excelSolver';

export type RealModeResult = SolveOutput & {
  plantKAllocations: number[];
  plantPlacements: Array<{ plantIndex: number; addedPower: number }>;
};

export function floorPlantPowers(plants: ParsedPlantRow[]): number[] {
  return plants.map((p) => Math.floor(p.power));
}

function formatPlantSpend(
  plantSpend: Map<number, number>,
  plants: ParsedPlantRow[]
): string {
  const parts: string[] = [];
  for (const [pid, n] of plantSpend) {
    if (n > 0 && plants[pid]) {
      parts.push(`${plants[pid].plant_name} (+${n})`);
    }
  }
  return parts.join(', ');
}

/**
 * Excel Real `check(mid)`: walk cities left → right. For each city below `mid`, spend `k`
 * one unit at a time on the plant that maximizes gain at *that* city. Stop immediately
 * if the city is still below `mid` when `k` runs out (infeasible).
 */
export function simulateLeftToRightCheckMid(
  cities: ParsedCityRow[],
  plants: ParsedPlantRow[],
  k: number,
  basePlantPowers: number[],
  mid: number
): {
  feasible: boolean;
  detailSteps: FeasibilityStep[];
  microSteps: FeasibilityStep[];
  finalCityPowers: number[];
  plantKAllocations: number[];
  kUsed: number;
} {
  const n = cities.length;
  const plantPowers = [...basePlantPowers];
  const plantKAllocations = plants.map(() => 0);
  let kRem = k;
  const detailSteps: FeasibilityStep[] = [];
  const microSteps: FeasibilityStep[] = [];

  for (let cityIdx = 0; cityIdx < n; cityIdx++) {
    let cityPowers = floorCityPowersFromPlants(cities, plants, plantPowers);
    let p = cityPowers[cityIdx];

    if (p >= mid) {
      detailSteps.push({
        i: cityIdx,
        target: mid,
        powerBefore: Math.floor(p),
        add: 0,
        placedAt: null,
        effectEnd: null,
        kRemainingAfter: kRem,
        feasibleSoFar: true,
        plantCapacityAdded: 0,
        cityPowerGain: 0,
      });
      continue;
    }

    const kPhaseStart = kRem;
    const powerBeforePhase = p;
    const plantSpend = new Map<number, number>();

    while (kRem > 0) {
      cityPowers = floorCityPowersFromPlants(cities, plants, plantPowers);
      p = cityPowers[cityIdx];
      if (p >= mid) break;

      const before = p;
      let bestPlant = -1;
      let bestGain = -Infinity;
      for (let pid = 0; pid < plants.length; pid++) {
        const tryP = [...plantPowers];
        tryP[pid] += 1;
        const tryC = floorCityPowersFromPlants(cities, plants, tryP);
        const gain = tryC[cityIdx] - before;
        if (gain > bestGain || (gain === bestGain && (bestPlant < 0 || pid < bestPlant))) {
          bestGain = gain;
          bestPlant = pid;
        }
      }

      if (bestPlant < 0 || !Number.isFinite(bestGain)) {
        break;
      }

      plantPowers[bestPlant] += 1;
      plantKAllocations[bestPlant] += 1;
      kRem--;
      plantSpend.set(bestPlant, (plantSpend.get(bestPlant) ?? 0) + 1);

      cityPowers = floorCityPowersFromPlants(cities, plants, plantPowers);
      const after = cityPowers[cityIdx];
      const unitGain = after - before;

      microSteps.push({
        i: cityIdx,
        target: mid,
        powerBefore: Math.floor(before),
        add: 1,
        placedAt: null,
        effectEnd: unitGain,
        kRemainingAfter: kRem,
        feasibleSoFar: true,
        plantPlacedAt: bestPlant,
        plantNameAt: plants[bestPlant].plant_name,
        plantCapacityAdded: 1,
        cityPowerGain: unitGain,
      });
    }

    cityPowers = floorCityPowersFromPlants(cities, plants, plantPowers);
    const finalP = cityPowers[cityIdx];
    const totalSpent = kPhaseStart - kRem;
    const aggLabel = formatPlantSpend(plantSpend, plants);

    if (finalP < mid) {
      detailSteps.push({
        i: cityIdx,
        target: mid,
        powerBefore: Math.floor(powerBeforePhase),
        add: totalSpent,
        placedAt: null,
        effectEnd: finalP - powerBeforePhase,
        kRemainingAfter: kRem,
        feasibleSoFar: false,
        plantCapacityAdded: totalSpent,
        cityPowerGain: finalP - powerBeforePhase,
        plantNameAt: aggLabel || undefined,
      });
      const finalCityPowers = cityPowers;
      return {
        feasible: false,
        detailSteps,
        microSteps,
        finalCityPowers,
        plantKAllocations,
        kUsed: k - kRem,
      };
    }

    detailSteps.push({
      i: cityIdx,
      target: mid,
      powerBefore: Math.floor(powerBeforePhase),
      add: totalSpent,
      placedAt: null,
      effectEnd: finalP - powerBeforePhase,
      kRemainingAfter: kRem,
      feasibleSoFar: true,
      plantCapacityAdded: totalSpent,
      cityPowerGain: finalP - powerBeforePhase,
      plantNameAt: aggLabel || undefined,
    });
  }

  const finalCityPowers = floorCityPowersFromPlants(cities, plants, plantPowers);
  const feasible = Math.min(...finalCityPowers) >= mid;
  return {
    feasible,
    detailSteps,
    microSteps,
    finalCityPowers,
    plantKAllocations,
    kUsed: k - kRem,
  };
}

function checkWithTraceReal(
  cities: ParsedCityRow[],
  plants: ParsedPlantRow[],
  k: number,
  basePlantPowers: number[],
  mid: number,
  /** Base city powers (for chart/map: one step per city, visit all cities) */
  floors: number[]
): {
  feasible: boolean;
  steps: FeasibilityStep[];
  detailSteps: FeasibilityStep[];
  plantSteps: FeasibilityStep[];
  kUsed: number;
} {
  const sim = simulateLeftToRightCheckMid(cities, plants, k, basePlantPowers, mid);
  const cityTrace = checkWithTraceExcelAlwaysComplete(floors, mid, k);
  return {
    feasible: sim.feasible,
    steps: cityTrace.steps,
    detailSteps: sim.detailSteps,
    plantSteps: sim.microSteps,
    kUsed: sim.kUsed,
  };
}

/** Recompute city powers after applying the first `count` plant-allocation steps from a trial. */
export function cityPowersAfterRealSteps(
  cities: ParsedCityRow[],
  plants: ParsedPlantRow[],
  basePlantPowers: number[],
  steps: FeasibilityStep[],
  count: number
): number[] {
  const plantPowers = [...basePlantPowers];
  const n = Math.min(count, steps.length);
  for (let i = 0; i < n; i++) {
    const s = steps[i];
    if (s.plantPlacedAt !== undefined && s.add > 0 && s.feasibleSoFar) {
      plantPowers[s.plantPlacedAt] += s.add;
    }
  }
  return floorCityPowersFromPlants(cities, plants, plantPowers);
}

function plantPlacementsFromAllocations(alloc: number[]): Array<{ plantIndex: number; addedPower: number }> {
  const out: Array<{ plantIndex: number; addedPower: number }> = [];
  for (let i = 0; i < alloc.length; i++) {
    if (alloc[i] > 0) out.push({ plantIndex: i, addedPower: alloc[i] });
  }
  return out;
}

export function maxPowerExcelReal(cities: ParsedCityRow[], plants: ParsedPlantRow[], k: number): number {
  const basePlantPowers = floorPlantPowers(plants);
  const basePower = floorCityPowersFromPlants(cities, plants, basePlantPowers);
  if (basePower.length === 0) return 0;
  const minP = Math.min(...basePower);
  const maxP = Math.max(...basePower);
  let low = minP;
  let high = maxP + k;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const { feasible } = simulateLeftToRightCheckMid(cities, plants, k, basePlantPowers, mid);
    if (feasible) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

export function computeFinalDistributionReal(
  cities: ParsedCityRow[],
  plants: ParsedPlantRow[],
  k: number
): {
  distribution: number[];
  plantKAllocations: number[];
  plantPlacements: Array<{ plantIndex: number; addedPower: number }>;
  kUsed: number;
} {
  const basePlantPowers = floorPlantPowers(plants);
  const answer = maxPowerExcelReal(cities, plants, k);
  const sim = simulateLeftToRightCheckMid(cities, plants, k, basePlantPowers, answer);
  return {
    distribution: sim.finalCityPowers,
    plantKAllocations: sim.plantKAllocations,
    plantPlacements: plantPlacementsFromAllocations(sim.plantKAllocations),
    kUsed: sim.kUsed,
  };
}

export function solveWithTraceReal(cities: ParsedCityRow[], plants: ParsedPlantRow[], k: number): RealModeResult {
  const startTime = performance.now();
  const basePlantPowers = floorPlantPowers(plants);
  const basePower = floorCityPowersFromPlants(cities, plants, basePlantPowers);
  if (basePower.length === 0) {
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
      plantKAllocations: [],
      plantPlacements: [],
    };
  }

  const minP = Math.min(...basePower);
  const maxP = Math.max(...basePower);
  let low = minP;
  let high = maxP + k;

  const trials: TrialTrace[] = [];
  let totalSteps = 0;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const { feasible, steps, detailSteps, plantSteps, kUsed } = checkWithTraceReal(
      cities,
      plants,
      k,
      basePlantPowers,
      mid,
      basePower
    );
    totalSteps += steps.length;

    trials.push({
      low,
      mid,
      high,
      feasible,
      steps,
      detailSteps,
      plantSteps,
      kUsed,
    });

    if (feasible) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const answer = low;
  const { distribution: finalDistribution, plantKAllocations, plantPlacements, kUsed } =
    computeFinalDistributionReal(cities, plants, k);

  return {
    answer,
    basePower,
    trials,
    finalDistribution,
    k,
    kUsed,
    executionTimeMs: performance.now() - startTime,
    totalSteps,
    n: cities.length,
    r: 0,
    plantKAllocations,
    plantPlacements,
  };
}

/** Instant solve: same output shape as before (no trials). */
export function solveRealMode(cities: ParsedCityRow[], plants: ParsedPlantRow[], k: number): RealModeResult {
  const startTime = performance.now();
  const basePlantPowers = floorPlantPowers(plants);
  const basePower = floorCityPowersFromPlants(cities, plants, basePlantPowers);
  if (basePower.length === 0) {
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
      plantKAllocations: [],
      plantPlacements: [],
    };
  }

  const answer = maxPowerExcelReal(cities, plants, k);
  const { distribution: finalDistribution, plantKAllocations, plantPlacements, kUsed } =
    computeFinalDistributionReal(cities, plants, k);

  return {
    answer,
    basePower,
    trials: [],
    finalDistribution,
    k,
    kUsed,
    executionTimeMs: performance.now() - startTime,
    totalSteps: 0,
    n: cities.length,
    r: 0,
    plantKAllocations,
    plantPlacements,
  };
}
