"use client";

import { useCallback, useRef } from "react";
import { useScrollProgress } from "./useScrollProgress";

/**
 * A paragraph whose words light up one by one as it scrolls through the
 * viewport. Words listed in `accent` light up in the brand orange. Text is
 * real text throughout; only colour changes.
 */
export function ScrollWords({ text, accent = [], className = "" }: { text: string; accent?: string[]; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");

  const onProgress = useCallback((p: number) => {
    const el = ref.current;
    if (!el) return;
    // Map the middle stretch of the pass to the full reveal.
    const lit = Math.round(Math.min(1, Math.max(0, (p - 0.15) / 0.45)) * words.length);
    el.querySelectorAll<HTMLElement>("[data-w]").forEach((w, i) => {
      w.dataset.on = String(i < lit);
    });
  }, [words.length]);

  useScrollProgress(ref, onProgress, "pass");

  return (
    <p ref={ref} className={`scroll-words ${className}`}>
      {words.map((w, i) => (
        <span key={i} data-w="" data-on="true" data-accent={accent.includes(w.replace(/[.,:]/g, "")) || undefined}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
