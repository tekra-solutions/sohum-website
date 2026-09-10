import Link from "next/link";
import type { ReactNode } from "react";

/** Page header used across admin screens. */
export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-4 border-b border-paper-300 bg-white/95 px-5 py-5 backdrop-blur-sm sm:px-8 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-[1.375rem] font-medium leading-tight text-ink-900 sm:text-[1.5rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[0.9375rem] text-graphite-600">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-3">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  href?: string;
  tone?: "default" | "accent";
}) {
  const body = (
    <>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-graphite-500">
        {label}
      </p>
      <p
        className={`mt-1.5 font-[family-name:var(--font-display)] text-[1.75rem] font-medium leading-none tabular-nums ${
          tone === "accent" ? "text-flame-600" : "text-ink-900"
        }`}
      >
        {value}
      </p>
    </>
  );

  const cls =
    "block rounded-[4px] border border-paper-300 bg-white px-4 py-3.5 transition-[border-color,box-shadow] duration-300";

  return href ? (
    <Link href={href} className={`${cls} hover:border-ink-500/30 hover:shadow-[var(--shadow-lift)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const statusTones: Record<string, string> = {
  NEW: "border-flame-500/40 bg-flame-500/10 text-flame-700",
  REVIEWING: "border-[#0a6d92]/30 bg-[#0a6d92]/10 text-[#0a6d92]",
  SHORTLISTED: "border-[#7a5c00]/30 bg-[#f0a93c]/15 text-[#7a5c00]",
  INTERVIEW: "border-[#5b3fa8]/30 bg-[#5b3fa8]/10 text-[#5b3fa8]",
  HIRED: "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]",
  REJECTED: "border-paper-300 bg-paper-100 text-graphite-600",
  PUBLISHED: "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]",
  DRAFT: "border-paper-300 bg-paper-100 text-graphite-600",
  CLOSED: "border-paper-300 bg-paper-100 text-graphite-600",
  ARCHIVED: "border-paper-300 bg-transparent text-graphite-500",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
        statusTones[status] ?? statusTones.DRAFT
      }`}
    >
      {label ?? status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[4px] border border-dashed border-paper-300 bg-white p-10 text-center">
      <p className="text-[1.0625rem] font-medium text-ink-900">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-[0.9375rem] text-graphite-600">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** Primary admin button style, shared by links and submit buttons. */
export const adminButton =
  "inline-flex items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-5 py-2.5 " +
  "text-[0.875rem] font-medium text-white transition-colors hover:bg-ink-700 " +
  "disabled:pointer-events-none disabled:opacity-60";

export const adminButtonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper-300 bg-white " +
  "px-5 py-2.5 text-[0.875rem] font-medium text-ink-900 transition-colors hover:border-ink-500 " +
  "disabled:pointer-events-none disabled:opacity-60";
