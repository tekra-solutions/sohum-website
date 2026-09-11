"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { btn, btnDanger, btnSecondary, t } from "./form";

/**
 * A submit button that requires a second, deliberate click for high-impact
 * actions — sending an offer to a real person, withdrawing one and killing
 * their link, archiving a job, deleting a record.
 *
 * Deliberately not window.confirm: that is unstyled, unlabelled, blocks the
 * main thread, and reads as a browser warning rather than part of the
 * product. This keeps the explanation of the consequence next to the action
 * and stays inside the form, so it works with the existing server-action
 * submit flow and with `useFormStatus` pending state.
 */
export function ConfirmSubmit({
  label,
  confirmLabel,
  message,
  tone = "default",
}: {
  label: string;
  /** Button text once armed. Defaults to "Yes, <label>". */
  confirmLabel?: string;
  /** What will happen — shown only once armed, so it is read at decision time. */
  message: string;
  tone?: "default" | "danger";
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={tone === "danger" ? btnDanger : btnSecondary}>
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-[3px] border border-paper-300 bg-paper-50 p-3">
      <p className={`${t.body} text-ink-900`}>{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={tone === "danger" ? btnDanger : btn}>
          {pending ? "Working…" : confirmLabel ?? `Yes, ${label.toLowerCase()}`}
        </button>
        <button type="button" onClick={() => setArmed(false)} disabled={pending} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}
