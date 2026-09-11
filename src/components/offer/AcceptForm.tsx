"use client";

import { useActionState, useState } from "react";
import { acceptOfferAction, type OfferPublicState } from "@/app/offer/[token]/actions";
import { Field, btn, t } from "@/components/admin/form";

const initial: OfferPublicState = {};

/** Terms restated at the point of signing so the candidate confirms against
 *  the actual offer rather than remembering what they scrolled past. */
export type AcceptSummary = {
  jobTitle: string;
  startDate: string;
  compensation: string | null;
  versionLabel: string;
};

export function AcceptForm({
  token,
  consentText,
  summary,
}: {
  token: string;
  consentText: string;
  summary: AcceptSummary;
}) {
  const [state, action, pending] = useActionState(acceptOfferAction, initial);
  const [confirmed, setConfirmed] = useState(false);
  const [esign, setEsign] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [signature, setSignature] = useState("");
  const [reviewing, setReviewing] = useState(false);

  if (state.success) {
    return (
      <div className="rounded-[4px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-5">
        <p className={`${t.body} font-medium text-[#14603b]`}>{state.success}</p>
        <p className={`mt-2 ${t.body} text-graphite-600`}>
          We look forward to having you on the team. Our recruiting team will follow up with next steps.
        </p>
        <a
          href={`/offer/${token}/pdf?signed=1`}
          className="mt-4 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-ink-900 underline underline-offset-4"
        >
          Download your signed offer letter (PDF)
        </a>
      </div>
    );
  }

  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const nameGiven = legalName.trim().length > 0;
  const signatureMatches = nameGiven && normalize(signature) === normalize(legalName);
  const ready = confirmed && esign && signatureMatches;

  return (
    <form action={action} className="space-y-4 rounded-[4px] border border-paper-300 bg-white p-5">
      <input type="hidden" name="token" value={token} />
      <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Accept this offer</h2>

      {/* Step 1 — what is being agreed to, restated. */}
      <dl className="rounded-[4px] border border-paper-200 bg-paper-50 p-4 text-[0.8125rem]">
        {[
          ["Position", summary.jobTitle],
          ["Start date", summary.startDate],
          summary.compensation ? ["Compensation", summary.compensation] : null,
          ["Document", summary.versionLabel],
        ]
          .filter((r): r is [string, string] => r !== null)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-paper-200 py-1.5 last:border-0">
              <dt className="text-graphite-500">{k}</dt>
              <dd className="font-medium text-ink-900">{v}</dd>
            </div>
          ))}
      </dl>

      <Field
        name="legalName"
        label="Full legal name"
        required
        placeholder="Full legal name"
        value={legalName}
        onChange={e => setLegalName(e.currentTarget.value)}
      />

      {/* Step 2 — consent to sign electronically, separate from accepting the
          terms, because the signature's validity rests on it. */}
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={esign}
          onChange={e => setEsign(e.target.checked)}
          className="mt-0.5"
          aria-describedby="esign-consent-text"
        />
        <span id="esign-consent-text" className={`${t.body} text-ink-800`}>
          {consentText}
        </span>
      </label>
      <input type="hidden" name="esignConsent" value={esign ? "1" : "0"} />

      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span className={`${t.body} text-ink-800`}>
          I have read and accept the terms of this offer of employment.
        </span>
      </label>
      <input type="hidden" name="confirmed" value={confirmed ? "1" : "0"} />

      {/* Step 3 — the signature itself, adopted by typing the legal name. */}
      <div>
        <Field
          name="signature"
          label="Type your full legal name to sign"
          required
          placeholder="Your signature"
          disabled={!esign}
          value={signature}
          onChange={e => setSignature(e.currentTarget.value)}
        />
        {signature.trim().length > 0 && (
          <p
            aria-live="polite"
            className={`mt-2 ${signatureMatches ? "text-graphite-600" : "text-[#8e2c20]"} text-[0.8125rem]`}
          >
            {signatureMatches ? (
              <>
                Your signature will appear as{" "}
                <span className="font-[cursive] text-[1.15rem] text-ink-900">{signature.trim()}</span>
              </>
            ) : (
              "Your typed signature must match your full legal name."
            )}
          </p>
        )}
      </div>

      {/* Final confirmation, so signing is never a single unconsidered click. */}
      {reviewing ? (
        <div className="space-y-3 rounded-[4px] border border-ink-900/20 bg-paper-50 p-4">
          <p className={`${t.body} font-medium text-ink-900`}>
            Sign and accept this offer?
          </p>
          <p className={`${t.body} text-graphite-600`}>
            This records your acceptance of {summary.jobTitle} starting {summary.startDate} and
            creates your signed offer letter. This cannot be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || !ready} className={btn}>
              {pending ? "Signing…" : "Sign and accept"}
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="text-[0.8125rem] font-medium text-graphite-600 underline underline-offset-4"
            >
              Go back
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!ready}
          onClick={() => setReviewing(true)}
          className={btn}
        >
          Review and sign
        </button>
      )}

      {state.error && (
        <p role="alert" className={`${t.body} text-[#8e2c20]`}>
          {state.error}
        </p>
      )}
    </form>
  );
}
