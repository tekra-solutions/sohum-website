"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { createOfferAction, updateOfferAction, type OfferActionState } from "@/lib/offers/actions";
import { Field, FormSection, Select, TextArea, btn, spanAll, t } from "@/components/admin/form";
import { employmentTypeLabel, remoteTypeLabel } from "@/lib/format";
import { employmentTypes, remoteTypes } from "@/lib/validation/schemas";

const initial: OfferActionState = {};

/** A date input needs YYYY-MM-DD, not an ISO timestamp. */
const dateValue = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/** Cents stored, dollars shown in the form. */
const dollars = (cents: number | null | undefined) =>
  cents == null ? "" : String(cents / 100);

export type OfferFormCandidate = {
  fullName: string;
  email: string;
  address?: string | null;
  phone?: string | null;
};

export type OfferFormVersion = {
  jobTitle?: string; department?: string; location?: string;
  employmentType?: string; remoteType?: string;
  hiringManagerName?: string | null; reportsTo?: string | null;
  startDate?: Date | string | null; expirationDate?: Date | string | null;
  annualSalaryCents?: number | null; hourlyRateCents?: number | null;
  bonusCents?: number | null; signOnBonusCents?: number | null;
  otherCompensation?: string | null; benefitsSummary?: string | null;
  ptoSummary?: string | null; workLocation?: string | null;
  additionalTerms?: string | null;
};

/** Company defaults from Settings, shown so the recruiter can see what the
 *  letter will say without having to retype it. */
export type OfferFormDefaults = {
  authorizedRepName?: string | null;
  benefitsConfigured: boolean;
  ptoConfigured: boolean;
  settingsHref: string;
  canEditSettings: boolean;
};

/** A read-only fact carried into the offer, shown as context not as an input. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={`${t.label} font-medium text-graphite-600`}>{label}</dt>
      <dd className={`mt-0.5 ${t.body} text-ink-900`}>{value}</dd>
    </div>
  );
}

export function OfferForm({
  applicationId, offerId, candidate, version, templates, defaults,
}: {
  applicationId: string;
  offerId?: string;
  candidate: OfferFormCandidate;
  version?: OfferFormVersion;
  templates: { id: string; name: string }[];
  defaults: OfferFormDefaults;
}) {
  const action = offerId ? updateOfferAction : createOfferAction;
  const [state, formAction, pending] = useActionState(action, initial);
  // Position and standard terms come from the job and from Settings. They stay
  // adjustable for the occasional exception, but are collapsed by default so
  // the common case is three inputs, not seventeen.
  const [showOverrides, setShowOverrides] = useState(false);

  const employmentLabel = employmentTypeLabel[version?.employmentType ?? ""] ?? version?.employmentType ?? "—";
  const remoteLabel = remoteTypeLabel[version?.remoteType ?? ""] ?? version?.remoteType ?? "—";
  const managerLine = version?.hiringManagerName || version?.reportsTo;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="applicationId" value={applicationId} />
      {offerId && <input type="hidden" name="offerId" value={offerId} />}

      {/* Position travels with the offer but is not retyped: these mirror the
          read-only facts above, and stay in sync with the override fields. */}
      {!showOverrides && (
        <>
          <input type="hidden" name="jobTitle" value={version?.jobTitle ?? ""} />
          <input type="hidden" name="department" value={version?.department ?? ""} />
          <input type="hidden" name="location" value={version?.location ?? ""} />
          <input type="hidden" name="employmentType" value={version?.employmentType ?? "FULL_TIME"} />
          <input type="hidden" name="remoteType" value={version?.remoteType ?? "ON_SITE"} />
          <input type="hidden" name="hiringManagerName" value={version?.hiringManagerName ?? ""} />
          <input type="hidden" name="reportsTo" value={version?.reportsTo ?? ""} />
          <input type="hidden" name="workLocation" value={version?.workLocation ?? ""} />
          <input type="hidden" name="benefitsSummary" value={version?.benefitsSummary ?? ""} />
          <input type="hidden" name="ptoSummary" value={version?.ptoSummary ?? ""} />
          <input type="hidden" name="otherCompensation" value={version?.otherCompensation ?? ""} />
          <input type="hidden" name="additionalTerms" value={version?.additionalTerms ?? ""} />
        </>
      )}

      <div aria-live="polite">
        {state.error && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p role="alert" className={`${t.body} text-[#8e2c20]`}>{state.error}</p>
          </div>
        )}
        {state.success && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.05] p-3">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p role="status" className={`${t.body} text-[#14603b]`}>{state.success}</p>
          </div>
        )}
      </div>

      {/* Everything the system already knows, shown for confirmation only. */}
      <section className="rounded-[4px] border border-paper-200 bg-paper-50 p-4">
        <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Offer details on file</h2>
        <p className={`mt-1 ${t.hint} text-graphite-600`}>
          Taken from the candidate&rsquo;s application, the job posting and your company settings.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Fact label="Candidate" value={candidate.fullName} />
          <Fact label="Email" value={candidate.email} />
          {candidate.address && <Fact label="Address" value={candidate.address} />}
          <Fact label="Position" value={version?.jobTitle ?? "—"} />
          <Fact label="Department" value={version?.department ?? "—"} />
          <Fact label="Location" value={version?.location ?? "—"} />
          <Fact label="Employment type" value={employmentLabel} />
          <Fact label="Work arrangement" value={remoteLabel} />
          {managerLine && <Fact label="Reporting to" value={managerLine} />}
          {defaults.authorizedRepName && <Fact label="Signed on behalf of company by" value={defaults.authorizedRepName} />}
        </dl>
      </section>

      {/* The setup prompt appears only when something reusable is missing, so
          it is actionable rather than decorative. */}
      {(!defaults.authorizedRepName || !defaults.benefitsConfigured || !defaults.ptoConfigured) && (
        <div className="rounded-[4px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.08] p-4">
          <p className={`${t.body} font-medium text-[#7a5c00]`}>Finish your one-time offer setup</p>
          <ul className={`mt-1.5 list-disc space-y-0.5 pl-5 ${t.hint} text-[#7a5c00]`}>
            {!defaults.authorizedRepName && <li>No authorized representative is configured, so offers will have no company signatory.</li>}
            {!defaults.benefitsConfigured && <li>No standard benefits summary is configured.</li>}
            {!defaults.ptoConfigured && <li>No standard PTO summary is configured.</li>}
          </ul>
          <p className={`mt-2 ${t.hint} text-[#7a5c00]`}>
            {defaults.canEditSettings ? (
              <>Set these once in <Link href={defaults.settingsHref} className="font-medium underline underline-offset-2">Offer settings</Link> and every future offer uses them automatically.</>
            ) : (
              <>Ask an administrator to configure these in Settings. You can still enter them for this offer below.</>
            )}
          </p>
        </div>
      )}

      <FormSection title="Compensation" description="The only figures this offer needs.">
        <Field
          name="annualSalaryCents" label="Annual salary" type="number" inputMode="numeric"
          defaultValue={dollars(version?.annualSalaryCents)} placeholder="145000"
          hint="Dollars, no commas. Leave blank if paying hourly."
        />
        <Field
          name="hourlyRateCents" label="Hourly rate" type="number" inputMode="numeric"
          defaultValue={dollars(version?.hourlyRateCents)} placeholder="65"
          hint="Use instead of an annual salary."
        />
        <Field name="signOnBonusCents" label="Sign-on bonus" type="number" inputMode="numeric" defaultValue={dollars(version?.signOnBonusCents)} hint="Optional." />
        <Field name="bonusCents" label="Performance bonus" type="number" inputMode="numeric" defaultValue={dollars(version?.bonusCents)} hint="Optional." />
      </FormSection>

      <FormSection title="Dates">
        <Field name="startDate" label="Start date" type="date" required defaultValue={dateValue(version?.startDate)} />
        <Field
          name="expirationDate" label="Offer expires" type="date" required
          defaultValue={dateValue(version?.expirationDate)}
          hint="Must be on or before the start date."
        />
      </FormSection>

      {/* Exceptions live behind a disclosure: present when needed, invisible
          when not, which is the normal case. */}
      <div className="border-t border-paper-200 pt-5">
        <button
          type="button"
          onClick={() => setShowOverrides(v => !v)}
          aria-expanded={showOverrides}
          className={`inline-flex items-center gap-2 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          {showOverrides ? "Hide" : "Adjust"} position, terms and template for this offer
        </button>

        {showOverrides && (
          <div className="mt-5 space-y-6">
            <FormSection title="Position">
              <Field name="jobTitle" label="Job title" required defaultValue={version?.jobTitle} />
              <Field name="department" label="Department" required defaultValue={version?.department} />
              <Field name="location" label="Location" required defaultValue={version?.location} />
              <Select
                name="employmentType" label="Employment type" required
                defaultValue={version?.employmentType ?? "FULL_TIME"}
                options={employmentTypes.map(v => ({ value: v, label: employmentTypeLabel[v] ?? v }))}
              />
              <Select
                name="remoteType" label="Work arrangement" required
                defaultValue={version?.remoteType ?? "ON_SITE"}
                options={remoteTypes.map(v => ({ value: v, label: remoteTypeLabel[v] ?? v }))}
              />
              <Field name="hiringManagerName" label="Hiring manager" defaultValue={version?.hiringManagerName} />
              <Field name="reportsTo" label="Reports to" defaultValue={version?.reportsTo} hint={'Name and title, e.g. "Alex Rivera, VP Engineering."'} />
              <Field name="workLocation" label="Work location" defaultValue={version?.workLocation} className={spanAll} />
            </FormSection>

            <FormSection title="Terms" columns={1}>
              <TextArea
                name="benefitsSummary" label="Benefits summary" defaultValue={version?.benefitsSummary} className={spanAll}
                hint={defaults.benefitsConfigured ? "Leave blank to use your configured company default." : "No company default is configured yet."}
              />
              <TextArea
                name="ptoSummary" label="PTO summary" defaultValue={version?.ptoSummary} className={spanAll}
                hint={defaults.ptoConfigured ? "Leave blank to use your configured company default." : "No company default is configured yet."}
              />
              <TextArea name="otherCompensation" label="Other compensation" className={spanAll} defaultValue={version?.otherCompensation} hint="Optional. Appears in the compensation section." />
              <TextArea name="additionalTerms" label="Additional approved terms" defaultValue={version?.additionalTerms} className={spanAll} hint="Anything beyond the template's standard language, subject to legal review." />
            </FormSection>

            {templates.length > 0 && (
              <FormSection title="Letter template" columns={1}>
                <Select
                  name="templateId" label="Template" className={spanAll}
                  defaultValue={templates[0]?.id ?? ""}
                  options={[...templates.map(tpl => ({ value: tpl.id, label: tpl.name })), { value: "", label: "— None (plain terms only) —" }]}
                />
              </FormSection>
            )}
          </div>
        )}
      </div>

      {/* Without the disclosure open the template still has to be chosen, so
          the default travels as a hidden input. */}
      {!showOverrides && templates.length > 0 && (
        <input type="hidden" name="templateId" value={templates[0]?.id ?? ""} />
      )}

      <div className="border-t border-paper-200 pt-5">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
          {offerId ? "Save changes" : "Create offer & preview"}
        </button>
        <p className={`mt-2 ${t.hint} text-graphite-600`}>
          You&rsquo;ll review the complete letter before it goes anywhere.
        </p>
      </div>
    </form>
  );
}
