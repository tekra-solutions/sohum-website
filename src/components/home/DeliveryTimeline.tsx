"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useScrollProgress } from "./useScrollProgress";

export type Milestone = { n: string; phase: string; title: string; body: string };

/**
 * Three-step delivery timeline. A hairline rail runs across the steps (down
 * the left edge on phones) and fills in saffron as the section scrolls
 * through the viewport; each step's node lights as the fill reaches it.
 *
 * The server render, no-JavaScript render, and reduced-motion render all show
 * the finished state: rail full, every step lit.
 */
export function DeliveryTimeline({ milestones, heading, lede }: { milestones: Milestone[]; heading: ReactNode; lede: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  const [animated, setAnimated] = useState(false);
  const [fill, setFill] = useState(1);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(!window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    return () => cancelAnimationFrame(raf);
  }, []);

  const onProgress = useCallback(
    (p: number) => {
      if (!animated) return;
      // Fill while the steps travel from the lower to the upper part of the screen.
      setFill(Math.round(Math.min(1, Math.max(0, (p - 0.22) / 0.36)) * 100) / 100);
    },
    [animated],
  );
  useScrollProgress(ref, onProgress, "pass");

  const steps = milestones.length;
  const lit = (i: number) => fill >= (steps === 1 ? 0 : i / (steps - 1)) - 0.001;

  return (
    <section className="bg-white text-ink-950">
      <div className="container-page section-y">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
          {heading}
          <div className="max-w-xl text-[1.0625rem] leading-[1.75] text-graphite-600 lg:justify-self-end">{lede}</div>
        </div>

        <ol
          ref={ref}
          className="relative mt-14 grid gap-12 pl-10 sm:mt-20 sm:grid-cols-3 sm:gap-10 sm:pl-0 sm:pt-12"
          style={{ "--fill": fill } as CSSProperties}
        >
          <li aria-hidden="true" className="absolute bottom-2 left-[9px] top-2 w-px bg-paper-300 sm:bottom-auto sm:left-0 sm:right-0 sm:top-0 sm:h-px sm:w-auto">
            <span className="block size-full origin-top bg-flame-500 transition-transform duration-300 ease-out [transform:scaleY(var(--fill))] sm:origin-left sm:[transform:scaleX(var(--fill))]" />
          </li>
          {milestones.map((m, i) => (
            <li key={m.n} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-10 top-1 grid size-[19px] place-items-center rounded-full border-2 bg-white transition-colors duration-500 sm:-top-12 sm:left-0 sm:-translate-y-1/2 ${
                  lit(i) ? "border-flame-500" : "border-paper-300"
                }`}
              >
                <span className={`size-[7px] rounded-full transition-colors duration-500 ${lit(i) ? "bg-flame-500" : "bg-transparent"}`} />
              </span>
              <p className="font-tech text-[0.8125rem] text-flame-600">
                {m.n} <span className="text-graphite-400">/</span> {m.phase}
              </p>
              <h3 className="mt-3 text-[1.375rem] font-bold tracking-[-.025em]">{m.title}</h3>
              <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-[1.7] text-graphite-600">{m.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
