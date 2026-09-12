"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { candidateAction } from "@/lib/ats/actions";
import { applicationStatusLabel } from "@/lib/format";
import { allowedTransitions, type Stage } from "@/lib/ats/transitions";
type Card = { id: string; name: string; job: string; date: string; location: string; experience: number | null; resume: boolean; interview: boolean; status: string; hasEmployee: boolean };
export function PipelineBoard({ columns, canMove }: { columns: { status: string; total: number; cards: Card[]; href: string }[]; canMove: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [dragging, setDragging] = useState<Card | null>(null);

  /** Client-side mirror of the server rule, so illegal drops are refused
   * before a round trip and the column can show it will not accept the card.
   * The server re-checks regardless — this is feedback, not enforcement. */
  const legal = (card: Card | null, to: string) =>
    Boolean(card) && card!.status !== to &&
    allowedTransitions(card!.status as Stage, { hasEmployee: card!.hasEmployee }).includes(to as Stage);

  function move(card: Card, status: string) {
    if (!canMove || pending) return;
    if (!legal(card, status)) {
      setMessage({ text: `${card.name} cannot move from ${applicationStatusLabel[card.status]} to ${applicationStatusLabel[status]}.`, tone: "error" });
      setDragging(null);
      return;
    }
    startTransition(async () => {
      const form = new FormData(); form.set("applicationId", card.id); form.set("kind", "status"); form.set("status", status);
      try {
        const result = await candidateAction({}, form);
        setMessage(result.error ? { text: result.error, tone: "error" } : { text: `${card.name} moved to ${applicationStatusLabel[status]}.`, tone: "ok" });
      } catch {
        setMessage({ text: "Could not move candidate. Your change was not saved — refresh and try again.", tone: "error" });
      }
      setDragging(null);
    });
  }

  return (
    <>
      <p role="status" aria-live="polite" className={`mb-3 min-h-5 text-[0.8125rem] ${message?.tone === "error" ? "text-[#a5382b]" : "text-ink-800"}`}>
        {pending ? "Updating candidate…" : message?.text ?? ""}
      </p>

      <div className="flex gap-4 overflow-x-auto pb-5" aria-label="Candidate pipeline" aria-busy={pending}>
        {columns.map(column => {
          const accepts = dragging ? legal(dragging, column.status) : false;
          return (
            <section
              key={column.status}
              className={`flex w-[17rem] shrink-0 flex-col self-start rounded-[4px] border bg-paper-50 transition-colors ${
                dragging ? (accepts ? "border-ink-600 bg-white" : "border-paper-300 opacity-50") : "border-paper-300"
              }`}
              onDragOver={e => { if (canMove && accepts) e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); if (dragging) move(dragging, column.status); }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-paper-300 px-4 py-2.5">
                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-900">
                  {applicationStatusLabel[column.status]}
                </h2>
                <span className="text-[0.6875rem] tabular-nums text-graphite-600">{column.total}</span>
              </div>

              <ul className="flex-1 space-y-2 p-2.5">
                {column.cards.map(card => {
                  const moves = allowedTransitions(card.status as Stage, { hasEmployee: card.hasEmployee });
                  return (
                    <li
                      key={card.id}
                      draggable={canMove && !pending && moves.length > 0}
                      onDragStart={() => setDragging(card)}
                      onDragEnd={() => setDragging(null)}
                      className="rounded-[3px] border border-paper-300 bg-white p-3"
                    >
                      <Link href={`/admin/applications/${card.id}`} className="text-[0.8125rem] font-medium text-ink-900 hover:underline">
                        {card.name}
                      </Link>
                      <p className="mt-0.5 truncate text-[0.75rem] text-graphite-600">{card.job}</p>

                      {/* One metadata line instead of four stacked ones — the
                          full detail is a click away on the profile. */}
                      <p className="mt-2 text-[0.6875rem] text-graphite-500">
                        {[
                          card.date,
                          card.location,
                          card.experience !== null ? `${card.experience}y` : "",
                        ].filter(Boolean).join(" · ")}
                      </p>

                      {card.interview && (
                        <p className="mt-1.5 text-[0.6875rem] font-medium text-ink-600">Interview scheduled</p>
                      )}

                      {canMove && (moves.length > 0 ? (
                        <label className="mt-2.5 block">
                          <span className="sr-only">Move {card.name} to stage</span>
                          <select
                            className="w-full rounded-[3px] border border-paper-300 bg-white px-2 py-1.5 text-[0.75rem] text-graphite-700 transition-colors focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/25"
                            value={card.status}
                            disabled={pending}
                            onChange={e => move(card, e.target.value)}
                          >
                            <option value={card.status}>Move to…</option>
                            {moves.map(s => <option key={s} value={s}>{applicationStatusLabel[s]}</option>)}
                          </select>
                        </label>
                      ) : (
                        <p className="mt-2.5 text-[0.6875rem] text-graphite-500">
                          {card.hasEmployee ? "Converted to employee" : "No further stages"}
                        </p>
                      ))}
                    </li>
                  );
                })}

                {!column.cards.length && (
                  <li className="px-1.5 py-4 text-center text-[0.75rem] text-graphite-500">No candidates</li>
                )}
              </ul>

              {column.total > 20 && (
                <Link href={column.href} className="border-t border-paper-300 px-4 py-2.5 text-[0.75rem] font-medium text-ink-900 underline underline-offset-4">
                  View all {column.total}
                </Link>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-1 text-[0.6875rem] text-graphite-500">
        {canMove ? "Drag a candidate between stages, or use the selector on a card. " : "Candidates for your assigned positions. "}
        Showing up to 20 per stage.
      </p>
    </>
  );
}
