"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { changePasswordAction, type SettingsState } from "@/lib/services/settings-actions";

const initial: SettingsState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const e = state.errors ?? {};

  const control =
    "mt-2 w-full rounded-[3px] border bg-white px-3.5 py-2.5 text-[0.9375rem] " +
    "focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30";

  const fields = [
    { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
    { name: "newPassword", label: "New password", autoComplete: "new-password", hint: "At least 12 characters, with upper and lower case and a number." },
    { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
  ];

  return (
    <form action={action} className="max-w-sm space-y-4">
      <div aria-live="polite">
        {state.ok && (
          <div className="flex gap-3 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-3.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#14603b]">Password updated.</p>
          </div>
        )}
        {state.error && (
          <div className="flex gap-3 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3.5">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#8e2c20]">{state.error}</p>
          </div>
        )}
      </div>

      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block text-[0.875rem] font-medium text-ink-800">{f.label}</label>
          <input
            id={f.name}
            name={f.name}
            type="password"
            required
            autoComplete={f.autoComplete}
            aria-invalid={e[f.name] ? true : undefined}
            aria-describedby={e[f.name] ? `${f.name}-error` : f.hint ? `${f.name}-hint` : undefined}
            className={`${control} ${e[f.name] ? "border-[#c0392b]" : "border-paper-300"}`}
          />
          {f.hint && !e[f.name] && (
            <p id={`${f.name}-hint`} className="mt-1.5 text-[0.8125rem] text-graphite-500">{f.hint}</p>
          )}
          {e[f.name] && (
            <p id={`${f.name}-error`} className="mt-1.5 text-[0.8125rem] text-[#c0392b]">{e[f.name]}</p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[3px] bg-ink-900 px-5 py-2.5 text-[0.875rem] font-medium text-white hover:bg-ink-700 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Change password
      </button>
    </form>
  );
}
