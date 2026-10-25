"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  formatDate,
  formatMonth,
  getActiveVehicles,
  is8aActive,
  orderingClosesIn,
  sba8a,
  sbaCountdown,
} from "@/content/company";
import { useToday } from "./useToday";

/**
 * The one line under the hero CTAs that tells a buyer how to award today.
 * Everything is computed from dates in content/company.ts.
 */
export function HeroStatus({ initialDay }: { initialDay: string }) {
  const day = useToday(initialDay);
  const active = getActiveVehicles(day);
  const closing = active
    .map((v) => ({ v, days: orderingClosesIn(v, day) }))
    .find((x) => x.days !== null);

  let line: string;
  let chip: string;
  if (is8aActive(day)) {
    line = `Eligible for 8(a) sole-source award through ${formatMonth(sba8a.exitsOn)}`;
    chip = sbaCountdown(day)!;
  } else {
    chip = `${active.length} vehicle${active.length === 1 ? "" : "s"} open`;
    line = closing
      ? `${closing.v.name.replace(" Small Business", " SB")} ordering closes ${formatDate(closing.v.orderingEndsOn)}`
      : "Order today — see contract numbers";
  }

  return (
    <Link
      href="#vehicles"
      className="group mt-8 flex w-fit max-w-full min-w-0 items-center gap-3 rounded-full border border-hairline bg-night-900/70 py-1.5 pl-1.5 pr-4 text-[0.875rem] transition-colors hover:border-azure-400/40"
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-azure-400/15 px-2.5 py-1 font-mono text-[0.75rem] text-azure-300">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-azure-400" />
        {chip}
      </span>
      <span className="truncate text-mist-200">{line}</span>
      <ArrowRight className="size-4 shrink-0 text-mist-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
