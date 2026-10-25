/**
 * Mission globe data: layers, features, and the geometry helpers the globe and
 * its static fallback share.
 *
 * Verify every coordinate before launch. Coordinates are public reference points:
 * the company headquarters, places of performance from federal award records,
 * and the offices that administer each contract vehicle. Only headquarters is a
 * Sohum office; every other marker says so in its description.
 */
import {
  contact,
  formatDate,
  is8aActive,
  orderingClosesIn,
  procurement,
  sba8a,
  site,
  vehicleStatus,
  vehicles,
  type Vehicle,
} from "./company";

export type LayerId = "delivery" | "vehicles" | "hub";

export type Layer = { id: LayerId; name: string; color: string; description: string };

/** Azure for data, the brand orange only for headquarters (see `HQ_COLOR`). */
export const layers: Layer[] = [
  {
    id: "delivery",
    name: "Delivery",
    color: "#38bdf8",
    description: "Headquarters and places of performance from federal award records",
  },
  {
    id: "vehicles",
    name: "Contract vehicles",
    color: "#7dd3fc",
    description: "Agencies that administer the vehicles we hold",
  },
  {
    id: "hub",
    name: "Federal mission hub",
    color: "#c4b5fd",
    description: "Where most federal requirements are defined and awarded",
  },
];

export const HQ_COLOR = "#fa752e";

export type DataRow = { label: string; value: string };

export type Feature = {
  id: string;
  layer: LayerId;
  title: string;
  /** Hover tooltip. */
  label: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  href: string;
  linkLabel: string;
  data: (day: string) => DataRow[];
  /** Hidden on days this returns false (for example, after a vehicle expires). */
  visible?: (day: string) => boolean;
};

export const HQ = { lat: 38.86, lng: -94.7 };

export const defaultView = { lat: 39, lng: -96, altitude: 2.0 };
/** 1.8 rather than 1.6 keeps the atmosphere glow inside the canvas. */
export const focusAltitude = 1.8;

function vehicleRows(v: Vehicle, day: string): DataRow[] {
  const closes = orderingClosesIn(v, day);
  return [
    { label: "Status", value: vehicleStatus(v, day) },
    { label: "Contract number", value: v.number },
    {
      label: "Ordering period",
      value: `${formatDate(v.orderingStartsOn)} – ${formatDate(v.orderingEndsOn)}`,
    },
    ...(closes !== null
      ? [{ label: "Ordering closes in", value: `${closes} day${closes === 1 ? "" : "s"}` }]
      : []),
    ...(v.taskOrdersEndOn
      ? [{ label: "Task orders may run through", value: formatDate(v.taskOrdersEndOn) }]
      : []),
    { label: "Order types", value: v.orderTypes },
  ];
}

function vehicleFeature(slug: string, place: string, lat: number, lng: number): Feature {
  const v = vehicles.find((x) => x.slug === slug);
  if (!v) throw new Error(`Unknown vehicle ${slug}`);
  return {
    id: v.slug,
    layer: "vehicles",
    title: v.name,
    label: `${v.name} · ${place}`,
    type: "Contract vehicle",
    description: `${v.full}, administered by ${v.holder}. The marker shows the administering agency in ${place}, not a Sohum office.`,
    lat,
    lng,
    href: `/contract-vehicles#${v.slug}`,
    linkLabel: `How to order on ${v.name}`,
    data: (day) => vehicleRows(v, day),
    visible: (day) => vehicleStatus(v, day) !== "Expired",
  };
}

export const features: Feature[] = [
  {
    id: "hq",
    layer: "delivery",
    title: "Headquarters",
    label: `Headquarters · ${procurement.headquarters} · since ${site.founded}`,
    type: "Company headquarters",
    description: `Sohum Systems was founded in ${procurement.headquarters} in ${site.founded}. Federal work, including FMCSA's SAFESPECT inspection platform, is performed here.`,
    lat: HQ.lat,
    lng: HQ.lng,
    href: "/contact",
    linkLabel: "Contact headquarters",
    data: () => [
      { label: "Address", value: contact.address },
      { label: "UEI", value: procurement.uei },
      { label: "CAGE", value: procurement.cage },
    ],
  },
  {
    id: "dfad",
    layer: "delivery",
    title: "DFAD · USDA Farm Service Agency",
    label: "DFAD program work · Kansas City, MO",
    type: "Place of performance",
    description:
      "GIS, financial-systems, and reporting work for the Farm Service Agency's DFAD program. The marker shows where the work was performed under the award record, not a Sohum office.",
    lat: 39.0997,
    lng: -94.5786,
    href: "#past-performance",
    linkLabel: "Read the DFAD summary",
    data: () => [
      { label: "Contract", value: "IDIQ AG3151C140045" },
      { label: "Period", value: "Sep 2014 – Mar 2022" },
      { label: "NAICS", value: "541511" },
    ],
  },
  {
    id: "navy",
    layer: "delivery",
    title: "U.S. Navy · Port Hueneme, CA",
    label: "Navy program work · Port Hueneme, CA",
    type: "Place of performance",
    description:
      "Integrated technical documentation and logistics program management for the Navy, ordered on SeaPort NxG and performed at Naval Base Ventura County. The marker shows the place of performance, not a Sohum office.",
    lat: 34.1617,
    lng: -119.2072,
    href: "/contract-vehicles#seaport-nxg",
    linkLabel: "How to order on SeaPort NxG",
    data: () => [
      { label: "Task order", value: "N6339421F3005" },
      { label: "Period", value: "Aug 2021 – Aug 2026" },
      { label: "Contract type", value: "Cost-plus-fixed-fee" },
      { label: "NAICS", value: "541330" },
    ],
  },
  vehicleFeature("gsa-mas", "Washington, DC", 38.8973, -77.0425),
  vehicleFeature("seaport-nxg", "the Washington Navy Yard, DC", 38.8742, -76.9953),
  vehicleFeature("cio-sp3", "Bethesda, MD", 39.0003, -77.1022),
  {
    id: "8a",
    layer: "vehicles",
    title: "SBA 8(a)",
    label: "SBA 8(a) · Washington, DC",
    type: "Socioeconomic program",
    description:
      "The SBA 8(a) program lets contracting officers award directly within program thresholds. The marker shows SBA headquarters, not a Sohum office.",
    lat: 38.8843,
    lng: -77.0163,
    href: "/contract-vehicles",
    linkLabel: "8(a) sole-source details",
    data: () => [{ label: "Program term", value: `${formatDate(sba8a.entersOn)} – ${formatDate(sba8a.exitsOn)}` }],
    visible: is8aActive,
  },
  {
    id: "ncr",
    layer: "hub",
    title: "National Capital Region",
    label: "National Capital Region",
    type: "Federal mission hub",
    description:
      "Where most federal requirements are defined and awarded. This is a reference region for buyers, not an additional Sohum office.",
    lat: 38.9,
    lng: -77.04,
    href: "/federal",
    linkLabel: "Our federal mission focus",
    data: () => [{ label: "Region", value: "Washington, DC · Maryland · Virginia" }],
  },
];

export function getFeature(id: string | null | undefined): Feature | undefined {
  return id ? features.find((f) => f.id === id) : undefined;
}

export function visibleFeatures(enabled: readonly LayerId[], day: string): Feature[] {
  return features.filter((f) => enabled.includes(f.layer) && (f.visible?.(day) ?? true));
}

export function featureColor(f: Feature): string {
  return f.id === "hq" ? HQ_COLOR : layers.find((l) => l.id === f.layer)!.color;
}

/* --------------------------------------------------------------- Sites */

/**
 * Features closer than this render as one site. At the globe's scale a pixel
 * is ~20 km, so the Kansas City metro and the DC region would otherwise stack
 * markers on top of each other. Clicking a site works like a GIS "identify":
 * the inspector lists every feature at that location.
 */
const SITE_RADIUS_KM = 150;

export type Site = { id: string; lat: number; lng: number; features: Feature[] };

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Greedy grouping in feature order, so the first feature anchors each site. */
export function groupSites(list: Feature[]): Site[] {
  const sites: Site[] = [];
  for (const f of list) {
    const near = sites.find((s) => distanceKm(s, f) < SITE_RADIUS_KM);
    if (near) near.features.push(f);
    else sites.push({ id: f.id, lat: f.lat, lng: f.lng, features: [f] });
  }
  return sites;
}

export function siteColor(s: Site): string {
  return featureColor(s.features[0]);
}

/* ---------------------------------------------------------- Projection */

/**
 * Projects a coordinate onto `public/data/mission-fallback.svg` (viewBox
 * 0 0 100 100) exactly as three-globe's camera sees it at the default view:
 * 50° vertical field of view, camera (1 + altitude) globe radii from centre.
 * Regenerate the SVG with `node scripts/generate-globe-fallback.mjs`.
 */
const CAMERA_DISTANCE = 1 + defaultView.altitude;
const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180);

export const FALLBACK_RADIUS =
  (50 * Math.sqrt(1 - 1 / CAMERA_DISTANCE ** 2)) / (CAMERA_DISTANCE - 1 / CAMERA_DISTANCE) / HALF_FOV_TAN;

export function projectFallback(lat: number, lng: number) {
  const rad = Math.PI / 180;
  const phi = lat * rad;
  const lambda = (lng - defaultView.lng) * rad;
  const phi0 = defaultView.lat * rad;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda);
  const z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  const k = 50 / (CAMERA_DISTANCE - z) / HALF_FOV_TAN;
  return { x: 50 + x * k, y: 50 - y * k, visible: z > 1 / CAMERA_DISTANCE };
}
