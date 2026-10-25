"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { getActiveVehicles, is8aActive, naics, procurement } from "@/content/company";
import { useToday } from "./useToday";

type Tile = { label: string; value: string; detail?: string; copy?: boolean };

/** The six facts a buyer copies into market research, each one click to copy. */
export function AtAGlance({ initialDay }: { initialDay: string }) {
  const day = useToday(initialDay);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const active = getActiveVehicles(day);
  const primary = naics.find((n) => n.primary)!;
  const tiles: Tile[] = [
    { label: "UEI", value: procurement.uei, detail: "SAM.gov Unique Entity ID", copy: true },
    { label: "CAGE", value: procurement.cage, copy: true },
    { label: "Primary NAICS", value: primary.code, detail: primary.label, copy: true },
    {
      label: "Socioeconomic",
      value: is8aActive(day) ? "SBA 8(a) · SDB" : "Small · SDB",
      detail: "Small disadvantaged (self-certified) · minority-owned",
    },
    {
      label: "Vehicles",
      value: `${active.length} open`,
      detail: active.map((v) => v.name.replace("Multiple Award Schedule", "MAS").replace(" Small Business", " SB")).join(" · "),
    },
    { label: "HQ", value: procurement.headquarters, detail: "Since 2013" },
  ];

  async function copy(tile: Tile) {
    try {
      await navigator.clipboard.writeText(tile.value);
      setCopied(tile.label);
      setMessage(`${tile.label} ${tile.value} copied to clipboard.`);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setMessage(`Could not copy ${tile.label}. Select the value to copy it.`);
    }
  }

  return (
    <section aria-labelledby="glance-title" className="relative border-t border-hairline bg-night-900/70">
      <div className="container-page">
        <h2 id="glance-title" className="sr-only">
          Company data at a glance
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 py-7 md:grid-cols-3 xl:grid-cols-6 xl:gap-0">
          {tiles.map((tile, i) => (
            <div key={tile.label} className={i > 0 ? "xl:border-l xl:border-hairline xl:pl-6" : "xl:pr-6"}>
              <dt className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-mist-400">
                {tile.label}
                {tile.copy && (
                  <button
                    type="button"
                    onClick={() => copy(tile)}
                    aria-label={`Copy ${tile.label} ${tile.value}`}
                    className="-my-1 rounded p-1 text-mist-400 transition-colors hover:bg-night-800 hover:text-azure-300"
                  >
                    {copied === tile.label ? (
                      <Check className="size-3.5 text-azure-300" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                )}
              </dt>
              <dd className="mt-2 font-mono text-[1rem] font-medium leading-snug text-mist-50">{tile.value}</dd>
              {tile.detail && <dd className="mt-1 text-[0.8125rem] leading-snug text-mist-400">{tile.detail}</dd>}
            </div>
          ))}
        </dl>
        <p role="status" aria-live="polite" className="sr-only">
          {message}
        </p>
      </div>
    </section>
  );
}
