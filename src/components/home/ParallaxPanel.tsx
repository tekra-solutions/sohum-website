"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useScrollProgress } from "./useScrollProgress";

/** Full-bleed background that slowly zooms and drifts as the section passes. */
export function ParallaxPanel({ background, children, className = "" }: { background: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const onProgress = useCallback((p: number) => {
    if (!layer.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    layer.current.style.transform = `translate3d(0,${(p - 0.5) * -8}%,0) scale(${1.08 + p * 0.14})`;
  }, []);
  useScrollProgress(ref, onProgress, "pass");
  return (
    <section ref={ref} className={`relative isolate overflow-hidden ${className}`}>
      <div ref={layer} className="absolute inset-0 -z-10 scale-110 will-change-transform">{background}</div>
      {children}
    </section>
  );
}
