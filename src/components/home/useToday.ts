"use client";

import { useEffect, useState } from "react";
import { today } from "@/content/company";

/**
 * Today's date for date-driven statuses. Seeded from the server render so
 * hydration matches, then corrected on mount (the page may be up to an hour
 * old) and kept current while the tab stays open.
 */
export function useToday(initialDay: string) {
  const [day, setDay] = useState(initialDay);
  useEffect(() => {
    const update = () => setDay(today());
    const frame = requestAnimationFrame(update);
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return day;
}
