"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Headline that sweeps from the brand gradient into solid type when it first
 * scrolls into view. The text itself is always present and readable.
 */
export function SweepText({ as: Tag = "h2", className = "", children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.swept = "false";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => (el.dataset.swept = "true"));
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`text-sweep ${className}`}>
      {children}
    </Tag>
  );
}
