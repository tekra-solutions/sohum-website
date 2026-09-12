import Link from "next/link";
import type { ReactNode } from "react";
import { btnSecondary } from "./form";

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
        <h1 className="truncate text-[1.125rem] font-medium leading-tight text-ink-900 sm:text-[1.25rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[0.8125rem] text-graphite-600">{description}</p>
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
  /** "accent" is the brand orange, for a number worth noticing; "critical"
   *  matches the OVERDUE status pill, for money that is genuinely late. */
  tone?: "default" | "accent" | "critical";
}) {
  const body = (
    <>
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-graphite-500">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-[1.5rem] font-medium leading-none tabular-nums ${
          tone === "accent" ? "text-flame-600" : tone === "critical" ? "text-[#a5382b]" : "text-ink-900"
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
  // Application stages, in pipeline order.
  NEW: "border-flame-500/40 bg-flame-500/10 text-flame-700",
  SCREENING: "border-[#0a6d92]/30 bg-[#0a6d92]/10 text-[#0a6d92]",
  SHORTLISTED: "border-[#7a5c00]/30 bg-[#f0a93c]/15 text-[#7a5c00]",
  INTERVIEW: "border-[#5b3fa8]/30 bg-[#5b3fa8]/10 text-[#5b3fa8]",
  OFFER: "border-[#0a6d92]/30 bg-[#0a6d92]/10 text-[#0a6d92]",
  HIRED: "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]",
  REJECTED: "border-paper-300 bg-paper-100 text-graphite-600",
  // Job statuses. Approval states are in flight, so they share the amber tone.
  DRAFT: "border-paper-300 bg-paper-100 text-graphite-600",
  PENDING_APPROVAL: "border-[#7a5c00]/30 bg-[#f0a93c]/15 text-[#7a5c00]",
  APPROVED: "border-[#5b3fa8]/30 bg-[#5b3fa8]/10 text-[#5b3fa8]",
  PUBLISHED: "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]",
  CLOSED: "border-paper-300 bg-paper-100 text-graphite-600",
  ARCHIVED: "border-paper-300 bg-transparent text-graphite-500",
  // Offer statuses. DRAFT/PENDING_APPROVAL/APPROVED are shared with jobs
  // above. The rest reuse existing tones rather than introducing new colors
  // — this codebase deliberately has no alarming "red" status pill, so
  // terminal non-hire outcomes share the neutral grey used by REJECTED.
  SENT: "border-[#0a6d92]/30 bg-[#0a6d92]/10 text-[#0a6d92]",
  VIEWED: "border-[#0a6d92]/30 bg-[#0a6d92]/10 text-[#0a6d92]",
  ACCEPTED: "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]",
  DECLINED: "border-paper-300 bg-paper-100 text-graphite-600",
  EXPIRED: "border-paper-300 bg-paper-100 text-graphite-600",
  WITHDRAWN: "border-paper-300 bg-transparent text-graphite-500",
  // Invoice statuses. DRAFT/SENT/VIEWED reuse tones already defined above;
  // only keys with no existing entry are added here. OVERDUE is the one
  // deliberate exception to this palette's no-red rule: unpaid money past
  // its due date is the single state a finance user must not scroll past.
  PARTIALLY_PAID: "border-[#7a5c00]/30 bg-[#f0a93c]/15 text-[#7a5c00]",
  OVERDUE: "border-[#c0392b]/30 bg-[#c0392b]/[0.08] text-[#a5382b]",
  VOID: "border-paper-300 bg-transparent text-graphite-500",
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
    <div className="rounded-[4px] border border-dashed border-paper-300 bg-white p-8 text-center">
      <p className="text-[0.9375rem] font-medium text-ink-900">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-[0.8125rem] text-graphite-600">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** Admin button styles.
 *
 * form.tsx holds the single definition; these aliases exist so screens written
 * against either name render the identical control. Before this the admin had
 * two button scales — 14px here, 13px there — which is why headers looked
 * subtly different between Jobs and Employees.
 */
export { btn as adminButton, btnSecondary as adminButtonSecondary } from "./form";

/* ------------------------------------------------------------------ layout */

/**
 * The standard page body wrapper. Every admin screen used to hand-roll its own
 * `p-5 sm:p-6 lg:p-8` (and a few used `sm:p-8`, which is why some pages sat a
 * few pixels off from the rest). One component now owns page padding and the
 * vertical rhythm between sections.
 */
export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-6 p-5 sm:p-6 lg:p-8 ${className}`}>{children}</div>;
}

/** A white panel — the one surface treatment used across the admin. */
export function Card({
  title,
  description,
  action,
  children,
  id,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`rounded-[4px] border border-paper-300 bg-white ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-medium text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-[0.75rem] text-graphite-600">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

/**
 * Filter bar shared by every list screen. Previously each list styled its own
 * search input and selects inline, so focus rings, heights and radii differed
 * between Jobs, Applications, Offers, Invoices and Audit.
 */
export function Toolbar({ children, action = "Filter" }: { children: ReactNode; action?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2.5 rounded-[4px] border border-paper-300 bg-white p-3.5">
      {children}
      <button type="submit" className={btnSecondary}>{action}</button>
    </form>
  );
}

/** Labelled filter control wrapper, sized to sit on one row in the Toolbar. */
export function Filter({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${wide ? "min-w-[14rem] flex-1" : "w-full sm:w-auto"}`}>
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">{label}</span>
      {children}
    </label>
  );
}

/** Section heading used between cards on a page. */
export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[0.9375rem] font-medium text-ink-900">{title}</h2>
      {action}
    </div>
  );
}

/** Consistent table chrome: horizontal scroll container + header row. */
export function DataTable({ headers, children, minWidth = "48rem" }: { headers: readonly string[]; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-[4px] border border-paper-300 bg-white">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-paper-300">
            {headers.map((h, i) => (
              <th key={`${h}-${i}`} scope="col" className="px-4 py-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Standard body cell + row, so every table shares one density. */
export const td = "px-4 py-2.5 text-[0.8125rem] text-graphite-700";
export const tr = "border-b border-paper-200 last:border-0 hover:bg-paper-50";

/** Previous/next pager shared by the list screens. */
export function Pager({ page, pageCount, href }: { page: number; pageCount: number; href: (n: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
      <p className="text-[0.75rem] text-graphite-600">Page {page} of {pageCount}</p>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className={btnSecondary}>Previous</Link>}
        {page < pageCount && <Link href={href(page + 1)} className={btnSecondary}>Next</Link>}
      </div>
    </nav>
  );
}
