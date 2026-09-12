"use client";
import Link from "next/link";
import { useState } from "react";
import { BulkCandidates } from "./BulkCandidates";
import { StatusPill, td, tr } from "./ui";

export type CandidateRow = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  jobLocation: string;
  status: string;
  statusLabel: string;
  applied: string;
  appliedTitle: string;
};

/**
 * The candidates list, with selection.
 *
 * Selection lives here rather than in a separate panel so the checkbox sits on
 * the row it refers to — the previous design duplicated the whole list as
 * checkboxes inside a collapsed disclosure above the table.
 */
export function CandidateTable({
  rows,
  staff,
  canBulk,
  canAssign,
}: {
  rows: CandidateRow[];
  staff: { id: string; name: string }[];
  canBulk: boolean;
  canAssign: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected(on ? [...selected, id] : selected.filter(x => x !== id));

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-[4px] border border-paper-300 bg-white lg:block">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-paper-300">
              {canBulk && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => setSelected(e.target.checked ? rows.map(r => r.id) : [])}
                    aria-label="Select all candidates on this page"
                    className="size-3.5 accent-ink-900"
                  />
                </th>
              )}
              {["Candidate", "Job", "Location", "Applied", "Status"].map(h => (
                <th key={h} scope="col" className="px-4 py-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={tr}>
                {canBulk && (
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={e => toggle(r.id, e.target.checked)}
                      aria-label={`Select ${r.name}`}
                      className="size-3.5 accent-ink-900"
                    />
                  </td>
                )}
                <th scope="row" className="px-4 py-2.5 text-left">
                  <Link href={`/admin/applications/${r.id}`} className="block">
                    <span className="block text-[0.8125rem] font-medium text-ink-900">{r.name}</span>
                    <span className="block text-[0.75rem] font-normal text-graphite-600">{r.email}</span>
                  </Link>
                </th>
                <td className={td}>{r.jobTitle}</td>
                <td className={`${td} text-graphite-600`}>{r.jobLocation}</td>
                <td className={`${td} whitespace-nowrap text-[0.75rem] text-graphite-600`}>
                  <span title={r.appliedTitle}>{r.applied}</span>
                </td>
                <td className="px-4 py-2.5"><StatusPill status={r.status} label={r.statusLabel} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-3 lg:hidden">
        {rows.map(r => (
          <li key={r.id}>
            <Link href={`/admin/applications/${r.id}`} className="block rounded-[4px] border border-paper-300 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[0.8125rem] font-medium text-ink-900">{r.name}</span>
                <StatusPill status={r.status} label={r.statusLabel} />
              </div>
              <p className="mt-0.5 truncate text-[0.75rem] text-graphite-600">{r.email}</p>
              <p className="mt-2 border-t border-paper-200 pt-2 text-[0.8125rem] text-graphite-700">{r.jobTitle}</p>
              <p className="mt-0.5 text-[0.75rem] text-graphite-500">{r.applied}</p>
            </Link>
          </li>
        ))}
      </ul>

      {canBulk && (
        <BulkCandidates
          staff={staff}
          canAssign={canAssign}
          selected={selected}
          onSelectedChange={setSelected}
        />
      )}
    </div>
  );
}
