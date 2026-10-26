"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useScrollProgress } from "./useScrollProgress";

/**
 * Pinned, sideways-scrolling rail. On wide screens the section sticks while
 * vertical scrolling slides the cards left and a giant background word drifts
 * behind them. On narrow screens, or with reduced motion, it is an ordinary
 * swipeable row, which is also what renders before JavaScript runs.
 */
/** Pixels of vertical scroll per pixel of sideways travel; under 1 keeps the pin short. */
const PACE = 0.6;

export function CapabilityRail({ word, intro, children }: { word: string; intro: ReactNode; children: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      const on = wide.matches && !reduced.matches;
      setPinned(on);
      const el = track.current;
      setDistance(on && el ? Math.max(0, el.scrollWidth - window.innerWidth) : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    wide.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wide.removeEventListener("change", measure);
    };
  }, []);

  const onProgress = useCallback(
    (p: number) => {
      if (!pinned) return;
      if (track.current) track.current.style.transform = `translate3d(${-p * distance}px,0,0)`;
      if (wordRef.current) wordRef.current.style.transform = `translate3d(${-p * 45}%,0,0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    },
    [pinned, distance],
  );
  useScrollProgress(section, onProgress, "pin");

  return (
    <section ref={section} className="relative bg-[#0b0d12]" style={pinned ? { height: `calc(100vh + ${Math.round(distance * PACE)}px)` } : undefined}>
      <div className={pinned ? "sticky top-0 flex h-screen flex-col overflow-hidden" : "overflow-hidden"}>
        <div className="relative overflow-hidden bg-white pt-24 lg:flex-[0_0_38%] lg:pt-0">
          <p
            ref={wordRef}
            aria-hidden="true"
            className="font-brand pointer-events-none whitespace-nowrap text-[19vw] font-extrabold leading-[0.8] tracking-[-.04em] text-[#ececef] will-change-transform lg:absolute lg:bottom-[-2vw] lg:left-0"
          >
            {word}
          </p>
          <div className="container-page relative pb-8 lg:absolute lg:inset-x-0 lg:top-36 lg:pb-0">{intro}</div>
        </div>
        <div className="relative flex flex-1 flex-col justify-center py-12 lg:py-0">
          <div
            ref={track}
            className={`flex will-change-transform ${pinned ? "w-max pl-[var(--page-gutter)] pr-[10vw]" : "snap-x snap-mandatory overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:px-8"}`}
          >
            {children}
          </div>
          <div className="container-page mt-10 hidden lg:block">
            <div className="h-px w-full bg-white/10">
              <div ref={bar} className="h-px origin-left scale-x-0 bg-flame-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
