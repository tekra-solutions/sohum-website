"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { candidateAction } from "@/lib/ats/actions";
import { applicationStatusLabel } from "@/lib/format";
import { allowedTransitions, type Stage } from "@/lib/ats/transitions";
import { control } from "./form";
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

  return <><p className="mb-3 text-xs text-graphite-600">{canMove ? "Drag a candidate to a stage, or use the stage selector on each card." : "Candidates for your assigned positions."} Showing up to 20 candidates per stage.</p>
    <p role="status" aria-live="polite" className={`mb-3 min-h-5 text-sm ${message?.tone === "error" ? "text-[#8e2c20]" : "text-ink-800"}`}>
      {pending ? "Updating candidate…" : message?.text ?? ""}
    </p>
    <div className="flex gap-4 overflow-x-auto pb-5" aria-label="Candidate pipeline" aria-busy={pending}>
      {columns.map(column => {
        const accepts = dragging ? legal(dragging, column.status) : false;
        return <section key={column.status}
          className={`w-64 shrink-0 rounded-[4px] border bg-paper-50 transition-colors ${dragging ? (accepts ? "border-ink-600 bg-white" : "border-paper-300 opacity-50") : "border-paper-300"}`}
          onDragOver={e => { if (canMove && accepts) e.preventDefault(); }}
          onDrop={e => { e.preventDefault(); if (dragging) move(dragging, column.status); }}>
        <div className="flex items-center justify-between border-b border-paper-300 px-4 py-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-ink-900">{applicationStatusLabel[column.status]}</h2><span className="text-xs text-graphite-600">{column.total}</span></div>
        <ul className="space-y-3 p-3">{column.cards.map(card => {
          const moves = allowedTransitions(card.status as Stage, { hasEmployee: card.hasEmployee });
          return <li key={card.id} draggable={canMove && !pending && moves.length > 0} onDragStart={() => setDragging(card)} onDragEnd={() => setDragging(null)} className="rounded-[3px] border border-paper-300 bg-white p-3">
          <Link href={`/admin/applications/${card.id}`} className="text-sm font-medium text-ink-900 hover:underline">{card.name}</Link>
          <p className="mt-1 text-xs text-graphite-700">{card.job}</p><p className="mt-3 text-xs text-graphite-500">Applied {card.date}</p>
          {card.location && <p className="mt-1 text-xs text-graphite-500">{card.location}</p>}
          {card.experience !== null && <p className="mt-1 text-xs text-graphite-500">{card.experience} years experience</p>}
          <p className="mt-2 text-xs text-ink-600">{[card.resume ? "Resume attached" : "No resume", card.interview ? "Interview scheduled" : ""].filter(Boolean).join(" · ")}</p>
          {canMove && (moves.length > 0
            ? <label className="mt-3 block"><span className="sr-only">Move {card.name} to stage</span>
                <select className={control} value={card.status} disabled={pending} onChange={e => move(card, e.target.value)}>
                  <option value={card.status}>{applicationStatusLabel[card.status]}</option>
                  {moves.map(s => <option key={s} value={s}>Move to {applicationStatusLabel[s]}</option>)}
                </select>
              </label>
            : <p className="mt-3 text-xs text-graphite-500">{card.hasEmployee ? "Converted to employee" : "No further stages"}</p>)}
        </li>; })}</ul>
        {!column.cards.length && <p className="px-4 pb-4 text-xs text-graphite-500">No candidates in this stage.</p>}
        {column.total > 20 && <Link href={column.href} className="block px-4 pb-4 text-xs font-medium underline">View all {column.total} candidates</Link>}
      </section>; })}
    </div></>;
}
