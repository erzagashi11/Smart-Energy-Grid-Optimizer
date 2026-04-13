import { SolveInput, SolveOutput, FeasibilityStep, TrialTrace, PlanningResult } from './types';
import { buildBasePowerDiff, diffToPower } from './solver/powerUtils';

/** When set, map view uses projected lat/lng and optional city labels/demands for Excel mode */
export type ExcelMapMeta = {
  cityNames: string[];
  demands: number[];
  latLngs: Array<{ lat: number; lng: number }>;
  /** Per-city contribution breakdown by plant (for tooltips) */
  coveredBy?: Array<Array<{ plant_name: string; contribution: number }>>;
};

/** Plant marker data for map in Excel mode */
export type PlantMapMarker = {
  id: number;
  x: number;
  y: number;
  plantName: string;
  netPower: number;
  radius: number;
  coveredCityCount: number;
  addedK?: number;
};

/**
 * Project geographic coordinates into the same SVG space used by the simulated grid layout.
 */
export function geoCoordsToMapLayout(latLngs: Array<{ lat: number; lng: number }>): Array<{ x: number; y: number }> {
  if (latLngs.length === 0) return [];
  const lats = latLngs.map((l) => l.lat);
  const lngs = latLngs.map((l) => l.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  return latLngs.map(({ lat, lng }) => {
    const nx = (lng - minLng) / lngSpan;
    const ny = (lat - minLat) / latSpan;
    const x = 50 + nx * 300;
    const y = 350 - ny * 280;
    return { x, y };
  });
}

/**
 * Project city and plant coordinates using a unified bounding box.
 */
function geoCoordsToMapLayoutUnified(
  cityLatLngs: Array<{ lat: number; lng: number }>,
  plantLatLngs: Array<{ lat: number; lng: number }>
): { cityCoords: Array<{ x: number; y: number }>; plantCoords: Array<{ x: number; y: number }> } {
  const all = [...cityLatLngs, ...plantLatLngs];
  if (all.length === 0) {
    return { cityCoords: [], plantCoords: [] };
  }
  const lats = all.map((l) => l.lat);
  const lngs = all.map((l) => l.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  const project = (lat: number, lng: number) => {
    const nx = (lng - minLng) / lngSpan;
    const ny = (lat - minLat) / latSpan;
    return { x: 50 + nx * 300, y: 350 - ny * 280 };
  };
  return {
    cityCoords: cityLatLngs.map((p) => project(p.lat, p.lng)),
    plantCoords: plantLatLngs.map((p) => project(p.lat, p.lng)),
  };
}

export function projectLatLngToExcelLayout(
  lat: number,
  lng: number,
  cityLatLngs: Array<{ lat: number; lng: number }>,
  plantLatLngs: Array<{ lat: number; lng: number }>
): { x: number; y: number } {
  const all = [...cityLatLngs, ...plantLatLngs];
  if (all.length === 0) {
    return { x: 0, y: 0 };
  }
  const lats = all.map((l) => l.lat);
  const lngs = all.map((l) => l.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  const nx = (lng - minLng) / lngSpan;
  const ny = (lat - minLat) / latSpan;
  return { x: 50 + nx * 300, y: 350 - ny * 280 };
}

export function kosovoBoundsToLayoutRect(
  cityLatLngs: Array<{ lat: number; lng: number }>,
  plantLatLngs: Array<{ lat: number; lng: number }>,
  sw: [number, number],
  ne: [number, number]
): { minX: number; maxX: number; minY: number; maxY: number } {
  const [south, west] = sw;
  const [north, east] = ne;
  const corners = [
    { lat: south, lng: west },
    { lat: south, lng: east },
    { lat: north, lng: east },
    { lat: north, lng: west },
  ];
  const projected = corners.map((c) => projectLatLngToExcelLayout(c.lat, c.lng, cityLatLngs, plantLatLngs));
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function excelCityFields(meta: ExcelMapMeta | null | undefined, i: number, power: number) {
  if (!meta || !meta.cityNames[i]) return {};
  return {
    displayName: meta.cityNames[i],
    demand: meta.demands[i],
    gapVsDemand: power - meta.demands[i],
    coveredBy: meta.coveredBy?.[i],
  };
}

/**
 * Generate geographic coordinates for cities (simulated layout)
 * In a real implementation, these would come from actual geographic data
 */
export function generateCityCoordinates(n: number): Array<{ x: number; y: number }> {
  // Create a grid-like layout with some randomness
  const cols = Math.ceil(Math.sqrt(n));
  const spacing = 65; // Increased spacing between cities
  const startX = 50;
  const startY = 50;
  
  const coordinates: Array<{ x: number; y: number }> = [];
  
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    // Add some randomness to make it look more natural
    const randomX = (Math.random() - 0.5) * 12;
    const randomY = (Math.random() - 0.5) * 12;
    
    coordinates.push({
      x: startX + col * spacing + randomX,
      y: startY + row * spacing + randomY,
    });
  }
  
  return coordinates;
}

/** Plant data for Excel mode map (plants shown with city markers) */
export type ExcelPlantMapData = {
  plants: Array<{ plant_name: string; lat: number; lng: number; power: number; radius: number }>;
  plantKAllocations?: number[];
  coveredCityCounts: number[];
};

/**
 * Convert optimization data to map view format
 */
export function convertToMapData(
  input: SolveInput,
  output: SolveOutput | null,
  currentTrial: TrialTrace | undefined,
  currentStep: FeasibilityStep | undefined,
  targetPower?: number,
  excelMeta?: ExcelMapMeta | null,
  excelPlantData?: ExcelPlantMapData | null,
  /** Optional explicit step index (avoids indexOf failures when step object identity differs). */
  playbackStepIndex?: number
) {
  if (!output) return { cities: [], stations: [], plants: [] };

  const n = input.stations.length;
  let coordinates: Array<{ x: number; y: number }>;
  let plantCoords: Array<{ x: number; y: number }> = [];

  if (excelMeta && excelMeta.latLngs.length === n) {
    if (excelPlantData?.plants?.length) {
      const unified = geoCoordsToMapLayoutUnified(
        excelMeta.latLngs,
        excelPlantData.plants.map((p) => ({ lat: p.lat, lng: p.lng }))
      );
      coordinates = unified.cityCoords;
      plantCoords = unified.plantCoords;
    } else {
      coordinates = geoCoordsToMapLayout(excelMeta.latLngs);
    }
  } else {
    coordinates = generateCityCoordinates(n);
  }

  const isExcelMode = !!excelMeta;
  const effectiveR = isExcelMode ? 0 : input.r;

  // Excel mode: basePower is direct; Manual: from diff
  const basePower = isExcelMode
    ? (output.basePower || input.stations)
    : diffToPower(buildBasePowerDiff(input.stations, input.r));

  let baseDiff: number[];
  if (isExcelMode) {
    const bp = output.basePower || input.stations;
    baseDiff = new Array(n + 1).fill(0);
    baseDiff[0] = bp[0] ?? 0;
    for (let i = 1; i < n; i++) baseDiff[i] = (bp[i] ?? 0) - (bp[i - 1] ?? 0);
  } else {
    baseDiff = buildBasePowerDiff(input.stations, input.r);
  }

  let finalPower = basePower;
  
  // If no trial/step, check if we have finalDistribution (instant solve)
  if (!currentTrial && !currentStep) {
    // For instant solve, use finalDistribution if available
    const powerToUse = output.finalDistribution || basePower;
    
    const cities = powerToUse.map((power, i) => ({
      id: i,
      x: coordinates[i]?.x || 0,
      y: coordinates[i]?.y || 0,
      power, // Final power for instant solve, base power otherwise
      basePower: basePower[i], // Always keep base power for reference
      targetPower,
      ...excelCityFields(excelMeta, i, power),
    }));
    
    // Include existing stations
    const stations: Array<{
      id: number;
      x: number;
      y: number;
      addedPower: number;
      coverageRadius: number;
      citiesCovered: number[];
      isExisting?: boolean;
    }> = [];
    
    for (let i = 0; i < n; i++) {
      if (input.stations[i] > 0) {
        const stationCoord = coordinates[i] || coordinates[Math.min(i, n - 1)];
        const start = Math.max(0, i - effectiveR);
        const end = Math.min(n, i + effectiveR + 1);
        const citiesCovered: number[] = [];
        for (let j = start; j < end; j++) citiesCovered.push(j);

        stations.push({
          id: i,
          x: stationCoord.x,
          y: stationCoord.y,
          addedPower: input.stations[i],
          coverageRadius: isExcelMode ? 15 : input.r * 25,
          citiesCovered,
          isExisting: true,
        });
      }
    }

    const plants = excelPlantData?.plants
      ? excelPlantData.plants.map((p, i) => ({
          id: i,
          x: plantCoords[i]?.x ?? 0,
          y: plantCoords[i]?.y ?? 0,
          plantName: p.plant_name,
          netPower: p.power + (excelPlantData.plantKAllocations?.[i] ?? 0),
          radius: p.radius,
          coveredCityCount: excelPlantData.coveredCityCounts[i] ?? 0,
          addedK: excelPlantData.plantKAllocations?.[i],
        }))
      : [];
    return { cities, stations, plants };
  }
  const stations: Array<{
    id: number;
    x: number;
    y: number;
    addedPower: number;
    coverageRadius: number;
    citiesCovered: number[];
    isNewPlacement?: boolean;
    isActivePlacement?: boolean;
  }> = [];

  // Apply placements from steps
  // IMPORTANT: For the last step of a feasible trial, apply ALL steps (including current step)
  // to show the final solution. For other steps, show state BEFORE current step.
  if (currentTrial && currentStep) {
    const diff = [...baseDiff]; // Start with base power diff
    const nSteps = currentTrial.steps.length;
    let stepIndex: number;
    if (
      typeof playbackStepIndex === 'number' &&
      Number.isFinite(playbackStepIndex) &&
      nSteps > 0
    ) {
      const idx = Math.floor(playbackStepIndex);
      stepIndex = idx < 0 ? 0 : idx >= nSteps ? nSteps - 1 : idx;
    } else {
      const found = currentTrial.steps.indexOf(currentStep);
      stepIndex = found >= 0 ? found : 0;
    }
    const isLastStep = stepIndex === currentTrial.steps.length - 1;
    const isFeasibleTrial = currentTrial.feasible;
    
    // If this is the last step of a feasible trial, apply ALL steps (including current step)
    // Otherwise, apply only steps BEFORE current step
    const stepsToApply = (isLastStep && isFeasibleTrial) ? stepIndex + 1 : stepIndex;
    
    for (let idx = 0; idx < stepsToApply; idx++) {
      const step = currentTrial.steps[idx];
      // Only process steps that were actually placed (feasibleSoFar = true)
      if (step.add > 0 && 
          step.placedAt !== null && 
          step.effectEnd !== null &&
          step.feasibleSoFar) {
        
        const placedAt = step.placedAt;
        const start = Math.max(0, placedAt - effectiveR);
        const end = Math.min(n, step.effectEnd);
        diff[start] += step.add;
        diff[end] -= step.add;

        const stationCoord = coordinates[placedAt] || coordinates[Math.min(placedAt, n - 1)];
        const citiesCovered: number[] = [];
        for (let i = start; i < end; i++) citiesCovered.push(i);

        const isActivePlacement = (idx === stepIndex) && !(isLastStep && isFeasibleTrial);

        stations.push({
          id: placedAt,
          x: stationCoord.x,
          y: stationCoord.y,
          addedPower: step.add,
          coverageRadius: isExcelMode ? 15 : input.r * 20,
          citiesCovered,
          isNewPlacement: true,
          isActivePlacement: isActivePlacement, // Mark as active placement only if not last step
        });
      }
    }
    
    // Calculate power
    // If last step of feasible trial: includes all steps (final state)
    // Otherwise: only includes steps before current step
    finalPower = diffToPower(diff);
    
    // DEBUG: Ensure that for step 0, we're using basePower
    // In step 0, stepIndex === 0, so no steps are applied, diff should equal baseDiff
    if (stepIndex === 0 && !(isLastStep && isFeasibleTrial)) {
      // Force finalPower to be basePower for step 0 (when not last step of feasible trial)
      finalPower = [...basePower];
    }
  } else if (output.finalDistribution) {
    finalPower = output.finalDistribution;

    if (isExcelMode) {
      const bp = output.basePower || input.stations;
      for (let i = 0; i < n; i++) {
        const add = finalPower[i] - (bp[i] ?? 0);
        if (add > 0) {
          const stationCoord = coordinates[i] || coordinates[Math.min(i, n - 1)];
          stations.push({
            id: stations.length + 1,
            x: stationCoord.x,
            y: stationCoord.y,
            addedPower: add,
            coverageRadius: 15,
            citiesCovered: [i],
            isNewPlacement: true,
          });
        }
      }
    } else {
      const diff = buildBasePowerDiff(input.stations, input.r);
      let sum = 0;
      const target = output.answer;

      for (let i = 0; i < n; i++) {
        sum += diff[i];
        if (sum < target) {
          const add = target - sum;
          const placedAt = Math.min(n - 1, i + input.r);
          const start = Math.max(0, placedAt - input.r);
          const end = Math.min(n, placedAt + input.r + 1);

          diff[start] += add;
          diff[end] -= add;
          sum += add;

          const stationCoord = coordinates[placedAt] || coordinates[Math.min(placedAt, n - 1)];
          const citiesCovered: number[] = [];
          for (let j = start; j < end; j++) citiesCovered.push(j);

          stations.push({
            id: stations.length + 1,
            x: stationCoord.x,
            y: stationCoord.y,
            addedPower: add,
            coverageRadius: input.r * 20,
            citiesCovered,
            isNewPlacement: true,
          });
        }
      }
    }
  }

  // Extract existing stations (from base power)
  const existingStations: Array<{
    id: number;
    x: number;
    y: number;
    addedPower: number;
    coverageRadius: number;
    citiesCovered: number[];
    isExisting: boolean;
  }> = [];

  for (let i = 0; i < n; i++) {
    if (input.stations[i] > 0) {
      const stationCoord = coordinates[i];
      const start = Math.max(0, i - effectiveR);
      const end = Math.min(n, i + effectiveR + 1);
      const citiesCovered: number[] = [];
      for (let j = start; j < end; j++) citiesCovered.push(j);

      existingStations.push({
        id: existingStations.length + 1000,
        x: stationCoord.x,
        y: stationCoord.y,
        addedPower: input.stations[i],
        coverageRadius: isExcelMode ? 15 : input.r * 20,
        citiesCovered,
        isExisting: true,
      });
    }
  }

  const cities = coordinates.map((coord, i) => ({
    id: i,
    x: coord.x,
    y: coord.y,
    power: finalPower[i],
    basePower: basePower[i],
    targetPower,
    ...excelCityFields(excelMeta, i, finalPower[i]),
  }));

  // Mark added stations
  const addedStations = stations.map(s => ({ ...s, isExisting: false }));

  // Deduplicate stations by ID (keep the last one if duplicates exist)
  const allStations = [...existingStations, ...addedStations];
  const uniqueStations = Array.from(
    new Map(allStations.map(station => [station.id, station])).values()
  );

  const plants = excelPlantData?.plants
    ? excelPlantData.plants.map((p, i) => ({
        id: i,
        x: plantCoords[i]?.x ?? 0,
        y: plantCoords[i]?.y ?? 0,
        plantName: p.plant_name,
        netPower: p.power + (excelPlantData.plantKAllocations?.[i] ?? 0),
        radius: p.radius,
        coveredCityCount: excelPlantData.coveredCityCounts[i] ?? 0,
        addedK: excelPlantData.plantKAllocations?.[i],
      }))
    : [];

  return { cities, stations: uniqueStations, plants };
}

/**
 * Convert planning data to map view format
 */
export function convertPlanningToMapData(
  input: SolveInput,
  result: PlanningResult | null,
  targetMin: number,
  excelMode?: boolean
) {
  const n = input.stations.length;
  const coordinates = generateCityCoordinates(n);
  const effectiveR = excelMode ? 0 : input.r;

  const basePower = excelMode
    ? (input.stations as number[])
    : diffToPower(buildBasePowerDiff(input.stations, input.r));
  
  const finalPower = result?.finalDistribution || basePower;
  
  // Extract existing stations
  const existingStations: Array<{
    id: number;
    x: number;
    y: number;
    addedPower: number;
    coverageRadius: number;
    citiesCovered: number[];
    isExisting: boolean;
  }> = [];

  for (let i = 0; i < n; i++) {
    if (input.stations[i] > 0) {
      const stationCoord = coordinates[i];
      const start = Math.max(0, i - effectiveR);
      const end = Math.min(n, i + effectiveR + 1);
      const citiesCovered: number[] = [];
      for (let j = start; j < end; j++) citiesCovered.push(j);

      existingStations.push({
        id: existingStations.length + 1000,
        x: stationCoord.x,
        y: stationCoord.y,
        addedPower: input.stations[i],
        coverageRadius: excelMode ? 15 : input.r * 20,
        citiesCovered,
        isExisting: true,
      });
    }
  }

  const addedStations = (result?.placementPlan || []).map((plan, idx) => {
    const stationCoord = coordinates[plan.placementIndex] || coordinates[Math.min(plan.placementIndex, n - 1)];
    return {
      id: idx + 1,
      x: stationCoord.x,
      y: stationCoord.y,
      addedPower: plan.addedPower,
      coverageRadius: excelMode ? 15 : input.r * 20,
      citiesCovered: plan.citiesImproved,
      isExisting: false,
      isNewPlacement: true,
    };
  });

  const cities = coordinates.map((coord, i) => ({
    id: i,
    x: coord.x,
    y: coord.y,
    power: finalPower[i],
    basePower: basePower[i],
    targetPower: targetMin,
  }));

  return { cities, stations: [...existingStations, ...addedStations] };
}
