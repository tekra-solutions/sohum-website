"use client";

import { useEffect, type RefObject } from "react";

/**
 * Calls `onProgress` with how far an element has travelled through the
 * viewport: 0 when its top reaches the top of the screen, 1 when its bottom
 * reaches the bottom. Tall sticky sections use this to drive animation.
 * Work is batched to one call per animation frame.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  mode: "pin" | "pass" = "pin",
) {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // "pin": progress across the scroll distance of a sticky section.
      // "pass": progress from the element entering at the bottom to leaving at the top.
      const p = mode === "pin" ? -r.top / Math.max(r.height - vh, 1) : (vh - r.top) / (vh + r.height);
      onProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, onProgress, mode]);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
