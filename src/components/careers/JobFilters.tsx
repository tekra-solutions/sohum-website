"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { employmentTypeLabel, experienceLevelLabel } from "@/lib/format";

type Facets = {
  departments: string[];
  locations: string[];
  employmentTypes: string[];
  experienceLevels: string[];
};

/**
 * Filters drive the URL, not local state. The server component re-queries the
 * database on each change, so the browser never receives unpublished jobs and
 * a filtered view is shareable and back-button friendly.
 */
export function JobFilters({ facets, total }: { facets: Facets; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const id = useId();

  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const debounce = useRef<number | null>(null);

  // Adjust during render rather than in an effect: when navigation changes the
  // query (Clear filters, back button) the input follows without an extra pass.
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (lastUrlQ !== urlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => {
      router.replace(`/careers?${sp.toString()}`, { scroll: false });
    });
  }

  function onSearch(value: string) {
    setQ(value);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => apply({ q: value }), 250);
  }

  const selects = [
    { key: "department", label: "Department", options: facets.departments, format: (v: string) => v },
    { key: "location", label: "Location", options: facets.locations, format: (v: string) => v },
    {
      key: "employmentType",
      label: "Type",
      options: facets.employmentTypes,
      format: (v: string) => employmentTypeLabel[v] ?? v,
    },
    {
      key: "experienceLevel",
      label: "Level",
      options: facets.experienceLevels,
      format: (v: string) => experienceLevelLabel[v] ?? v,
    },
  ];

  const hasFilters =
    Boolean(params.get("q")) ||
    selects.some((s) => params.get(s.key));

  return (
    <div className="rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label
            htmlFor={`${id}-q`}
            className="block text-[0.8125rem] font-medium text-ink-800"
          >
            Search positions
          </label>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graphite-400"
              aria-hidden="true"
            />
            <input
              id={`${id}-q`}
              type="search"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Job title, department or keyword"
              className="w-full rounded-[3px] border border-paper-300 bg-white py-2.5 pl-10 pr-3 text-[0.9375rem] text-ink-900 placeholder:text-graphite-400 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          {selects.map((s) => (
            <div key={s.key}>
              <label
                htmlFor={`${id}-${s.key}`}
                className="block text-[0.8125rem] font-medium text-ink-800"
              >
                {s.label}
              </label>
              <select
                id={`${id}-${s.key}`}
                value={params.get(s.key) ?? ""}
                onChange={(e) => apply({ [s.key]: e.target.value })}
                className="mt-2 w-full rounded-[3px] border border-paper-300 bg-white px-3 py-2.5 text-[0.875rem] text-ink-900 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
              >
                <option value="">All</option>
                {s.options.map((o) => (
                  <option key={o} value={o}>
                    {s.format(o)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-paper-200 pt-4"
        aria-live="polite"
      >
        <p className="text-[0.875rem] text-graphite-600">
          {isPending ? "Searching…" : `${total} open ${total === 1 ? "position" : "positions"}`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => startTransition(() => router.replace("/careers", { scroll: false }))}
            className="inline-flex items-center gap-1.5 rounded text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 transition-colors hover:decoration-flame-500"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
