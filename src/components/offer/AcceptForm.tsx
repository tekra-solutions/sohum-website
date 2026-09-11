"use client";

import { useActionState, useState } from "react";
import { acceptOfferAction, type OfferPublicState } from "@/app/offer/[token]/actions";
import { Field, btn, t } from "@/components/admin/form";

const initial: OfferPublicState = {};

export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptOfferAction, initial);
  const [confirmed, setConfirmed] = useState(false);

  if (state.success) {
    return (
      <div className="rounded-[4px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-5">
        <p className={`${t.body} font-medium text-[#14603b]`}>{state.success}</p>
        <p className={`mt-2 ${t.body} text-graphite-600`}>
          We look forward to having you on the team. Our recruiting team will follow up with next steps.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-[4px] border border-paper-300 bg-white p-5">
      <input type="hidden" name="token" value={token} />
      <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Accept this offer</h2>
      <p className={`${t.body} text-ink-800`}>&ldquo;I accept this offer of employment.&rdquo;</p>
      <Field name="legalName" label="Legal name" required placeholder="Full legal name" />
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox" required
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span className={`${t.body} text-ink-800`}>
          I understand and accept the terms of this offer. Typing my name above and submitting this
          form serves as my electronic signature.
        </span>
      </label>
      <input type="hidden" name="confirmed" value={confirmed ? "1" : "0"} />
      <button type="submit" disabled={pending || !confirmed} className={btn}>
        {pending ? "Submitting…" : "Accept offer"}
      </button>
      {state.error && <p className={`${t.body} text-[#8e2c20]`}>{state.error}</p>}
    </form>
  );
}
