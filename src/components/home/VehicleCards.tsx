"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy } from "lucide-react";
import {
  daysBetween,
  formatDate,
  getVisibleVehicles,
  orderingClosesIn,
  vehicleStatus,
  type Vehicle,
} from "@/content/company";
import { useToday } from "./useToday";

/**
 * Ordering-period timeline: solid for the ordering window, hatched for the
 * period existing task orders may continue, with a marker for today.
 * Decorative: the same dates are listed as text beside it.
 */
export function OrderingTimeline({ vehicle, day }: { vehicle: Vehicle; day: string }) {
  const start = vehicle.orderingStartsOn;
  const end = vehicle.taskOrdersEndOn ?? vehicle.orderingEndsOn;
  const total = Math.max(daysBetween(start, end), 1);
  const pct = (d: string) => Math.min(100, Math.max(0, (daysBetween(start, d) / total) * 100));
  const ordering = pct(vehicle.orderingEndsOn);
  const now = pct(day);
  const open = vehicleStatus(vehicle, day) === "Active";

  return (
    <div aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-paper-200">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${open ? "bg-azure-600" : "bg-graphite-400"}`}
          style={{ width: `${ordering}%` }}
        />
        {ordering < 100 && (
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-[repeating-linear-gradient(135deg,var(--color-graphite-400)_0_2px,transparent_2px_5px)] opacity-70"
            style={{ left: `${ordering}%` }}
          />
        )}
        <div className="absolute -top-1.5 h-4.5 w-0.5 -translate-x-1/2 rounded bg-ink-900" style={{ left: `${now}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[0.6875rem] text-graphite-500">
        <span>{start.slice(0, 4)}</span>
        <span className="text-ink-800">Today</span>
        <span>{end.slice(0, 4)}</span>
      </div>
    </div>
  );
}

function CopyNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* Selecting the text still works. */
        }
      }}
      aria-label={copied ? `Contract number ${value} copied` : `Copy contract number ${value}`}
      className="rounded p-1.5 text-graphite-500 transition-colors hover:bg-paper-100 hover:text-azure-700"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
    </button>
  );
}

export function VehicleCards({ initialDay }: { initialDay: string }) {
  const day = useToday(initialDay);

  return (
    <ul className="grid gap-6 lg:grid-cols-3">
      {getVisibleVehicles(day).map((v) => {
        const status = vehicleStatus(v, day);
        const open = status === "Active";
        const closes = orderingClosesIn(v, day);
        return (
          <li
            key={v.slug}
            className="flex flex-col rounded-[6px] border border-paper-300 bg-white p-6 shadow-[var(--shadow-lift)] sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-[3px] border px-2 py-1 font-mono text-[0.6875rem] ${
                  open ? "border-azure-600/30 bg-azure-50 text-azure-700" : "border-paper-300 text-graphite-600"
                }`}
              >
                <span aria-hidden="true" className={`size-1.5 rounded-full ${open ? "bg-azure-600" : "bg-graphite-400"}`} />
                {status}
              </span>
              {closes !== null && (
                <span className="font-mono text-[0.6875rem] font-medium text-ink-900">
                  Closes in {closes} day{closes === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <h3 className="mt-6 font-plex text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-ink-900">
              {v.name}
            </h3>
            <p className="mt-1 text-[0.875rem] text-graphite-600">{v.holder}</p>

            <div className="mt-6 flex items-center justify-between gap-3 rounded-[4px] bg-paper-100 py-2 pl-4 pr-2">
              <div>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-graphite-500">Contract number</p>
                <p className="mt-0.5 font-mono text-[1.0625rem] font-medium text-ink-900">{v.number}</p>
              </div>
              <CopyNumber value={v.number} />
            </div>

            <div className="mt-6">
              <OrderingTimeline vehicle={v} day={day} />
            </div>

            <dl className="mt-5 space-y-3 text-[0.875rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-600">Ordering period</dt>
                <dd className="text-right font-mono text-[0.8125rem] text-ink-900">
                  {formatDate(v.orderingStartsOn)} – {formatDate(v.orderingEndsOn)}
                </dd>
              </div>
              {v.taskOrdersEndOn && (
                <div className="flex justify-between gap-4">
                  <dt className="text-graphite-600">Task orders through</dt>
                  <dd className="text-right font-mono text-[0.8125rem] text-ink-900">{formatDate(v.taskOrdersEndOn)}</dd>
                </div>
              )}
              <div>
                <dt className="text-graphite-600">Order types</dt>
                <dd className="mt-1 font-mono text-[0.8125rem] leading-relaxed text-ink-900">{v.orderTypes}</dd>
              </div>
            </dl>

            <p className="mt-5 flex-1 border-t border-paper-200 pt-5 text-[0.9375rem] leading-relaxed text-graphite-600">
              {open
                ? v.useIt
                : "New orders are closed. Existing task orders continue; contact us about an order already in place or another open vehicle."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[0.9375rem]">
              <Link
                href={`/contract-vehicles#${v.slug}`}
                className="group inline-flex items-center gap-1.5 font-semibold text-azure-700 hover:text-ink-900"
              >
                How to order
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              {v.verifyAt && (
                <a
                  href={v.verifyAt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[0.8125rem] text-graphite-600 underline decoration-paper-300 underline-offset-4 hover:text-ink-900"
                >
                  {v.verifyAt.label}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
