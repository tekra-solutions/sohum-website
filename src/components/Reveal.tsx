"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Reveals children on first scroll into view.
 *
 * Two things make this fail safe rather than merely pretty:
 *
 *  - The observer fires for an element that is *anywhere* near the viewport,
 *    not one that is 5% visible. A block taller than the viewport can never
 *    reach a 5% intersection ratio on a small screen, so tall sections — the
 *    careers benefits grid, the job list — stayed at opacity 0 permanently
 *    while the rest of the page faded in. They now reveal on any intersection,
 *    with a positive rootMargin so the transition starts just before the block
 *    scrolls into view.
 *
 *  - Whatever happens, content becomes visible. If IntersectionObserver is
 *    missing, or the observer has not fired shortly after mount (a screenshot,
 *    a print, a crawler, a restored scroll position deep in the page), a
 *    fallback timer shows the content anyway. A scroll animation must never be
 *    the reason text cannot be read.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Reduced motion is handled entirely in CSS (the media query neutralises
    // `.reveal`), so no state branch is needed for it here.
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // `isIntersecting` alone — no ratio threshold, so a section taller
        // than the viewport still qualifies.
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px 120px 0px" },
    );
    observer.observe(el);

    // Safety net: never leave content hidden because an observer did not fire.
    const fallback = window.setTimeout(() => setShown(true), 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "revealed" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
