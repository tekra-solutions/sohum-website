"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to `value` the first time it scrolls into view. The final value is server-rendered. */
export function CountUp({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - start) / 1400);
          setShown(Math.round(value * (1 - Math.pow(1 - k, 4))));
          if (k < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    // Start from zero only once we know the animation will run.
    const raf = requestAnimationFrame(() => {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.4) setShown(0);
      io.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`} aria-label={`${value}${suffix}`}>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
    </span>
  );
}
