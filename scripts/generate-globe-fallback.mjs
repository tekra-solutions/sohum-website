/**
 * Generates public/data/mission-fallback.svg: the static globe shown before
 * WebGL loads and whenever it cannot. Uses the same 110m GeoJSON and the same
 * perspective projection as `projectFallback` in src/content/globe.ts.
 *
 *   node scripts/generate-globe-fallback.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const CENTER = { lat: 39, lng: -96 };
// three-globe's camera: 50° vertical field of view, distance (1 + altitude)
// globe radii. At the default altitude of 2 the silhouette radius is 37.9.
const DISTANCE = 3;
const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180);
const R = 50 * Math.sqrt(1 - 1 / DISTANCE ** 2) / (DISTANCE - 1 / DISTANCE) / HALF_FOV_TAN;
const STEP = 1.6; // degrees between dots
const rad = Math.PI / 180;

const geo = JSON.parse(readFileSync("public/data/countries-110m.geojson", "utf8"));

function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng, lat, polygon) {
  if (!inRing(lng, lat, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => inRing(lng, lat, hole));
}

function countryAt(lng, lat) {
  for (const f of geo.features) {
    const { type, coordinates } = f.geometry;
    const polys = type === "Polygon" ? [coordinates] : coordinates;
    if (polys.some((p) => inPolygon(lng, lat, p))) return f.properties.ISO_A3;
  }
  return null;
}

function project(lat, lng) {
  const phi = lat * rad;
  const lambda = (lng - CENTER.lng) * rad;
  const phi0 = CENTER.lat * rad;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda);
  const z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  const k = 50 / (DISTANCE - z) / HALF_FOV_TAN;
  return { x: 50 + x * k, y: 50 - y * k, visible: z > 1 / DISTANCE + 0.02 };
}

const world = [];
const usa = [];
for (let lat = -84; lat <= 84; lat += STEP) {
  // Keep dot spacing even on the sphere rather than in degrees of longitude.
  const lngStep = STEP / Math.max(Math.cos(lat * rad), 0.2);
  for (let lng = -180; lng < 180; lng += lngStep) {
    const p = project(lat, lng);
    if (!p.visible) continue;
    const iso = countryAt(lng, lat);
    if (!iso) continue;
    (iso === "USA" ? usa : world).push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r=".3"/>`);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
  `<circle cx="50" cy="50" r="${R.toFixed(2)}" fill="#0b1424" stroke="#38bdf8" stroke-opacity=".3" stroke-width=".3"/>` +
  `<g fill="#38bdf8" fill-opacity=".3">${world.join("")}</g>` +
  `<g fill="#38bdf8" fill-opacity=".85">${usa.join("")}</g></svg>\n`;

writeFileSync("public/data/mission-fallback.svg", svg);
console.log(`mission-fallback.svg: ${world.length + usa.length} dots, ${(svg.length / 1024).toFixed(1)} KB`);
