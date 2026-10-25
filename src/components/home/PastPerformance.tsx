"use client";

import { Crosshair, MapPin } from "lucide-react";
import { pastPerformance } from "@/content/company";
import { getFeature } from "@/content/globe";

/** Event the mission globe listens for; detail is a feature id. */
export const FOCUS_EVENT = "sohum:focus-feature";

export function focusOnGlobe(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("mission-globe")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: id }));
}

/** DFAD leads as the feature program; PARMO sits beside it. */
export function PastPerformanceCards() {
  return (
    <ul className="grid items-stretch gap-6 lg:grid-cols-12">
      {pastPerformance.map((p, i) => {
        const feature = i === 0;
        const onGlobe = Boolean(getFeature(p.id));
        const rows = [
          { label: "Contract", value: p.contract },
          { label: "Period of performance", value: p.period },
          { label: "Contract type", value: p.contractType },
          { label: "Relevant NAICS", value: p.naics },
        ].filter((r): r is { label: string; value: string } => Boolean(r.value));

        return (
          <li
            key={p.id}
            className={`flex flex-col rounded-[6px] border border-paper-300 bg-white p-7 shadow-[var(--shadow-lift)] sm:p-9 ${
              feature ? "lg:col-span-7" : "lg:col-span-5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-graphite-500">{p.agency}</p>
              {p.placeOfPerformance && (
                <p className="inline-flex items-center gap-1.5 font-mono text-[0.75rem] text-graphite-600">
                  <MapPin className="size-3.5 text-azure-700" aria-hidden="true" />
                  {p.placeOfPerformance}
                </p>
              )}
            </div>
            <h3 className="mt-6 font-[family-name:var(--font-display)] text-[3rem] font-medium leading-none tracking-[-0.04em] text-ink-900">
              {p.program}
            </h3>
            <p className="mt-3 text-[1.0625rem] font-medium text-ink-800">{p.name}</p>
            <p className="mt-4 max-w-xl text-[0.9375rem] leading-[1.7] text-graphite-600">{p.description}</p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="What we built">
              {p.work.map((w) => (
                <li
                  key={w}
                  className="rounded-[3px] border border-azure-600/20 bg-azure-50 px-2.5 py-1 text-[0.8125rem] text-azure-700"
                >
                  {w}
                </li>
              ))}
            </ul>

            {rows.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-paper-200 pt-6">
                {rows.map((r) => (
                  <div key={r.label}>
                    <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-graphite-500">{r.label}</dt>
                    <dd className="mt-1 font-mono text-[0.875rem] text-ink-900">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto pt-8">
              {onGlobe ? (
                <button
                  type="button"
                  onClick={() => focusOnGlobe(p.id)}
                  className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-azure-700 hover:text-ink-900"
                >
                  <Crosshair className="size-4" aria-hidden="true" />
                  Show {p.program} on the mission map
                </button>
              ) : (
                <p className="text-[0.875rem] text-graphite-600">Contract details available on request.</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
