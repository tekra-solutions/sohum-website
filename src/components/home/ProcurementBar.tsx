"use client";

import Link from "next/link";
import { ChevronDown, FileText } from "lucide-react";
import { procurement, sba8aLabel } from "@/content/company";
import { useToday } from "./useToday";

/**
 * Thin, monospaced strip above the navigation carrying the identifiers a
 * contracting officer scans for. Collapses into a disclosure on small screens.
 */
export function ProcurementBar({ initialDay }: { initialDay: string }) {
  const day = useToday(initialDay);
  const facts = [
    sba8aLabel(day),
    `UEI ${procurement.uei}`,
    `CAGE ${procurement.cage}`,
    `NAICS ${procurement.primaryNaics} (primary)`,
    "Small disadvantaged business",
  ].filter((f): f is string => Boolean(f));

  const statement = (
    <Link
      href={procurement.capabilityStatement}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-azure-300 underline decoration-azure-300/40 underline-offset-4 transition-colors hover:decoration-azure-300"
    >
      <FileText className="size-3.5" aria-hidden="true" />
      Capability statement
    </Link>
  );

  return (
    <aside
      aria-label="Company identifiers"
      className="border-b border-hairline bg-night-900 font-mono text-[0.75rem] leading-6 text-mist-400 print:hidden"
    >
      <div className="container-page">
        <div className="hidden items-center justify-between gap-6 py-2 md:flex">
          <p className="flex flex-wrap items-center gap-x-3">
            {facts.map((fact, i) => (
              <span key={fact} className="flex items-center gap-x-3">
                {i > 0 && <span aria-hidden="true" className="text-night-600">·</span>}
                <span className={i === 0 ? "text-mist-200" : undefined}>{fact}</span>
              </span>
            ))}
          </p>
          {statement}
        </div>

        <details className="group md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-mist-200 [&::-webkit-details-marker]:hidden">
            Company data
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="space-y-1.5 pb-3">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
            <li className="pt-1.5">{statement}</li>
          </ul>
        </details>
      </div>
    </aside>
  );
}
