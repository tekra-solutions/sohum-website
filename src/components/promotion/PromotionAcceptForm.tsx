"use client";

import { useActionState, useState } from "react";
import {
  acceptPromotionAction, declinePromotionAction, type PromotionPublicState,
} from "@/app/promotion/[token]/actions";
import { Field, TextArea, btn, btnSecondary, t } from "@/components/admin/form";

const initial: PromotionPublicState = {};

/** The change restated at the point of signing, so the employee confirms
 *  against the actual terms rather than what they scrolled past. */
export type PromotionSummary = {
  jobTitle: string;
  effectiveDate: string;
  compensation: string | null;
  versionLabel: string;
};

export function PromotionAcceptForm({
  token, consentText, summary,
}: {
  token: string;
  consentText: string;
  summary: PromotionSummary;
}) {
  const [state, formAction, pending] = useActionState(acceptPromotionAction, initial);
  const [declineState, declineAction, declinePending] = useActionState(declinePromotionAction, initial);
  const [showDecline, setShowDecline] = useState(false);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4 rounded-[4px] border border-paper-300 bg-white p-6">
        <input type="hidden" name="token" value={token} />
        <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Sign your promotion letter</h2>

        <dl className="rounded-[3px] border border-paper-200 bg-paper-50 p-3">
          {[
            ["New position", summary.jobTitle],
            ["Effective", summary.effectiveDate],
            ...(summary.compensation ? [["Compensation", summary.compensation]] : []),
            ["Document", summary.versionLabel],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2 border-b border-paper-200 py-1.5 last:border-0">
              <dt className={`${t.hint} text-graphite-500`}>{k}</dt>
              <dd className={`${t.body} font-medium text-ink-900`}>{v}</dd>
            </div>
          ))}
        </dl>

        <Field
          name="legalName" label="Type your full legal name to sign" required
          hint="This becomes your electronic signature on the letter above."
        />

        <label className={`flex items-start gap-2.5 ${t.body} text-graphite-700`}>
          <input type="checkbox" name="consent" required className="mt-0.5 size-3.5 accent-ink-900" />
          <span>{consentText}</span>
        </label>

        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Signing…" : "Sign and accept"}
        </button>
        {state.error && <p role="alert" className={`${t.body} text-[#c0392b]`}>{state.error}</p>}
        {state.success && <p role="status" className={`${t.body} text-[#14603b]`}>{state.success}</p>}
      </form>

      <div className="rounded-[4px] border border-paper-300 bg-white p-6">
        {!showDecline ? (
          <button type="button" onClick={() => setShowDecline(true)} className={btnSecondary}>
            I do not accept these terms
          </button>
        ) : (
          <form action={declineAction} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <p className={`${t.body} text-graphite-700`}>
              Please let us know why, so we can follow up with you.
            </p>
            <TextArea name="reason" label="Reason (optional)" rows={3} />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={declinePending} className={btnSecondary}>
                {declinePending ? "Sending…" : "Decline promotion"}
              </button>
              <button type="button" onClick={() => setShowDecline(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
            {declineState.error && <p role="alert" className={`${t.body} text-[#c0392b]`}>{declineState.error}</p>}
            {declineState.success && <p role="status" className={`${t.body} text-[#14603b]`}>{declineState.success}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
