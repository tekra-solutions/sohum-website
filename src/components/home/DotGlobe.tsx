"use client";

import { useEffect, useRef } from "react";

/**
 * "Living data planet", drawn on a 2D canvas with no 3D library.
 *
 *  - Assembly: on load, every land particle flies in from a scattered cloud
 *    and locks into its place on the continents.
 *  - Scan: a luminous latitude ring sweeps the planet; land it touches flares
 *    orange and rises into short data columns, then cools back to blue.
 *  - Orbits: two inclined rings carry light pulses that pass in front of and
 *    behind the planet.
 *  - Lens: hovering the planet opens a fisheye inspection lens with a live
 *    latitude / longitude readout.
 *  - Unroll: with `unroll`, scrolling away flattens the globe into a map.
 *
 * Land is a precomputed dot grid (scripts/generate-land-dots.mjs). With
 * reduced motion the planet is drawn once, assembled and still.
 */

const DEG = Math.PI / 180;
const ORANGE = "250,117,46";
const BLUE = "70,120,255";

type V3 = { x: number; y: number; z: number };

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
const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;

/** An orbit: a circle of radius r around the planet, tilted by `inc` and turned by `node`. */
type Orbit = { r: number; inc: number; node: number; speed: number; phase: number };
const ORBITS: Orbit[] = [
  { r: 1.16, inc: 62, node: 20, speed: 0.22, phase: 0 },
  { r: 1.3, inc: -28, node: -35, speed: -0.14, phase: 2.1 },
];

function orbitPoint(o: Orbit, a: number): V3 {
  // Circle in the x–z plane, inclined about x, then turned about y.
  const x = Math.cos(a) * o.r, z = Math.sin(a) * o.r;
  const i = o.inc * DEG, n = o.node * DEG;
  const y1 = -z * Math.sin(i), z1 = z * Math.cos(i);
  return { x: x * Math.cos(n) + z1 * Math.sin(n), y: y1, z: -x * Math.sin(n) + z1 * Math.cos(n) };
}

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
    let n = 0;
    let lat = new Float32Array(0), lng = new Float32Array(0);
    let world: V3[] = [];
    let energy = new Float32Array(0);
    let seedA = new Float32Array(0), seedR = new Float32Array(0), delay = new Float32Array(0);

    let raf = 0, visible = true, w = 0, h = 0, dpr = 1;
    let last = performance.now(), born = last, lng0 = startLng, scan = -40, burstClock = 0;
    let flat = 0;
    const ptr = { x: -1e4, y: -1e4, on: false, s: 0, sx: -1e4, sy: -1e4 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (reduced) draw(performance.now());
    };

    function draw(now: number) {
      if (!ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = reduced ? 99 : (now - born) / 1000;

      // Scroll-driven unroll, eased toward its target for smoothness.
      const target = unroll && !reduced ? Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.55))) : 0;
      flat += (target - flat) * Math.min(1, dt * 8);
      const u = ease(flat);
      const globeA = 1 - u;

      if (!reduced) lng0 += spin * dt * (1 - u);
      const lat0 = tilt * (1 - u);
      const R = Math.min(w, h) * 0.4 * (0.92 + 0.08 * ease(t / 2));
      const cx = w / 2, cy = h / 2;
      const mapW = R * 1.25, mapH = R * 0.62;

      // Lens follows the pointer with a little lag.
      ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 14);
      ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 14);
      const overGlobe = Math.hypot(ptr.sx - cx, ptr.sy - cy) < R * 0.98;
      const overMap = Math.abs(ptr.sx - cx) < mapW && Math.abs(ptr.sy - cy) < mapH;
      const want = lens && ptr.on && (u < 0.5 ? overGlobe : overMap) ? 1 : 0;
      ptr.s += (want - ptr.s) * Math.min(1, dt * 7);
      const LR = R * 0.24, k = 1.4 * ptr.s;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* ---------- planet body and atmosphere ---------- */
      if (globeA > 0.01) {
        ctx.globalAlpha = globeA * ease(t / 1.2);
        const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.24);
        halo.addColorStop(0, `rgba(${BLUE},0.3)`);
        halo.addColorStop(1, `rgba(${BLUE},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2); ctx.fill();

        const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
        body.addColorStop(0, "rgb(16,24,44)");
        body.addColorStop(0.8, "rgb(6,9,18)");
        body.addColorStop(1, `rgba(${BLUE},0.4)`);
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

        const rim = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
        rim.addColorStop(0, `rgba(${ORANGE},1)`);
        rim.addColorStop(0.45, `rgba(${ORANGE},0.25)`);
        rim.addColorStop(0.7, `rgba(${BLUE},0.55)`);
        rim.addColorStop(1, `rgba(${BLUE},1)`);
        ctx.save();
        ctx.shadowColor = `rgba(${ORANGE},0.85)`;
        ctx.shadowBlur = 28;
        ctx.strokeStyle = rim;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
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
            const behind = p0.z < 0 && Math.hypot(p0.x, p0.y) < 1;
            if (behind === front) continue;
            ctx.strokeStyle = `rgba(255,255,255,${(front ? 0.16 : 0.05) * globeA})`;
            ctx.beginPath();
            ctx.moveTo(cx + p0.x * R, cy - p0.y * R);
            ctx.lineTo(cx + p1.x * R, cy - p1.y * R);
            ctx.stroke();
          }
          // Pulse with a fading tail.
          for (let j = 0; j < 26; j++) {
            const a = head - j * 0.035 * Math.sign(o.speed);
            const p = view(orbitPoint(o, a), lat0, 0);
            const behind = p.z < 0 && Math.hypot(p.x, p.y) < 1;
            if (behind === front) continue;
            const fade = (1 - j / 26) * globeA * (front ? 1 : 0.25);
            ctx.fillStyle = j === 0 ? `rgba(255,255,255,${fade})` : `rgba(${ORANGE},${fade * 0.8})`;
            ctx.beginPath(); ctx.arc(cx + p.x * R, cy - p.y * R, j === 0 ? 2.6 : 1.8 * (1 - j / 30), 0, Math.PI * 2); ctx.fill();
          }
        }
      };
      drawOrbits(false);

      /* ---------- scan ring ---------- */
      if (!reduced && t > 1.6) scan += dt * 16;
      if (scan > 60) scan = -40;
      const scanOn = !reduced && t > 1.6 && globeA > 0.05;

      /* ---------- land particles ---------- */
      // Batched by colour bucket: 5 cool levels, 4 hot levels.
      const buckets: number[][] = Array.from({ length: 9 }, () => []);
      const spikes: number[][] = [[], [], []];
      const decay = Math.exp(-dt * 1.5);
      burstClock += dt;
      const doBurst = !reduced && burstClock > 0.05;
      if (doBurst) {
        burstClock = 0;
        energy[(Math.random() * n) | 0] = 1;
      }

      for (let i = 0; i < n; i++) {
        if (scanOn && Math.abs(lat[i] - scan) < 1.4) energy[i] = 1;
        else energy[i] *= decay;
        const e = energy[i];

        const v = view(world[i], lat0, lng0);
        // Globe position (with data-column lift) and flat-map position.
        const gx = cx + v.x * R, gy = cy - v.y * R;
        let settled = true;
        const fx = cx + (wrap(lng[i] - lng0) / 180) * mapW, fy = cy - (lat[i] / 90) * mapH;
        let alpha = v.z > 0 ? 0.18 + v.z * 0.72 : 0;
        alpha = alpha * (1 - u) + 0.55 * u;
        if (alpha < 0.02) continue;
        let x = gx + (fx - gx) * u, y = gy + (fy - gy) * u;

        // Assembly: fly in from a scattered cloud.
        if (t < 3.6) {
          const k2 = ease((t - delay[i]) / 1.3);
          if (k2 < 1) {
            const sx = cx + Math.cos(seedA[i]) * seedR[i] * R, sy = cy + Math.sin(seedA[i]) * seedR[i] * R * 0.7;
            x = sx + (x - sx) * k2; y = sy + (y - sy) * k2;
            alpha *= k2;
            settled = false;
          }
        }

        // Fisheye lens.
        let size = Math.max(1.2, R / 330);
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
          buckets[5 + Math.min(3, (e * 4) | 0)].push(x, y, size * (1 + e * 0.9));
          if (settled && e > 0.2 && globeA > 0.2 && v.z > 0.3) {
            const lift = 1 + 0.085 * e * globeA;
            const tx = cx + v.x * R * lift, ty = cy - v.y * R * lift;
            spikes[Math.min(2, ((e - 0.2) * 3.75) | 0)].push(x, y, x + (tx - gx), y + (ty - gy));
          }
        } else {
          buckets[Math.min(4, (alpha * 5) | 0)].push(x, y, size);
        }
      }

      const cool = (b: number) => `rgba(210,226,255,${0.2 + b * 0.19})`;
      const hot = ["rgba(120,160,255,.9)", "rgba(250,140,80,.95)", "rgba(250,117,46,1)", "rgba(255,226,200,1)"];
      buckets.forEach((list, b) => {
        if (!list.length) return;
        ctx.fillStyle = b < 5 ? cool(b) : hot[b - 5];
        ctx.beginPath();
        for (let j = 0; j < list.length; j += 3) {
          const s = list[j + 2];
          ctx.rect(list[j] - s / 2, list[j + 1] - s / 2, s, s);
        }
        ctx.fill();
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

      /* ---------- scan ring, drawn over the land ---------- */
      if (scanOn) {
        const a = globeA * Math.min(1, (scan + 40) / 8) * Math.min(1, (60 - scan) / 8);
        ctx.save();
        ctx.shadowColor = `rgba(${ORANGE},1)`;
        ctx.shadowBlur = 16;
        for (let s = 0; s < 96; s++) {
          const p0 = view(toVec(scan, (s / 96) * 360), lat0, lng0);
          const p1 = view(toVec(scan, ((s + 1) / 96) * 360), lat0, lng0);
          ctx.strokeStyle = p0.z > 0 ? `rgba(${ORANGE},${0.9 * a})` : `rgba(${ORANGE},${0.12 * a})`;
          ctx.lineWidth = p0.z > 0 ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(cx + p0.x * R, cy - p0.y * R);
          ctx.lineTo(cx + p1.x * R, cy - p1.y * R);
          ctx.stroke();
        }
        ctx.restore();
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

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      if (!ptr.on) { ptr.sx = ptr.x; ptr.sy = ptr.y; }
      ptr.on = true;
    };
    const onLeave = () => (ptr.on = false);
    const onVis = () => !document.hidden && start();
    window.addEventListener("pointermove", onMove, { passive: true });
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
        world = new Array(n);
        for (let i = 0; i < n; i++) {
          lat[i] = flatList[i * 2]; lng[i] = flatList[i * 2 + 1];
          world[i] = toVec(lat[i], lng[i]);
          seedA[i] = Math.random() * Math.PI * 2;
          seedR[i] = 1.3 + Math.random() * 1.8;
          // A wave that sweeps west to east, with jitter so it feels organic.
          delay[i] = 0.15 + ((lng[i] + 180) / 360) * 0.9 + Math.random() * 0.5;
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
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tilt, spin, unroll, lens, startLng]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block size-full ${className}`} />;
}
