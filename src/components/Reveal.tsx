"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Reveals children on first scroll into view.
 *
 * Deliberately minimal: one IntersectionObserver per element, disconnected after
 * firing. When the user prefers reduced motion we render visible immediately and
 * never observe, so the page is complete without any animation.
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
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
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
