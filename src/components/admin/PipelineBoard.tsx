"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { candidateAction } from "@/lib/ats/actions";
import { stages } from "@/lib/ats/policy";
import { applicationStatusLabel } from "@/lib/format";
import { control } from "./form";
type Card = { id: string; name: string; job: string; date: string; location: string; experience: number | null; resume: boolean; interview: boolean; status: string };
export function PipelineBoard({ columns, canMove }: { columns: { status: string; total: number; cards: Card[]; href: string }[]; canMove: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  function move(id: string, status: string) {
    if (!canMove || pending) return;
    startTransition(async () => {
      const form = new FormData(); form.set("applicationId", id); form.set("kind", "status"); form.set("status", status);
      try { const result = await candidateAction({}, form); setMessage(result.error ?? `Moved to ${applicationStatusLabel[status]}.`); }
      catch { setMessage("Could not move candidate. Refresh and try again."); }
      setDragging(null);
    });
  }
  return <><p className="mb-3 text-xs text-graphite-600">{canMove ? "Drag a candidate to a stage, or use the stage selector on each card." : "Candidates for your assigned positions."} Showing up to 20 candidates per stage.</p>
    <p role="status" className="mb-3 text-sm text-ink-800">{pending ? "Updating candidate…" : message}</p>
    <div className="flex gap-4 overflow-x-auto pb-5" aria-label="Candidate pipeline" aria-busy={pending}>
      {columns.map(column => <section key={column.status} className={`w-64 shrink-0 rounded-[4px] border border-paper-300 bg-paper-50 ${dragging ? "border-ink-400" : ""}`} onDragOver={e => { if (canMove) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (dragging) move(dragging, column.status); }}>
        <div className="flex items-center justify-between border-b border-paper-300 px-4 py-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-ink-900">{applicationStatusLabel[column.status]}</h2><span className="text-xs text-graphite-600">{column.total}</span></div>
        <ul className="space-y-3 p-3">{column.cards.map(card => <li key={card.id} draggable={canMove && !pending} onDragStart={e => { e.dataTransfer.setData("text/plain", card.id); setDragging(card.id); }} onDragEnd={() => setDragging(null)} className="rounded-[3px] border border-paper-300 bg-white p-3">
          <Link href={`/admin/applications/${card.id}`} className="text-sm font-medium text-ink-900 hover:underline">{card.name}</Link>
          <p className="mt-1 text-xs text-graphite-700">{card.job}</p><p className="mt-3 text-xs text-graphite-500">Applied {card.date}</p>
          {card.location && <p className="mt-1 text-xs text-graphite-500">{card.location}</p>}
          {card.experience !== null && <p className="mt-1 text-xs text-graphite-500">{card.experience} years experience</p>}
          <p className="mt-2 text-xs text-ink-600">{[card.resume ? "Resume attached" : "No resume", card.interview ? "Interview scheduled" : ""].filter(Boolean).join(" · ")}</p>
          {canMove && <label className="mt-3 block"><span className="sr-only">Stage for {card.name}</span><select className={control} value={card.status} disabled={pending} onChange={e => move(card.id, e.target.value)}>{stages.map(s => <option key={s} value={s}>{applicationStatusLabel[s]}</option>)}</select></label>}
        </li>)}</ul>
        {!column.cards.length && <p className="px-4 pb-4 text-xs text-graphite-500">No candidates in this stage.</p>}
        {column.total > 20 && <Link href={column.href} className="block px-4 pb-4 text-xs font-medium underline">View all {column.total} candidates</Link>}
      </section>)}
    </div></>;
}
