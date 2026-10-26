"use client";

import { useEffect, useRef } from "react";

/**
 * Flat dotted world map, the continuation of the hero globe once it has
 * unrolled. Land comes from the same dot grid (public/data/land-dots.json).
 * A slow orange scan line crosses west to east; dots it passes warm up and
 * cool back. Drawn only while on screen. With reduced motion it is static.
 */
export function DotMap({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let pts: { x: number; y: number }[] = [];
    let heat = new Float32Array(0);
    let w = 0, h = 0, dpr = 1, raf = 0, visible = false, last = 0, scan = -0.1;

    const project = (lat: number, lng: number) => ({ x: (lng + 180) / 360, y: (82 - lat) / 140 });

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw(performance.now());
    };

    function draw(now: number) {
      if (!ctx || !pts.length) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (!reduced) {
        scan += dt * 0.045;
        if (scan > 1.15) scan = -0.15;
      }
      // Fit the map's 2:1 aspect inside the canvas, centred.
      const mw = Math.min(w, h * 2.57), mh = mw / 2.57;
      const ox = (w - mw) / 2, oy = (h - mh) / 2;
      const s = Math.max(1.2, mw / 900);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cool: number[] = [], warm: number[] = [];
      const decay = Math.exp(-dt * 0.9);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!reduced && Math.abs(p.x - scan) < 0.006) heat[i] = 1;
        else heat[i] *= decay;
        (heat[i] > 0.12 ? warm : cool).push(ox + p.x * mw, oy + p.y * mh, heat[i]);
      }
      ctx.fillStyle = "rgba(190,205,235,0.22)";
      ctx.beginPath();
      for (let j = 0; j < cool.length; j += 3) ctx.rect(cool[j] - s / 2, cool[j + 1] - s / 2, s, s);
      ctx.fill();
      for (let j = 0; j < warm.length; j += 3) {
        ctx.fillStyle = `rgba(250,117,46,${0.25 + warm[j + 2] * 0.7})`;
        ctx.fillRect(warm[j] - s / 2, warm[j + 1] - s / 2, s * 1.2, s * 1.2);
      }
      if (!reduced && scan > 0 && scan < 1) {
        const x = ox + scan * mw;
        const g = ctx.createLinearGradient(x - 60, 0, x, 0);
        g.addColorStop(0, "rgba(250,117,46,0)");
        g.addColorStop(1, "rgba(250,117,46,0.10)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 60, oy, 60, mh);
        ctx.fillStyle = "rgba(250,117,46,0.5)";
        ctx.fillRect(x, oy, 1, mh);
      }
    }

    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!reduced && !raf && visible) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    io.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", start);

    let cancelled = false;
    fetch("/data/land-dots.json")
      .then((r) => r.json() as Promise<number[]>)
      .then((flat) => {
        if (cancelled) return;
        for (let i = 0; i < flat.length; i += 2) pts.push(project(flat[i], flat[i + 1]));
        heat = new Float32Array(pts.length);
        resize();
        start();
      })
      .catch(() => { pts = []; });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", start);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`block size-full ${className}`} />;
}
