"use client";
import { useActionState, useId, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { candidateAction, type ActionState } from "@/lib/ats/actions";
import { btn, control } from "./form";
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className={btn} disabled={pending}>{pending ? "Saving…" : label}</button>;
}
export function WorkflowForm({ children, applicationId, kind, label = "Save", action = candidateAction }: {
  children: React.ReactNode; applicationId?: string; kind?: string; label?: string;
  action?: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, submit] = useActionState(async (previous: ActionState, form: FormData) => {
    for (const key of ["startsAt", "endsAt", "dueAt"]) {
      const value = form.get(key);
      if (typeof value === "string" && value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) form.set(key, date.toISOString());
      }
    }
    if (kind === "interview") form.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    return action(previous, form);
  }, {});
  return <form action={submit} className="space-y-3">
    {applicationId && <input type="hidden" name="applicationId" value={applicationId} />}
    {kind && <input type="hidden" name="kind" value={kind} />}
    {children}<Submit label={label} />
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-sm text-ink-700">{state.success}</p>}
  </form>;
}
export function WorkflowField({ label, name, value, type = "text", options, multiline, required = false }: {
  label: string; name: string; value?: string | number | null; type?: string;
  options?: readonly { value: string; label: string }[]; multiline?: boolean; required?: boolean;
}) {
  const id = useId();
  const displayValue = useSyncExternalStore(() => () => {}, () => {
    if (type !== "datetime-local" || typeof value !== "string" || !value.endsWith("Z")) return value ?? "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }, () => type === "datetime-local" && typeof value === "string" ? value.slice(0,16) : value ?? "");
  return <div><label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-800">{label}</label>
    {options ? <select id={id} name={name} defaultValue={displayValue} className={control} required={required}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      : multiline ? <textarea id={id} name={name} defaultValue={displayValue} className={control} rows={4} required={required} />
      : <input id={id} name={name} type={type} defaultValue={displayValue} className={control} required={required} />}
  </div>;
}
