"use client";

import { useEffect, useRef } from "react";

/**
 * "Living data planet", drawn on a 2D canvas with no 3D library.
 *
 *  - Assembly: on load, every land particle flies in and locks into place.
 *  - Day and night: a fixed sun lights the planet; continents turn through a
 *    warm twilight band into night, where city lights trace the coastlines.
 *  - Data arcs: great-circle arcs rise between land points; each landing sends
 *    a ripple across the surface and flares the land around it.
 *  - Scan: a luminous latitude ring sweeps the planet every few seconds.
 *  - Orbits: two inclined rings carry light pulses in front of and behind it.
 *  - Lens: hovering opens a fisheye lens with a live latitude / longitude.
 *  - Drag: mouse or pen can grab and fling the planet; it coasts back to spin.
 *    The planet also leans a few degrees toward the cursor.
 *  - Quality: if frames run slow (older laptops, virtual desktops), it drops to
 *    1x resolution and skips glow blurs rather than stutter.
 *  - Unroll: with `unroll`, scrolling away flattens the globe into a map.
 *
 * Land is a precomputed dot grid (scripts/generate-land-dots.mjs). With
 * reduced motion the planet is drawn once, assembled and still.
 */

const DEG = Math.PI / 180;
const ORANGE = "250,117,46";
const BLUE = "70,120,255";

type V3 = { x: number; y: number; z: number };

const norm = (v: V3): V3 => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};
const dot3 = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

/**
 * Fixed to the camera, low and to the right: the day side holds the right of
 * the frame and the terminator runs through the open space beside the copy,
 * so the night side, with its city lights, is in view rather than under it.
 */
const SUN = norm({ x: 0.85, y: 0.38, z: 0.22 });

function toVec(lat: number, lng: number): V3 {
  const p = lat * DEG, l = lng * DEG;
  return { x: Math.cos(p) * Math.sin(l), y: Math.sin(p), z: Math.cos(p) * Math.cos(l) };
}

/** World → view: spin by lng0, then tilt by lat0. */
function view(v: V3, lat0: number, lng0: number): V3 {
  const l = -lng0 * DEG, p = lat0 * DEG;
  const x1 = v.x * Math.cos(l) + v.z * Math.sin(l);
  const z1 = -v.x * Math.sin(l) + v.z * Math.cos(l);
  return { x: x1, y: v.y * Math.cos(p) - z1 * Math.sin(p), z: v.y * Math.sin(p) + z1 * Math.cos(p) };
}

/** View → world, the inverse of `view`. */
function unview(v: V3, lat0: number, lng0: number): V3 {
  const l = -lng0 * DEG, p = lat0 * DEG;
  const y = v.y * Math.cos(p) + v.z * Math.sin(p);
  const z1 = -v.y * Math.sin(p) + v.z * Math.cos(p);
  return { x: v.x * Math.cos(l) - z1 * Math.sin(l), y, z: v.x * Math.sin(l) + z1 * Math.cos(l) };
}

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const ease = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);
const easeInOut = (k: number) => {
  const x = clamp01(k);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
/** Hidden behind the planet: on the far side and inside its silhouette. */
const occluded = (p: V3) => p.z < 0 && p.x * p.x + p.y * p.y < 1;

/** An orbit: a circle of radius r around the planet, tilted by `inc` and turned by `node`. */
type Orbit = { r: number; inc: number; node: number; speed: number; phase: number };
const ORBITS: Orbit[] = [
  { r: 1.16, inc: 62, node: 20, speed: 0.22, phase: 0 },
  { r: 1.3, inc: -28, node: -35, speed: -0.14, phase: 2.1 },
];

function orbitPoint(o: Orbit, a: number): V3 {
  const x = Math.cos(a) * o.r, z = Math.sin(a) * o.r;
  const i = o.inc * DEG, n = o.node * DEG;
  const y1 = -z * Math.sin(i), z1 = z * Math.cos(i);
  return { x: x * Math.cos(n) + z1 * Math.sin(n), y: y1, z: -x * Math.sin(n) + z1 * Math.cos(n) };
}

type Arc = { a: V3; b: V3; om: number; h: number; t0: number; dur: number; landed: boolean };
type Ripple = { c: V3; e1: V3; e2: V3; t0: number; big: boolean };

/** Point along a great-circle arc, lifted off the surface toward the middle. */
function arcPoint(arc: Arc, s: number): V3 {
  const so = Math.sin(arc.om);
  const ka = Math.sin((1 - s) * arc.om) / so, kb = Math.sin(s * arc.om) / so;
  const lift = 1 + arc.h * Math.sin(Math.PI * s);
  return {
    x: (arc.a.x * ka + arc.b.x * kb) * lift,
    y: (arc.a.y * ka + arc.b.y * kb) * lift,
    z: (arc.a.z * ka + arc.b.z * kb) * lift,
  };
}

function ripple(c: V3, t0: number, big: boolean): Ripple {
  const up = Math.abs(c.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const e1 = norm(cross(up, c));
  return { c, e1, e2: cross(c, e1), t0, big };
}

const mix = (a: number[], b: number[], k: number) =>
  `${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)}`;
const RGB_BLUE = [91, 132, 255], RGB_ORANGE = [250, 117, 46];

/** Dragging starts only on empty space, never on controls, images, or words. */
const SOLID = "a,button,input,select,textarea,label,summary,img,svg";
const TEXT = "h1,h2,h3,h4,p,li,dt,dd,span";

export function DotGlobe({
  tilt = 18,
  spin = 4,
  unroll = false,
  lens = true,
  startLng = -40,
  className = "",
}: {
  /** Degrees the north pole leans toward the viewer. */
  tilt?: number;
  /** Rotation speed in degrees per second. */
  spin?: number;
  /** Flatten into a world map as the page scrolls. */
  unroll?: boolean;
  /** Inspection lens on hover. */
  lens?: boolean;
  startLng?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = getComputedStyle(canvas).fontFamily;
    const host = (canvas.closest("section") as HTMLElement | null) ?? canvas;
    let n = 0;
    let lat = new Float32Array(0), lng = new Float32Array(0);
    let world: V3[] = [];
    let energy = new Float32Array(0);
    let seedA = new Float32Array(0), seedR = new Float32Array(0), delay = new Float32Array(0);
    let city = new Uint8Array(0), twRate = new Float32Array(0), twPhase = new Float32Array(0);
    const arcs: Arc[] = [];
    const ripples: Ripple[] = [];

    let raf = 0, visible = true, w = 0, h = 0, dpr = 1;
    let last = performance.now(), born = last, lng0 = startLng, burstClock = 0;
    let scanClock = 0, arcClock = 0, nextArc = 0.4;
    let flat = 0, Rcur = 0;
    const ptr = { x: -1e4, y: -1e4, on: false, s: 0, sx: -1e4, sy: -1e4 };
    const drag = { on: false, x: 0, y: 0, t: 0, vel: 0, tilt: 0 };
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    let cursor = "";
    let frameMs = 16.7, lowQ = false;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = lowQ ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (reduced) draw(performance.now());
    };

    /** Flare the land around a point, strongest at the centre. */
    const energize = (c: V3, radiusDeg: number) => {
      const lim = Math.cos(radiusDeg * DEG);
      for (let i = 0; i < n; i++) {
        const d = dot3(world[i], c);
        if (d > lim) energy[i] = Math.max(energy[i], 0.35 + 0.65 * ((d - lim) / (1 - lim)));
      }
    };

    /**
     * Arcs launch and land where the visitor can see them: on the visible face,
     * inside the viewport, and clear of the hero copy (left on wide screens; on
     * narrow ones the copy fills the width, so arcs keep to the upper right).
     */
    const spawnArc = (t: number, lat0: number, R: number) => {
      const r = canvas.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const wide = vw >= 1024;
      const x0 = (wide ? vw * 0.5 : vw * 0.56) - r.left, x1 = vw - 16 - r.left;
      const y0 = 90 - r.top, y1 = (wide ? vh - 120 : vh * 0.6) - r.top;
      const cx = w / 2, cy = h / 2;
      const pool: number[] = [];
      for (let k = 0; k < 500 && pool.length < 60; k++) {
        const i = (Math.random() * n) | 0;
        const v = view(world[i], lat0, lng0);
        if (v.z < 0.22) continue;
        const sx = cx + v.x * R, sy = cy - v.y * R;
        if (sx > x0 && sx < x1 && sy > y0 && sy < y1) pool.push(i);
      }
      if (pool.length < 2) return;
      const a = world[pool[0]];
      const lo = Math.cos(70 * DEG), hi = Math.cos(12 * DEG);
      for (let k = 1; k < pool.length; k++) {
        const b = world[pool[k]];
        const d = dot3(a, b);
        if (d > lo && d < hi) {
          const om = Math.acos(d);
          arcs.push({ a, b, om, h: 0.04 + 0.2 * (om / (70 * DEG)), t0: t, dur: 1.2 + om * 1.4, landed: false });
          ripples.push(ripple(a, t, false));
          return;
        }
      }
    };

    function draw(now: number) {
      if (!ctx) return;
      const raw = now - last;
      const dt = Math.min(0.05, raw / 1000);
      last = now;
      const t = reduced ? 99 : (now - born) / 1000;
      if (!reduced && raw > 0 && raw < 250) frameMs += (raw - frameMs) * 0.04;
      if (!lowQ && t > 5 && frameMs > 26) {
        lowQ = true;
        resize();
      }

      // Scroll-driven unroll, eased toward its target for smoothness.
      const target = unroll && !reduced ? clamp01(window.scrollY / (window.innerHeight * 0.55)) : 0;
      flat += (target - flat) * Math.min(1, dt * 8);
      const u = ease(flat);
      const globeA = 1 - u;

      // Spin, plus any fling left over from a drag; tilt drifts back to rest.
      if (!reduced && !drag.on) {
        lng0 += (spin * (1 - u) + drag.vel) * dt;
        drag.vel *= Math.exp(-dt * 1.6);
        drag.tilt *= Math.exp(-dt * 0.9);
      }
      const leanK = Math.min(1, dt * 2.2);
      lean.x += (lean.tx - lean.x) * leanK;
      lean.y += (lean.ty - lean.y) * leanK;
      const lat0 = (tilt + drag.tilt - lean.y * 3.5) * (1 - u);
      const R = Math.min(w, h) * 0.4 * (0.92 + 0.08 * ease(t / 2));
      Rcur = R;
      const cx = w / 2 + lean.x * 14 * (1 - u), cy = h / 2 + lean.y * 10 * (1 - u);
      const mapW = R * 1.25, mapH = R * 0.62;
      const toX = (p: V3) => cx + p.x * R, toY = (p: V3) => cy - p.y * R;

      // Lens follows the pointer with a little lag.
      ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 14);
      ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 14);
      const overGlobe = Math.hypot(ptr.sx - cx, ptr.sy - cy) < R * 0.98;
      const overMap = Math.abs(ptr.sx - cx) < mapW && Math.abs(ptr.sy - cy) < mapH;
      const want = lens && ptr.on && !drag.on && (u < 0.5 ? overGlobe : overMap) ? 1 : 0;
      ptr.s += (want - ptr.s) * Math.min(1, dt * 7);
      const LR = R * 0.24, k = 1.4 * ptr.s;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const intro = ease(t / 1.2);

      /* ---------- atmosphere, body, and sunlight ---------- */
      if (globeA > 0.01) {
        ctx.globalAlpha = globeA * intro;
        const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.24);
        halo.addColorStop(0, `rgba(${BLUE},0.24)`);
        halo.addColorStop(1, `rgba(${BLUE},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2); ctx.fill();

        // Sunlit side of the atmosphere glows a little wider.
        const sx = cx + SUN.x * R * 0.12, sy = cy - SUN.y * R * 0.12;
        const glow = ctx.createRadialGradient(sx, sy, R * 0.95, sx, sy, R * 1.2);
        glow.addColorStop(0, "rgba(150,185,255,0.26)");
        glow.addColorStop(1, "rgba(150,185,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sx, sy, R * 1.2, 0, Math.PI * 2); ctx.fill();

        const lx = cx + SUN.x * R * 0.5, ly = cy - SUN.y * R * 0.5;
        const body = ctx.createRadialGradient(lx, ly, R * 0.05, cx, cy, R);
        body.addColorStop(0, "rgb(22,34,62)");
        body.addColorStop(0.55, "rgb(9,13,26)");
        body.addColorStop(0.85, "rgb(5,7,14)");
        body.addColorStop(1, `rgba(${BLUE},0.4)`);
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

        // Terminator: the far side of the sun falls into shadow.
        const shade = ctx.createLinearGradient(cx + SUN.x * R, cy - SUN.y * R, cx - SUN.x * R, cy + SUN.y * R);
        shade.addColorStop(0, "rgba(140,175,255,0.08)");
        shade.addColorStop(0.42, "rgba(140,175,255,0.02)");
        shade.addColorStop(0.58, "rgba(0,0,0,0)");
        shade.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = shade;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

        const rim = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
        rim.addColorStop(0, `rgba(${ORANGE},1)`);
        rim.addColorStop(0.45, `rgba(${ORANGE},0.25)`);
        rim.addColorStop(0.7, `rgba(${BLUE},0.55)`);
        rim.addColorStop(1, `rgba(${BLUE},1)`);
        ctx.save();
        ctx.shadowColor = `rgba(${ORANGE},0.85)`;
        ctx.shadowBlur = lowQ ? 0 : 28;
        ctx.strokeStyle = rim;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // The night limb falls dark (this side sits beside the headline)...
        const sunX = cx + SUN.x * R, sunY = cy - SUN.y * R;
        const night = ctx.createLinearGradient(sunX, sunY, cx - SUN.x * R, cy + SUN.y * R);
        night.addColorStop(0.45, "rgba(5,7,13,0)");
        night.addColorStop(1, "rgba(5,7,13,0.7)");
        ctx.strokeStyle = night;
        ctx.lineWidth = R * 0.07;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, 0, Math.PI * 2); ctx.stroke();

        // ...while sunlight scatters into a thin bright crescent on the lit limb.
        const crescent = ctx.createLinearGradient(sunX, sunY, cx, cy);
        crescent.addColorStop(0, "rgba(205,225,255,0.85)");
        crescent.addColorStop(0.55, "rgba(205,225,255,0)");
        ctx.strokeStyle = crescent;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, R - 1.2, 0, Math.PI * 2); ctx.stroke();

        // Graticule: a faint instrument grid on the visible face.
        ctx.strokeStyle = "rgba(170,195,255,0.07)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const line = (pt: (s: number) => V3, steps: number) => {
          let prev: V3 | null = null;
          for (let s = 0; s <= steps; s++) {
            const p = view(pt(s / steps), lat0, lng0);
            if (p.z > 0 && prev && prev.z > 0) { ctx.moveTo(toX(prev), toY(prev)); ctx.lineTo(toX(p), toY(p)); }
            prev = p;
          }
        };
        for (let g = -60; g <= 60; g += 30) line((s) => toVec(g, s * 360 - 180), 90);
        for (let g = -180; g < 180; g += 30) line((s) => toVec(s * 160 - 80, g), 48);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* ---------- orbits (back halves first) ---------- */
      const drawOrbits = (front: boolean) => {
        if (globeA < 0.02) return;
        for (const o of ORBITS) {
          const head = o.phase + t * o.speed * Math.PI * 2;
          ctx.lineWidth = 1;
          for (let s = 0; s < 120; s++) {
            const a0 = (s / 120) * Math.PI * 2, a1 = ((s + 1) / 120) * Math.PI * 2;
            const p0 = view(orbitPoint(o, a0), lat0, 0), p1 = view(orbitPoint(o, a1), lat0, 0);
            if (occluded(p0) === front) continue;
            ctx.strokeStyle = `rgba(255,255,255,${(front ? 0.16 : 0.05) * globeA})`;
            ctx.beginPath();
            ctx.moveTo(toX(p0), toY(p0));
            ctx.lineTo(toX(p1), toY(p1));
            ctx.stroke();
          }
          for (let j = 0; j < 26; j++) {
            const a = head - j * 0.035 * Math.sign(o.speed);
            const p = view(orbitPoint(o, a), lat0, 0);
            if (occluded(p) === front) continue;
            const fade = (1 - j / 26) * globeA * (front ? 1 : 0.25);
            ctx.fillStyle = j === 0 ? `rgba(255,255,255,${fade})` : `rgba(${ORANGE},${fade * 0.8})`;
            ctx.beginPath(); ctx.arc(toX(p), toY(p), j === 0 ? 2.6 : 1.8 * (1 - j / 30), 0, Math.PI * 2); ctx.fill();
          }
        }
      };
      drawOrbits(false);

      /* ---------- scan ring timing: a sweep, then a rest ---------- */
      const SCAN_SPEED = 16, SCAN_SPAN = 100, SCAN_REST = 6;
      if (!reduced && t > 1.6) scanClock += dt;
      const ph = scanClock % (SCAN_SPAN / SCAN_SPEED + SCAN_REST);
      const scan = -40 + ph * SCAN_SPEED;
      const scanOn = !reduced && t > 1.6 && globeA > 0.05 && scan <= 60;

      /* ---------- arcs: spawn, and land into ripples ---------- */
      if (!reduced && t > 3.4 && globeA > 0.6) {
        arcClock += dt;
        if (arcClock > nextArc && arcs.length < (window.innerWidth >= 1024 ? 5 : 3)) {
          arcClock = 0;
          nextArc = 0.6 + Math.random() * 1.1;
          spawnArc(t, lat0, R);
        }
      }
      for (const arc of arcs) {
        if (!arc.landed && t - arc.t0 >= arc.dur) {
          arc.landed = true;
          ripples.push(ripple(arc.b, t, true));
          energize(arc.b, 5);
        }
      }

      /* ---------- land particles ---------- */
      // Batched by colour: 7 night-to-day levels, 3 twilight, 3 city-light, 4 hot.
      const cool: number[][] = Array.from({ length: 7 }, () => []);
      const dusk: number[][] = [[], [], []];
      const lights: number[][] = [[], [], []];
      const hot: number[][] = [[], [], [], []];
      const spikes: number[][] = [[], [], []];
      const decay = Math.exp(-dt * 1.5);
      burstClock += dt;
      if (!reduced && burstClock > 0.2 && n) {
        burstClock = 0;
        energy[(Math.random() * n) | 0] = 1;
      }
      const base = Math.max(1.2, R / 330);

      for (let i = 0; i < n; i++) {
        if (scanOn && Math.abs(lat[i] - scan) < 1.4) energy[i] = 1;
        else energy[i] *= decay;
        const e = energy[i];

        const v = view(world[i], lat0, lng0);
        const gx = cx + v.x * R, gy = cy - v.y * R;
        let settled = true;
        const fx = cx + (wrap(lng[i] - lng0) / 180) * mapW, fy = cy - (lat[i] / 90) * mapH;
        let alpha = v.z > 0 ? 0.18 + v.z * 0.72 : 0;
        alpha = alpha * (1 - u) + 0.55 * u;
        if (alpha < 0.02) continue;
        let x = gx + (fx - gx) * u, y = gy + (fy - gy) * u;

        if (t < 3.6) {
          const k2 = ease((t - delay[i]) / 1.3);
          if (k2 < 1) {
            const sx = cx + Math.cos(seedA[i]) * seedR[i] * R, sy = cy + Math.sin(seedA[i]) * seedR[i] * R * 0.7;
            x = sx + (x - sx) * k2; y = sy + (y - sy) * k2;
            alpha *= k2;
            settled = false;
          }
        }

        const lit = dot3(v, SUN);
        const day = smooth(-0.12, 0.3, lit) * (1 - u) + u;
        // Twilight: a warm band where the terminator crosses the land.
        const twilight = (1 - u) * Math.max(0, 1 - Math.abs(lit - 0.04) / 0.13);
        let size = base * (0.8 + 0.3 * Math.max(0, v.z));
        if (k > 0.01) {
          const dx = x - ptr.sx, dy = y - ptr.sy, d = Math.hypot(dx, dy);
          if (d < LR) {
            const r = d / LR, f = (r * (1 + k)) / (1 + k * r);
            const m = d > 0 ? (f * LR) / d : 1;
            x = ptr.sx + dx * m; y = ptr.sy + dy * m;
            size *= 1 + k * 0.8 * (1 - r);
            alpha = Math.min(1, alpha + 0.3 * ptr.s * (1 - r));
          }
        }

        if (e > 0.06) {
          hot[Math.min(3, (e * 4) | 0)].push(x, y, size * (1 + e * 0.9));
          // Columns stay off the limb, where they foreshorten into bristles.
          if (settled && e > 0.2 && globeA > 0.2 && v.z > 0.55) {
            const lift = 1 + 0.065 * e * globeA;
            const tx = cx + v.x * R * lift, ty = cy - v.y * R * lift;
            spikes[Math.min(2, ((e - 0.2) * 3.75) | 0)].push(x, y, x + (tx - gx), y + (ty - gy));
          }
        } else if (city[i] && day < 0.75) {
          const glow = (1 - day) * alpha * (0.55 + 0.45 * Math.sin(t * twRate[i] + twPhase[i]));
          if (glow > 0.12) lights[Math.min(2, (glow * 3) | 0)].push(x, y, size * 1.2);
          else cool[Math.min(6, (alpha * 0.3 * 7) | 0)].push(x, y, size);
        } else if (twilight > 0.25) {
          dusk[Math.min(2, (alpha * twilight * 3) | 0)].push(x, y, size);
        } else {
          cool[Math.min(6, (alpha * (0.3 + 0.7 * day) * 7) | 0)].push(x, y, size);
        }
      }

      const dots = (list: number[], scale = 0.56) => {
        ctx.beginPath();
        for (let j = 0; j < list.length; j += 3) {
          const r = list[j + 2] * scale;
          ctx.moveTo(list[j] + r, list[j + 1]);
          ctx.arc(list[j], list[j + 1], r, 0, Math.PI * 2);
        }
        ctx.fill();
      };
      cool.forEach((list, b) => {
        if (!list.length) return;
        ctx.fillStyle = `rgba(210,226,255,${0.07 + b * 0.14})`;
        dots(list);
      });
      dusk.forEach((list, b) => {
        if (!list.length) return;
        ctx.fillStyle = `rgba(255,186,140,${0.3 + b * 0.25})`;
        dots(list);
      });

      // Light sources add up, so city lights and flares bloom where they overlap.
      ctx.globalCompositeOperation = "lighter";
      lights.forEach((list, b) => {
        if (!list.length) return;
        if (!lowQ) {
          ctx.fillStyle = `rgba(255,160,80,${0.07 + b * 0.06})`;
          dots(list, 2.4);
        }
        ctx.fillStyle = `rgba(255,205,145,${0.55 + b * 0.22})`;
        dots(list);
      });
      const hotFill = ["rgba(120,160,255,.9)", "rgba(250,140,80,.95)", "rgba(250,117,46,1)", "rgba(255,226,200,1)"];
      hot.forEach((list, b) => {
        if (!list.length) return;
        ctx.fillStyle = hotFill[b];
        dots(list);
      });

      ctx.lineCap = "round";
      spikes.forEach((list, b) => {
        if (!list.length) return;
        ctx.strokeStyle = `rgba(${ORANGE},${0.35 + b * 0.3})`;
        ctx.lineWidth = 1.2 + b * 0.4;
        ctx.beginPath();
        for (let j = 0; j < list.length; j += 4) {
          ctx.moveTo(list[j], list[j + 1]);
          ctx.lineTo(list[j + 2], list[j + 3]);
        }
        ctx.stroke();
      });

      /* ---------- ripples where arcs launch and land ---------- */
      for (let q = ripples.length - 1; q >= 0; q--) {
        const rp = ripples[q];
        const life = rp.big ? 1.8 : 1;
        const age = t - rp.t0;
        if (age > life + 0.3) { ripples.splice(q, 1); continue; }
        for (const lag of rp.big ? [0, 0.3] : [0]) {
          const kk = (age - lag) / life;
          if (kk <= 0 || kk >= 1) continue;
          const rho = (rp.big ? 7 : 3.2) * DEG * ease(kk);
          const a = (1 - kk) * globeA * (rp.big ? 0.95 : 0.6);
          ctx.strokeStyle = `rgba(${ORANGE},${a})`;
          ctx.lineWidth = rp.big ? 1.5 : 1;
          ctx.beginPath();
          let prev: V3 | null = null;
          for (let s = 0; s <= 40; s++) {
            const th = (s / 40) * Math.PI * 2;
            const c = Math.cos(rho), sn = Math.sin(rho);
            const p = view({
              x: rp.c.x * c + (rp.e1.x * Math.cos(th) + rp.e2.x * Math.sin(th)) * sn,
              y: rp.c.y * c + (rp.e1.y * Math.cos(th) + rp.e2.y * Math.sin(th)) * sn,
              z: rp.c.z * c + (rp.e1.z * Math.cos(th) + rp.e2.z * Math.sin(th)) * sn,
            }, lat0, lng0);
            if (p.z > 0 && prev && prev.z > 0) { ctx.moveTo(toX(prev), toY(prev)); ctx.lineTo(toX(p), toY(p)); }
            prev = p;
          }
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";

      /* ---------- scan ring, drawn over the land ---------- */
      if (scanOn) {
        const a = globeA * Math.min(1, (scan + 40) / 8) * Math.min(1, (60 - scan) / 8);
        ctx.save();
        ctx.shadowColor = `rgba(${ORANGE},1)`;
        ctx.shadowBlur = lowQ ? 0 : 16;
        for (let s = 0; s < 96; s++) {
          const p0 = view(toVec(scan, (s / 96) * 360), lat0, lng0);
          const p1 = view(toVec(scan, ((s + 1) / 96) * 360), lat0, lng0);
          ctx.strokeStyle = p0.z > 0 ? `rgba(${ORANGE},${0.9 * a})` : `rgba(${ORANGE},${0.12 * a})`;
          ctx.lineWidth = p0.z > 0 ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(toX(p0), toY(p0));
          ctx.lineTo(toX(p1), toY(p1));
          ctx.stroke();
        }
        ctx.restore();
      }

      /* ---------- data arcs: a comet head with a cooling tail ---------- */
      const lw = Math.max(1.1, R / 420);
      ctx.lineCap = "round";
      for (let q = arcs.length - 1; q >= 0; q--) {
        const arc = arcs[q];
        const age = t - arc.t0;
        const head = easeInOut(age / arc.dur);
        const tail = easeInOut((age - arc.dur * 0.5) / arc.dur);
        if (tail >= 1 || globeA < 0.05) { arcs.splice(q, 1); continue; }
        // Ground track: the arc's shadow on the surface, so its height reads.
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = `rgba(${ORANGE},${0.35 * globeA * (1 - tail)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let g0: V3 | null = null;
        for (let s = 0; s <= 24; s++) {
          const q2 = arcPoint(arc, tail + ((head - tail) * s) / 24);
          const l = Math.hypot(q2.x, q2.y, q2.z);
          const g = view({ x: q2.x / l, y: q2.y / l, z: q2.z / l }, lat0, lng0);
          if (g0 && g.z > 0 && g0.z > 0) { ctx.moveTo(toX(g0), toY(g0)); ctx.lineTo(toX(g), toY(g)); }
          g0 = g;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        const SEG = 44;
        let prev: V3 | null = null;
        for (let s = 0; s <= SEG; s++) {
          const p = view(arcPoint(arc, tail + ((head - tail) * s) / SEG), lat0, lng0);
          if (prev && !occluded(p) && !occluded(prev)) {
            const kk = s / SEG;
            ctx.strokeStyle = `rgba(${mix(RGB_BLUE, RGB_ORANGE, kk)},${Math.pow(kk, 1.4) * 0.95 * globeA})`;
            ctx.lineWidth = lw * (0.6 + 0.6 * kk);
            ctx.beginPath(); ctx.moveTo(toX(prev), toY(prev)); ctx.lineTo(toX(p), toY(p)); ctx.stroke();
          }
          prev = p;
        }
        if (head < 1 && prev && !occluded(prev)) {
          const hx = toX(prev), hy = toY(prev), hr = lw * 7;
          const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
          g.addColorStop(0, `rgba(255,255,255,${globeA})`);
          g.addColorStop(0.25, `rgba(${ORANGE},${0.7 * globeA})`);
          g.addColorStop(1, `rgba(${ORANGE},0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
        }
      }

      drawOrbits(true);

      /* ---------- flat-map graticule while unrolled ---------- */
      if (u > 0.02) {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 * u})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let g = -60; g <= 60; g += 30) { ctx.moveTo(cx - mapW, cy - (g / 90) * mapH); ctx.lineTo(cx + mapW, cy - (g / 90) * mapH); }
        for (let g = -180; g <= 180; g += 30) { const x = cx + (g / 180) * mapW; ctx.moveTo(x, cy - mapH); ctx.lineTo(x, cy + mapH); }
        ctx.stroke();
      }

      /* ---------- lens chrome and coordinate readout ---------- */
      if (ptr.s > 0.02) {
        const s = ptr.s;
        const tint = ctx.createRadialGradient(ptr.sx, ptr.sy, 0, ptr.sx, ptr.sy, LR);
        tint.addColorStop(0, `rgba(${BLUE},${0.16 * s})`);
        tint.addColorStop(1, `rgba(${BLUE},0)`);
        ctx.fillStyle = tint;
        ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, LR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * s})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ptr.sx, ptr.sy, LR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(${ORANGE},${0.9 * s})`;
        ctx.beginPath();
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          ctx.moveTo(ptr.sx + ax * (LR - 8), ptr.sy + ay * (LR - 8));
          ctx.lineTo(ptr.sx + ax * (LR + 6), ptr.sy + ay * (LR + 6));
        }
        ctx.moveTo(ptr.sx - 5, ptr.sy); ctx.lineTo(ptr.sx + 5, ptr.sy);
        ctx.moveTo(ptr.sx, ptr.sy - 5); ctx.lineTo(ptr.sx, ptr.sy + 5);
        ctx.stroke();

        let la = 0, lo = 0;
        if (u < 0.5) {
          const nx = (ptr.sx - cx) / R, ny = -(ptr.sy - cy) / R;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const wv = unview({ x: nx, y: ny, z: nz }, lat0, lng0);
          la = Math.asin(Math.max(-1, Math.min(1, wv.y))) / DEG;
          lo = Math.atan2(wv.x, wv.z) / DEG;
        } else {
          la = (-(ptr.sy - cy) / mapH) * 90;
          lo = wrap(((ptr.sx - cx) / mapW) * 180 + lng0);
        }
        const text = `${fmt(la, "N", "S")}  ${fmt(lo, "E", "W")}`;
        ctx.font = `500 11px ${font}`;
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(text).width + 16;
        const bx = ptr.sx + LR * 0.72, by = ptr.sy + LR * 0.72;
        ctx.fillStyle = `rgba(8,12,22,${0.85 * s})`;
        ctx.strokeStyle = `rgba(${ORANGE},${0.6 * s})`;
        ctx.beginPath(); ctx.rect(bx, by, tw, 22); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.92 * s})`;
        ctx.fillText(text, bx + 8, by + 11.5);
      }
    }

    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!reduced && !raf && n) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);

    const setCursor = (c: string) => {
      if (c !== cursor) host.style.cursor = cursor = c;
    };
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onGlobe = (x: number, y: number) => flat < 0.3 && Math.hypot(x - w / 2, y - h / 2) < Rcur * 0.98;
    /** Text blocks span the full column, so test the rendered lines, not the box. */
    const isFree = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return true;
      if (el.closest(SOLID)) return false;
      const block = el.closest(TEXT);
      if (!block) return true;
      const range = document.createRange();
      range.selectNodeContents(block);
      for (const r of range.getClientRects()) {
        if (e.clientX > r.left - 8 && e.clientX < r.right + 8 && e.clientY > r.top - 4 && e.clientY < r.bottom + 4) return false;
      }
      return true;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { x, y } = local(e);
      ptr.x = x; ptr.y = y;
      lean.tx = (e.clientX / window.innerWidth) * 2 - 1;
      lean.ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!ptr.on) { ptr.sx = x; ptr.sy = y; }
      ptr.on = true;
      if (drag.on) {
        const now = performance.now();
        const dLng = -((x - drag.x) / Rcur) / DEG;
        lng0 += dLng;
        drag.tilt = Math.max(-28, Math.min(32, drag.tilt + ((y - drag.y) / Rcur) / DEG));
        const step = Math.max(0.008, (now - drag.t) / 1000);
        drag.vel = Math.max(-240, Math.min(240, drag.vel * 0.6 + (dLng / step) * 0.4));
        drag.x = x; drag.y = y; drag.t = now;
        return;
      }
      setCursor(!reduced && onGlobe(x, y) && isFree(e) ? "grab" : "");
    };
    const onDown = (e: PointerEvent) => {
      if (reduced || e.pointerType === "touch" || e.button !== 0) return;
      const { x, y } = local(e);
      if (!onGlobe(x, y) || !isFree(e)) return;
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      host.style.userSelect = "none";
      Object.assign(drag, { on: true, x, y, t: performance.now(), vel: 0 });
      setCursor("grabbing");
    };
    const onUp = () => {
      if (!drag.on) return;
      drag.on = false;
      host.style.userSelect = "";
      if (performance.now() - drag.t > 90) drag.vel = 0;
      setCursor("grab");
    };
    const onLeave = () => {
      ptr.on = false;
      lean.tx = lean.ty = 0;
    };
    const onVis = () => !document.hidden && start();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);

    let cancelled = false;
    fetch("/data/land-dots.json")
      .then((r) => r.json() as Promise<number[]>)
      .then((flatList) => {
        if (cancelled) return;
        n = flatList.length / 2;
        lat = new Float32Array(n); lng = new Float32Array(n);
        energy = new Float32Array(n);
        seedA = new Float32Array(n); seedR = new Float32Array(n); delay = new Float32Array(n);
        city = new Uint8Array(n); twRate = new Float32Array(n); twPhase = new Float32Array(n);
        world = new Array(n);
        for (let i = 0; i < n; i++) {
          lat[i] = flatList[i * 2]; lng[i] = flatList[i * 2 + 1];
          world[i] = toVec(lat[i], lng[i]);
          seedA[i] = Math.random() * Math.PI * 2;
          seedR[i] = 1.3 + Math.random() * 1.8;
          // A wave that sweeps west to east, with jitter so it feels organic.
          delay[i] = 0.15 + ((lng[i] + 180) / 360) * 0.9 + Math.random() * 0.5;
          twRate[i] = 0.8 + Math.random() * 2.2;
          twPhase[i] = Math.random() * Math.PI * 2;
        }
        // Earth at night: lights crowd the coasts and thin inland and poleward.
        // A dot with fewer than its full ring of six grid neighbours is on a coast.
        const cell = (la: number, lo: number) => `${Math.floor(la / 2)},${Math.floor((((lo % 360) + 360) % 360) / 2)}`;
        const grid = new Map<string, number[]>();
        for (let i = 0; i < n; i++) {
          const key = cell(lat[i], lng[i]);
          const list = grid.get(key);
          if (list) list.push(i); else grid.set(key, [i]);
        }
        const near = Math.cos(1.9 * DEG);
        for (let i = 0; i < n; i++) {
          let count = 0;
          const reach = Math.ceil(1 / Math.max(0.2, Math.cos(lat[i] * DEG)));
          for (let a = -1; a <= 1; a++) {
            for (let b = -reach; b <= reach; b++) {
              for (const j of grid.get(cell(lat[i] + a * 2, lng[i] + b * 2)) ?? []) {
                if (j !== i && dot3(world[i], world[j]) > near) count++;
              }
            }
          }
          const coast = count < 6;
          const band = 1 - smooth(50, 66, Math.abs(lat[i]));
          city[i] = Math.random() < (coast ? 0.55 : 0.1) * band ? 1 : 0;
        }
        born = performance.now();
        resize();
        if (reduced) draw(performance.now());
        start();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      host.style.cursor = "";
      host.style.userSelect = "";
    };
  }, [tilt, spin, unroll, lens, startLng]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block size-full ${className}`} />;
}
