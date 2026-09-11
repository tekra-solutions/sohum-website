"use client";

import { useActionState } from "react";
import { declineOfferAction, type OfferPublicState } from "@/app/offer/[token]/actions";
import { Select, btnSecondary, t } from "@/components/admin/form";

const initial: OfferPublicState = {};

const reasons = [
  { value: "", label: "Prefer not to say" },
  { value: "ACCEPTED_ANOTHER", label: "Accepted another opportunity" },
  { value: "COMPENSATION", label: "Compensation" },
  { value: "LOCATION", label: "Location" },
  { value: "TIMING", label: "Timing" },
  { value: "OTHER", label: "Other" },
];

export function DeclineForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(declineOfferAction, initial);

  if (state.success) {
    return (
      <div className="rounded-[4px] border border-paper-300 bg-white p-5">
        <p role="status" className={`${t.body} font-medium text-ink-900`}>{state.success}</p>
        <p className={`mt-2 ${t.body} text-graphite-600`}>Thank you for letting us know.</p>
      </div>
    );
  }

  return (
    <details className="rounded-[4px] border border-paper-300 bg-white p-5">
      <summary className={`cursor-pointer ${t.body} font-medium text-graphite-700`}>Decline this offer</summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Select name="reason" label="Reason (optional)" options={reasons} />
        <button type="submit" disabled={pending} className={btnSecondary}>
          {pending ? "Submitting…" : "Decline offer"}
        </button>
        {state.error && <p role="alert" className={`${t.body} text-[#8e2c20]`}>{state.error}</p>}
      </form>
    </details>
  );
}
