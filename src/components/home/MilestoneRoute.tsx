"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollProgress } from "./useScrollProgress";

export type Milestone = { step: string; title: string; body: string };

/* A road through the section, drawn in a 1000 × 600 box. */
const ROAD = "M -40 120 L 260 120 C 420 120 440 300 600 300 L 760 300 C 880 300 880 470 1000 470 L 1060 470";

/**
 * Pinned "milestones" section. As the reader scrolls, a data packet travels
 * the road, leaving an orange trail, and each milestone lights up as the
 * packet reaches it. With reduced motion everything is shown complete.
 */
export function MilestoneRoute({ milestones, heading }: { milestones: Milestone[]; heading: React.ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const packet = useRef<SVGGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(milestones.length);
  const [length, setLength] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Deferred a frame so the server-rendered (complete) state paints first.
    const raf = requestAnimationFrame(() => {
      // Pinned only on wide screens; phones get a static, complete layout.
      setAnimated(
        window.matchMedia("(min-width: 1024px)").matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      if (path.current) setLength(path.current.getTotalLength());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const onProgress = useCallback(
    (p: number) => {
      if (!animated || !length || !path.current) return;
      const k = Math.min(1, p * 1.08);
      const at = path.current.getPointAtLength(k * length);
      const ahead = path.current.getPointAtLength(Math.min(length, k * length + 1));
      const angle = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
      packet.current?.setAttribute("transform", `translate(${at.x} ${at.y}) rotate(${angle})`);
      if (trail.current) trail.current.style.strokeDashoffset = String(length * (1 - k));
      if (readout.current) readout.current.textContent = String(Math.round(k * 100)).padStart(3, "0");
      setActive(Math.min(milestones.length, Math.floor(k * (milestones.length + 0.2) + 0.15)));
    },
    [animated, length, milestones.length],
  );
  useScrollProgress(section, onProgress, "pin");

  return (
    <section ref={section} className={`relative bg-white text-ink-950 ${animated ? "h-[260vh]" : ""}`}>
      <div className={`${animated ? "sticky top-0 h-screen" : "pb-16"} flex flex-col overflow-hidden`}>
        <div className={`pointer-events-none absolute left-5 top-36 z-10 font-brand text-[0.75rem] font-bold uppercase tracking-[.1em] text-graphite-500 md:left-8 ${animated ? "" : "hidden"}`}>
          Delivery progress <span ref={readout}>100</span>%
        </div>
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid slice"
          className={animated ? "absolute inset-0 size-full" : "h-48 w-full sm:h-72"}
          aria-hidden="true"
        >
          <path ref={path} d={ROAD} fill="none" stroke="#0b0d12" strokeWidth="130" strokeLinejoin="round" />
          <path d={ROAD} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeDasharray="22 26" />
          <path
            ref={trail}
            d={ROAD}
            fill="none"
            stroke="#f25806"
            strokeWidth="6"
            strokeLinecap="round"
            style={length ? { strokeDasharray: length, strokeDashoffset: animated ? length : 0 } : undefined}
          />
          <g ref={packet} transform="translate(-100 -100)" className={animated ? "" : "hidden"}>
            <circle r="26" fill="rgba(242,88,6,.18)" />
            <rect x="-16" y="-9" width="32" height="18" rx="3" fill="#fff" />
            <rect x="-16" y="-9" width="9" height="18" rx="2" fill="#f25806" />
          </g>
        </svg>

        <div className={`container-page relative grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end ${animated ? "mt-auto pb-14" : "mt-10"}`}>
          <div>{heading}</div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {milestones.map((m, i) => (
              <li
                key={m.step}
                className={`rounded-2xl border bg-white p-5 shadow-lift transition-[opacity,transform,border-color] duration-500 ${
                  i < active ? "translate-y-0 border-flame-500/60 opacity-100" : "translate-y-3 border-paper-200 opacity-40"
                }`}
              >
                <span className="font-tech text-xs text-flame-600">{m.step}</span>
                <h3 className="mt-3 text-base font-semibold tracking-[-.02em]">{m.title}</h3>
                <p className="mt-2 text-[0.8125rem] leading-[1.65] text-graphite-600">{m.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
