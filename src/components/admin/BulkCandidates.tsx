"use client";
import { useState } from "react";
import { WorkflowForm, WorkflowField } from "./WorkflowForm";
import { bulkCandidateAction } from "@/lib/ats/actions";
import { stages } from "@/lib/ats/policy";
import { applicationStatusLabel } from "@/lib/format";
import { t } from "./form";

/**
 * Bulk operations on the candidates currently listed.
 *
 * Previously this rendered a checkbox for every row inside a collapsed
 * `<details>` — a second, scrolling copy of the list the user was already
 * looking at, which does not work at a page size of 25 and reads as a
 * different screen from the table beside it. Selection now happens on the
 * table rows themselves; this is only the action bar, and it stays out of the
 * way entirely until something is selected.
 *
 * The old "Email candidates" option is gone: it performed no bulk action, it
 * just listed per-candidate links to compose individually, which the table
 * already provides.
 */
export function BulkCandidates({
  staff,
  canAssign,
  selected,
  onSelectedChange,
}: {
  staff: { id: string; name: string }[];
  canAssign: boolean;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
}) {
  const [kind, setKind] = useState("status");
  if (!selected.length) return null;

  return (
    <div className="sticky bottom-4 z-10 rounded-[4px] border border-ink-700 bg-ink-950 p-3.5 shadow-[var(--shadow-lift-lg)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className={`${t.body} font-medium text-white`}>
          {selected.length} selected
        </p>
        <button
          type="button"
          onClick={() => onSelectedChange([])}
          className={`${t.hint} text-white/60 underline underline-offset-4 hover:text-white`}
        >
          Clear
        </button>

        <label className="flex items-center gap-2">
          <span className="sr-only">Bulk action</span>
          <select
            value={kind}
            onChange={e => setKind(e.target.value)}
            className="rounded-[3px] border border-white/20 bg-ink-900 px-3 py-1.5 text-[0.8125rem] text-white focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
          >
            <option value="status">Change stage</option>
            <option value="archive">Archive</option>
            {canAssign && <option value="assign">Assign recruiter</option>}
          </select>
        </label>

        <div className="[&_form]:flex [&_form]:flex-wrap [&_form]:items-end [&_form]:gap-3 [&_form]:space-y-0 [&_label]:text-white/70 [&_select]:min-w-[10rem]">
          <WorkflowForm action={bulkCandidateAction} label={`Apply to ${selected.length}`}>
            <input type="hidden" name="kind" value={kind} />
            {selected.map(id => <input key={id} type="hidden" name="ids" value={id} />)}
            {kind === "status" && (
              <WorkflowField name="status" label="Stage" options={stages.map(value => ({ value, label: applicationStatusLabel[value] }))} />
            )}
            {kind === "assign" && (
              <WorkflowField name="assignedTo" label="Recruiter" options={[{ value: "", label: "Unassigned" }, ...staff.map(s => ({ value: s.id, label: s.name }))]} />
            )}
            {kind === "archive" && (
              <p className={`${t.hint} text-white/70`}>
                Hidden from the active queue. History is retained and they can be restored.
              </p>
            )}
          </WorkflowForm>
        </div>
      </div>
    </div>
  );
}
