"use client";

import { useActionState, useState } from "react";
import { Check, CheckCircle2, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { createAdminAction, type CreateAdminState } from "@/lib/services/admin-actions";
import { Field, btn, btnSecondary, control, t } from "@/components/admin/form";
import { adminRoleDetails } from "@/lib/auth/roles";

export function CreateAdminForm({ onDone, onBusyChange }: { onDone?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("RECRUITER");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [state, action, pending] = useActionState(async (previous: CreateAdminState, form: FormData) => {
    onBusyChange?.(true);
    try {
      const result = await createAdminAction(previous, form);
      if (result.ok) { setPassword(""); setConfirmation(""); }
      return result;
    } finally { onBusyChange?.(false); }
  }, {});
  const errors = state.errors ?? {};
  const checks = [
    ["12+ characters", password.length >= 12],
    ["Upper & lower case", /[A-Z]/.test(password) && /[a-z]/.test(password)],
    ["A number", /\d/.test(password)],
  ] as const;

  if (state.ok) return (
    <div className="py-6 text-center" role="status">
      <CheckCircle2 className="mx-auto size-10 text-[#1e7a4d]" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-medium text-ink-900">Account created</h3>
      <p className="mt-2 break-all text-sm text-graphite-600">{state.createdEmail}</p>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-graphite-600">Share the temporary password securely with your teammate. They can sign in and change it in Settings. No invitation email is sent.</p>
      {onDone && <button type="button" className={`${btn} mt-6`} onClick={onDone}>Done</button>}
    </div>
  );

  return (
    <form action={action} className="space-y-6" aria-busy={pending}>
      {state.message && <p role="alert" className="rounded border border-[#c0392b]/20 bg-[#c0392b]/5 p-3 text-sm text-[#8e2c20]">{state.message}</p>}
      <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Full name" required value={name} onChange={e => setName(e.target.value)} error={errors.name} autoComplete="off" placeholder="Alex Morgan" />
          <Field name="email" label="Work email" type="email" required value={email} onChange={e => setEmail(e.target.value)} error={errors.email} autoComplete="off" inputMode="email" placeholder="alex@sohumsystems.com" />
        </div>
        <fieldset>
          <legend className={`${t.label} font-medium text-ink-900`}>Access level</legend>
          <p className="mb-3 mt-1 text-xs text-graphite-500">Choose the access this teammate needs.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(adminRoleDetails).map(([value, detail]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition-colors focus-within:ring-2 focus-within:ring-ink-600 ${role === value ? "border-ink-800 bg-ink-900/[0.035]" : "border-paper-300 hover:bg-paper-50"}`}>
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="mt-0.5 size-4 shrink-0 accent-ink-900" />
                <span><span className="block text-sm font-medium text-ink-900">{detail.label}</span><span className="mt-1 block text-xs leading-5 text-graphite-600">{detail.description}</span></span>
              </label>
            ))}
          </div>
          {errors.role && <p role="alert" className="mt-2 text-xs text-[#c0392b]">{errors.role}</p>}
        </fieldset>
        <div className="border-t border-paper-200 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-900">Sign-in details</p>
            <button type="button" onClick={() => setVisible(!visible)} aria-pressed={visible} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-graphite-600 hover:bg-paper-100 focus-visible:outline-2">
              {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}{visible ? "Hide passwords" : "Show passwords"}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ name: "password", label: "Temporary password", value: password, set: setPassword }, { name: "confirmPassword", label: "Confirm password", value: confirmation, set: setConfirmation }].map(f => (
              <div key={f.name}>
                <label htmlFor={`create-${f.name}`} className="mb-1.5 block text-xs font-medium text-ink-800">{f.label} <span aria-hidden="true">*</span></label>
                <input id={`create-${f.name}`} name={f.name} type={visible ? "text" : "password"} value={f.value} onChange={e => f.set(e.target.value)} required autoComplete="new-password" className={control} aria-invalid={Boolean(errors[f.name])} aria-describedby={errors[f.name] ? `create-${f.name}-error` : "password-requirements"} />
                {errors[f.name] && <p id={`create-${f.name}-error`} className="mt-1 text-xs text-[#c0392b]">{errors[f.name]}</p>}
              </div>
            ))}
          </div>
          <ul id="password-requirements" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {checks.map(([label, met]) => <li key={label} className={`inline-flex items-center gap-1 ${met ? "text-[#1e7a4d]" : "text-graphite-500"}`}><Check className={`size-3 ${met ? "opacity-100" : "opacity-30"}`} aria-hidden="true" /><span className="sr-only">{met ? "Met: " : "Required: "}</span>{label}</li>)}
          </ul>
          <p className="mt-3 text-xs leading-5 text-graphite-500">Share this password securely after creating the account. An invitation email will not be sent.</p>
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 border-t border-paper-200 pt-4">
        {onDone && <button type="button" onClick={onDone} disabled={pending} className={btnSecondary}>Cancel</button>}
        <button type="submit" disabled={pending} className={btn}>{pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}{pending ? "Creating account…" : "Create admin"}</button>
      </div>
    </form>
  );
}
