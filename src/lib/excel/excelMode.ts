import * as XLSX from 'xlsx';

export type ParsedCityRow = {
  city_name: string;
  lat: number;
  lng: number;
  demand: number;
  priority?: number;
  city_id?: number;
};

export type ParsedPlantRow = {
  plant_name: string;
  lat: number;
  lng: number;
  power: number;
  radius: number;
  plant_id?: number;
  type?: string;
};

export type ComputedCityPower = ParsedCityRow & {
  current_power: number;
  gap: number;
  covered_by: Array<{ plant_name: string; contribution: number }>;
};

function normalizeHeader(key: string): string {
  return String(key).trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeHeader(k)] = v;
    }
    return out;
  });
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function validateCitiesData(rows: Record<string, unknown>[]): { ok: true; rows: ParsedCityRow[] } | { ok: false; error: string } {
  if (!rows.length) {
    return { ok: false, error: 'cities.xlsx has no data rows.' };
  }
  const norm = normalizeRows(rows);
  const parsed: ParsedCityRow[] = [];
  for (let i = 0; i < norm.length; i++) {
    const r = norm[i];
    const name = r.city_name != null ? String(r.city_name).trim() : '';
    const lat = toNumber(r.lat);
    const lng = toNumber(r.lng);
    const demandRaw =
      toNumber(r.demand) ??
      toNumber(r.base_demand_num) ??
      toNumber(r.base_demand) ??
      toNumber(r.base_demand_mw) ??
      (() => {
        for (const key of Object.keys(r)) {
          const nk = normalizeHeader(key);
          if (nk.includes('base_demand') && nk.includes('num')) {
            return toNumber(r[key]);
          }
        }
        return null;
      })();
    if (!name) {
      return { ok: false, error: `cities.xlsx row ${i + 2}: missing city_name.` };
    }
    if (lat === null || lng === null) {
      return { ok: false, error: `cities.xlsx row ${i + 2}: invalid lat/lng.` };
    }
    if (demandRaw === null || demandRaw < 0) {
      return { ok: false, error: `cities.xlsx row ${i + 2}: invalid demand (use demand or base_demand_num).` };
    }
    const pr = toNumber(r.priority);
    const cid = toNumber(r.city_id);
    parsed.push({
      city_name: name,
      lat,
      lng,
      demand: demandRaw,
      priority: pr !== null ? Math.floor(pr) : undefined,
      city_id: cid !== null ? Math.floor(cid) : undefined,
    });
  }
  return { ok: true, rows: parsed };
}

export function validatePlantsData(rows: Record<string, unknown>[]): { ok: true; rows: ParsedPlantRow[] } | { ok: false; error: string } {
  if (!rows.length) {
    return { ok: false, error: 'plants.xlsx has no data rows.' };
  }
  const norm = normalizeRows(rows);
  const parsed: ParsedPlantRow[] = [];
  for (let i = 0; i < norm.length; i++) {
    const r = norm[i];
    const name = r.plant_name != null ? String(r.plant_name).trim() : '';
    const lat = toNumber(r.lat);
    const lng = toNumber(r.lng);
    const power =
      toNumber(r.power) ??
      toNumber(r.net_power_mw) ??
      (() => {
        for (const key of Object.keys(r)) {
          const nk = normalizeHeader(key);
          if (nk.includes('net_power')) return toNumber(r[key]);
        }
        return null;
      })();
    const radius =
      toNumber(r.radius) ??
      toNumber(r.radius_km) ??
      (() => {
        for (const key of Object.keys(r)) {
          const nk = normalizeHeader(key);
          if (nk.startsWith('radius')) return toNumber(r[key]);
        }
        return null;
      })();
    if (!name) {
      return { ok: false, error: `plants.xlsx row ${i + 2}: missing plant_name.` };
    }
    if (lat === null || lng === null) {
      return { ok: false, error: `plants.xlsx row ${i + 2}: invalid lat/lng.` };
    }
    if (power === null || power < 0) {
      return { ok: false, error: `plants.xlsx row ${i + 2}: invalid power (use power or net_power_mw).` };
    }
    if (radius === null || radius <= 0) {
      return { ok: false, error: `plants.xlsx row ${i + 2}: invalid radius (use radius or radius_km).` };
    }
    const pid = toNumber(r.plant_id);
    const typ = r.type != null ? String(r.type).trim() : undefined;
    parsed.push({
      plant_name: name,
      lat,
      lng,
      power,
      radius,
      plant_id: pid !== null ? Math.floor(pid) : undefined,
      type: typ,
    });
  }
  return { ok: true, rows: parsed };
}

async function readSheetRows(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

export async function parseCitiesExcel(file: File): Promise<Record<string, unknown>[]> {
  return readSheetRows(file);
}

export async function parsePlantsExcel(file: File): Promise<Record<string, unknown>[]> {
  return readSheetRows(file);
}

export function computeCityPowers(cities: ParsedCityRow[], plants: ParsedPlantRow[]): ComputedCityPower[] {
  return computeCityPowersWithPlantPowers(
    cities,
    plants,
    plants.map((p) => p.power)
  );
}

/** Like computeCityPowers but with explicit power per plant (for Real Mode allocations) */
export function computeCityPowersWithPlantPowers(
  cities: ParsedCityRow[],
  plants: ParsedPlantRow[],
  plantPowers: number[]
): ComputedCityPower[] {
  return cities.map((city) => {
    let fromPlants = 0;
    const covered_by: Array<{ plant_name: string; contribution: number }> = [];
    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i];
      const power = plantPowers[i] ?? plant.power;
      const distance_km = haversineDistance(city.lat, city.lng, plant.lat, plant.lng);
      if (distance_km <= plant.radius) {
        const raw = power * (1 - distance_km / plant.radius);
        const contribution = Math.floor(raw);
        fromPlants += contribution;
        covered_by.push({ plant_name: plant.plant_name, contribution });
      }
    }
    const baseDemand = Math.floor(city.demand);
    const current_power = baseDemand + fromPlants;
    return {
      ...city,
      current_power,
      gap: current_power - city.demand,
      covered_by,
    };
  });
}

export function buildStationsArrayFromCities(computed: ComputedCityPower[]): number[] {
  return computed.map((c) => Math.floor(c.current_power));
}

/** Integer city powers from plants (same as stations row after Excel load) */
export function floorCityPowersFromPlants(
  cities: ParsedCityRow[],
  plants: ParsedPlantRow[],
  plantPowers: number[]
): number[] {
  return computeCityPowersWithPlantPowers(cities, plants, plantPowers).map((c) => Math.floor(c.current_power));
}

export function findWeakestCityIndex(computed: ComputedCityPower[]): number {
  if (computed.length === 0) return 0;
  let minIdx = 0;
  let minP = computed[0].current_power;
  for (let i = 1; i < computed.length; i++) {
    if (computed[i].current_power < minP) {
      minP = computed[i].current_power;
      minIdx = i;
    }
  }
  return minIdx;
}

/** Label for UI: Excel city name when available, otherwise `City {index}`. */
export function cityDisplayName(names: string[] | undefined, index: number): string {
  const raw = names?.[index];
  if (raw !== undefined && String(raw).trim() !== '') return String(raw).trim();
  return `City ${index}`;
}
