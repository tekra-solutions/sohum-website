"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
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

export function OfferForm({
  applicationId, offerId, candidate, version, templates,
}: {
  applicationId: string;
  offerId?: string;
  candidate: OfferFormCandidate;
  version?: OfferFormVersion;
  templates: { id: string; name: string }[];
}) {
  const action = offerId ? updateOfferAction : createOfferAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="applicationId" value={applicationId} />
      {offerId && <input type="hidden" name="offerId" value={offerId} />}

      <div aria-live="polite">
        {state.error && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className={`${t.body} text-[#8e2c20]`}>{state.error}</p>
          </div>
        )}
        {state.success && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.05] p-3">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p className={`${t.body} text-[#14603b]`}>{state.success}</p>
          </div>
        )}
      </div>

      <FormSection title="Candidate" description="From the application on file.">
        <div>
          <label className={`block ${t.label} font-medium text-ink-800`}>Name</label>
          <p className={`mt-1.5 ${t.body} text-ink-900`}>{candidate.fullName}</p>
        </div>
        <div>
          <label className={`block ${t.label} font-medium text-ink-800`}>Email</label>
          <p className={`mt-1.5 ${t.body} text-ink-900`}>{candidate.email}</p>
        </div>
        {candidate.address && (
          <div className={spanAll}>
            <label className={`block ${t.label} font-medium text-ink-800`}>Address</label>
            <p className={`mt-1.5 ${t.body} text-ink-900`}>{candidate.address}</p>
          </div>
        )}
        {candidate.phone && (
          <div>
            <label className={`block ${t.label} font-medium text-ink-800`}>Phone</label>
            <p className={`mt-1.5 ${t.body} text-ink-900`}>{candidate.phone}</p>
          </div>
        )}
      </FormSection>

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
      </FormSection>

      <FormSection title="Dates">
        <Field name="startDate" label="Start date" type="date" required defaultValue={dateValue(version?.startDate)} />
        <Field
          name="expirationDate" label="Offer expiration date" type="date" required
          defaultValue={dateValue(version?.expirationDate)}
          hint="Must be on or before the start date."
        />
      </FormSection>

      <FormSection title="Compensation">
        <Field name="annualSalaryCents" label="Annual salary" type="number" inputMode="numeric" defaultValue={dollars(version?.annualSalaryCents)} placeholder="145000" hint="Dollars, no commas." />
        <Field name="hourlyRateCents" label="Hourly rate" type="number" inputMode="numeric" defaultValue={dollars(version?.hourlyRateCents)} placeholder="65" />
        <Field name="bonusCents" label="Bonus" type="number" inputMode="numeric" defaultValue={dollars(version?.bonusCents)} />
        <Field name="signOnBonusCents" label="Sign-on bonus" type="number" inputMode="numeric" defaultValue={dollars(version?.signOnBonusCents)} />
        <TextArea name="otherCompensation" label="Other compensation" className={spanAll} defaultValue={version?.otherCompensation} />
      </FormSection>

      <FormSection title="Terms" columns={1}>
        <TextArea name="benefitsSummary" label="Benefits summary" defaultValue={version?.benefitsSummary} className={spanAll} />
        <TextArea name="ptoSummary" label="PTO summary" defaultValue={version?.ptoSummary} className={spanAll} />
        <Field name="workLocation" label="Work location" defaultValue={version?.workLocation} className={spanAll} />
        <TextArea name="additionalTerms" label="Additional approved terms" defaultValue={version?.additionalTerms} className={spanAll} hint="Anything beyond the template's standard language, subject to legal review." />
      </FormSection>

      {templates.length > 0 && (
        <FormSection title="Letter template" columns={1}>
          <Select
            name="templateId" label="Template" className={spanAll}
            defaultValue=""
            options={[{ value: "", label: "— None (plain terms only) —" }, ...templates.map(tpl => ({ value: tpl.id, label: tpl.name }))]}
          />
        </FormSection>
      )}

      <div className="border-t border-paper-200 pt-5">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
          {offerId ? "Save changes" : "Create offer"}
        </button>
      </div>
    </form>
  );
}
