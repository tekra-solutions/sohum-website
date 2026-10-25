/**
 * Builds public/data/land-dots.json: an evenly spaced grid of points that fall
 * on land, used by the homepage's dotted globe. Re-run after changing spacing:
 *   node scripts/generate-land-dots.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const STEP = 1.25; // degrees of latitude between rows
const geo = JSON.parse(readFileSync("public/data/countries-110m.geojson", "utf8"));

const polygons = [];
for (const f of geo.features) {
  const g = f.geometry;
  if (!g) continue;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  for (const rings of polys) {
    let [minX, minY, maxX, maxY] = [180, 90, -180, -90];
    for (const [x, y] of rings[0]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    polygons.push({ rings, box: [minX, minY, maxX, maxY] });
  }
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function onLand(lng, lat) {
  for (const { rings, box } of polygons) {
    if (lng < box[0] || lng > box[2] || lat < box[1] || lat > box[3]) continue;
    if (inRing(lng, lat, rings[0]) && !rings.slice(1).some((h) => inRing(lng, lat, h))) return true;
  }
  return false;
}

const out = [];
for (let lat = -58; lat <= 82; lat += STEP) {
  const step = STEP / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  for (let lng = -180; lng < 180; lng += step) {
    if (onLand(lng, lat)) out.push(Math.round(lat * 10) / 10, Math.round(lng * 10) / 10);
  }
}
writeFileSync("public/data/land-dots.json", JSON.stringify(out));
console.log(`${out.length / 2} land dots`);
