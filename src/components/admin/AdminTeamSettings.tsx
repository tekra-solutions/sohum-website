"use client";

import { useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { CreateAdminForm } from "./CreateAdminForm";
import { WorkflowForm } from "./WorkflowForm";
import { StatusPill } from "./ui";
import { btn, control } from "./form";
import { adminRoleDetails } from "@/lib/auth/roles";
import { setAdminActiveAction } from "@/lib/services/admin-actions";
import { relativeTime } from "@/lib/format";

type TeamMember = { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt: Date | null };

export function AdminTeamSettings({ team, currentAdminId }: { team: TeamMember[]; currentAdminId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = team.filter(a => `${a.name} ${a.email} ${adminRoleDetails[a.role]?.label}`.toLowerCase().includes(search.toLowerCase().trim()) && (status === "all" || a.isActive === (status === "active")));
  function close() { if (busy) return; dialog.current?.close(); setOpen(false); trigger.current?.focus(); }

  return (
    <section id="team" aria-labelledby="team-title" className="scroll-mt-28 rounded border border-paper-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-paper-200 p-5 sm:p-6">
        <div><h2 id="team-title" className="text-base font-medium text-ink-900">Team & access</h2><p className="mt-1 text-xs text-graphite-500">{team.filter(a => a.isActive).length} active · {team.filter(a => !a.isActive).length} disabled accounts</p></div>
        <button ref={trigger} type="button" className={btn} onClick={() => { setOpen(true); dialog.current?.showModal(); }}><UserPlus className="size-4" aria-hidden="true" />Create admin</button>
      </div>
      <div className="flex flex-col gap-3 border-b border-paper-200 p-4 sm:flex-row sm:px-6">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-graphite-400" aria-hidden="true" /><label htmlFor="team-search" className="sr-only">Search team</label><input id="team-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or role" className={`${control} pl-9`} /></div>
        <div><label htmlFor="team-status" className="sr-only">Account status</label><select id="team-status" value={status} onChange={e => setStatus(e.target.value)} className={control}><option value="all">All accounts</option><option value="active">Active</option><option value="disabled">Disabled</option></select></div>
      </div>
      <ul className="divide-y divide-paper-200">
        {filtered.map(a => (
          <li key={`${a.id}-${a.isActive}`} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper-100 text-xs font-medium text-ink-700">{a.name.split(/\s+/).map(n => n[0]).slice(0,2).join("")}</span>
              <div className="min-w-0"><p className="text-sm font-medium text-ink-900">{a.name}{a.id === currentAdminId && <span className="ml-2 rounded bg-paper-100 px-1.5 py-0.5 text-[0.625rem] text-graphite-500">YOU</span>}</p><p className="mt-0.5 break-all text-xs text-graphite-600">{a.email}</p><p className="mt-2 text-xs text-graphite-500">{adminRoleDetails[a.role]?.label ?? a.role} · {a.lastLoginAt ? `Signed in ${relativeTime(a.lastLoginAt)}` : "Not signed in yet"}</p></div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:max-w-[17rem]">
              <StatusPill status={a.isActive ? "PUBLISHED" : "ARCHIVED"} label={a.isActive ? "Active" : "Disabled"} />
              {a.id !== currentAdminId && <WorkflowForm action={setAdminActiveAction} label={a.isActive ? "Disable access" : "Enable access"} confirm={{message: a.isActive ? `Disable access for ${a.name}? They will be signed out and cannot sign in until re-enabled.` : `Restore ${a.name}'s existing ${adminRoleDetails[a.role]?.label.toLowerCase() ?? "admin"} access?`, confirmLabel: a.isActive ? "Disable access" : "Enable access", tone: a.isActive ? "danger" : "default"}}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="active" value={String(!a.isActive)} /></WorkflowForm>}
            </div>
          </li>
        ))}
      </ul>
      {!filtered.length && <div className="px-6 py-10 text-center"><p className="text-sm font-medium text-ink-900">No matching accounts</p><p className="mt-1 text-xs text-graphite-500">Try a different name or clear your filters.</p><button type="button" onClick={() => {setSearch("");setStatus("all");}} className="mt-3 text-sm underline underline-offset-4">Clear filters</button></div>}
      <dialog ref={dialog} aria-labelledby="create-admin-title" onCancel={event => { if (busy) event.preventDefault(); else close(); }} onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-lg border border-paper-300 bg-white p-0 shadow-2xl backdrop:bg-ink-950/50">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-paper-200 bg-white p-5 sm:px-6"><div><h2 id="create-admin-title" className="text-lg font-medium text-ink-900">Create admin account</h2><p className="mt-1 text-xs text-graphite-500">Add a teammate and choose their access.</p></div><button type="button" onClick={close} disabled={busy} aria-label="Close create admin" className="rounded p-2 text-graphite-500 hover:bg-paper-100 focus-visible:outline-2"><X className="size-5" aria-hidden="true" /></button></div>
        <div className="p-5 sm:p-6">{open && <CreateAdminForm onDone={close} onBusyChange={setBusy} />}</div>
      </dialog>
    </section>
  );
}
