/** Approximate Kosovo bounding box (WGS84). SW / NE as [lat, lng]. */
export const KOSOVO_SW: [number, number] = [41.85, 20.0];
export const KOSOVO_NE: [number, number] = [43.3, 21.8];

const [south, west] = KOSOVO_SW;
const [north, east] = KOSOVO_NE;

export function isLatLngInsideKosovoBounds(p: { lat: number; lng: number }): boolean {
  return p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east;
}

export function allLatLngsInsideKosovoBounds(points: Array<{ lat: number; lng: number }>): boolean {
  if (!points.length) return false;
  return points.every(isLatLngInsideKosovoBounds);
}
