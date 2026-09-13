"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { createOfferAction, updateOfferAction, type OfferActionState } from "@/lib/offers/actions";
import { Field, FormSection, Select, TextArea, btn, control, spanAll, t } from "@/components/admin/form";
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

/** A selectable offer letter template. */
export type OfferFormTemplate = {
  id: string;
  name: string;
  category?: string | null;
  /** First line of the template body, as a plain-text preview. */
  preview?: string | null;
  /** The template's pages rendered against this candidate's real data. */
  rendered?: {
    bodyHtml: string | null;
    termsHtml: string | null;
    acknowledgementsHtml: string | null;
  } | null;
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

/**
 * Shows the selected template's wording, resolved against the candidate.
 *
 * Collapsed to the opening paragraphs by default — a recruiter mostly needs to
 * confirm they picked the right letter, not re-read three pages — and
 * expandable to the full text including the employment terms and
 * acknowledgements pages.
 */
function TemplatePreview({ template }: { template: OfferFormTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const r = template.rendered;
  const pages = [
    { label: "Letter", html: r?.bodyHtml },
    { label: "Employment terms", html: r?.termsHtml },
    { label: "Acknowledgements", html: r?.acknowledgementsHtml },
  ].filter((p): p is { label: string; html: string } => Boolean(p.html));

  if (!pages.length) {
    return (
      <p className={`mt-2 ${t.hint} text-graphite-600`}>
        Using <span className="font-medium text-ink-900">{template.name}</span>. Its wording could not
        be previewed here, but the full letter is shown for review before the offer is sent.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-[3px] border border-paper-300 bg-paper-50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-200 bg-white px-3.5 py-2">
        <p className={`${t.label} font-medium text-graphite-700`}>
          Preview · {template.name}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className={`${t.hint} font-medium text-ink-900 underline underline-offset-2`}
        >
          {expanded ? "Show less" : `Show full letter (${pages.length} section${pages.length === 1 ? "" : "s"})`}
        </button>
      </div>
      {/* Collapsed, the preview fades out rather than slicing a line of text
          in half, so the cut reads as "there is more" instead of as broken
          rendering. */}
      <div
        className={`px-3.5 py-3 ${expanded ? "max-h-[26rem] overflow-y-auto" : "max-h-36 overflow-hidden"}`}
        style={expanded ? undefined : {
          maskImage: "linear-gradient(to bottom, #000 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent 100%)",
        }}
      >
        {(expanded ? pages : pages.slice(0, 1)).map(page => (
          <div key={page.label} className="mb-3 last:mb-0">
            {expanded && pages.length > 1 && (
              <p className={`mb-1 ${t.micro} font-semibold uppercase tracking-[0.08em] text-graphite-500`}>
                {page.label}
              </p>
            )}
            {/* Server-rendered from the offer template and sanitised by
                renderOfferTemplate() on the way out, exactly as the issued
                document is. */}
            <div
              className="offer-preview text-[0.8125rem] leading-[1.6] text-graphite-700"
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
          </div>
        ))}
      </div>
      {!expanded && (
        <div className={`border-t border-paper-200 bg-white px-3.5 py-1.5 ${t.micro} text-graphite-500`}>
          Compensation and dates you enter below are merged in where the letter shows &ldquo;—&rdquo;.
        </div>
      )}
    </div>
  );
}

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
  applicationId, offerId, candidate, version, templates, defaults, selectedTemplateId,
}: {
  applicationId: string;
  offerId?: string;
  /** The template this offer already uses, when editing. */
  selectedTemplateId?: string | null;
  candidate: OfferFormCandidate;
  version?: OfferFormVersion;
  templates: OfferFormTemplate[];
  defaults: OfferFormDefaults;
}) {
  const action = offerId ? updateOfferAction : createOfferAction;
  const [state, formAction, pending] = useActionState(action, initial);

  /* The chosen template is state, not a defaultValue on a conditionally
     rendered <select>.
     Before, the selector lived inside the "Adjust" panel and a hidden input
     carrying templates[0] took its place whenever that panel was closed. So
     choosing a template and then collapsing the panel silently submitted a
     different template than the one on screen — the offer came out with the
     wrong letter and nothing said so. */
  const [templateId, setTemplateId] = useState(
    () => selectedTemplateId ?? templates[0]?.id ?? "",
  );
  const chosen = templates.find(tpl => tpl.id === templateId);
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

      {/* The letter template decides what the candidate actually reads, so it
          belongs in the main flow — not behind a disclosure where a recruiter
          cannot tell which template an offer will use. */}
      <FormSection title="Letter template" columns={1}
        description={templates.length ? "The wording of the letter. Position and compensation below are merged into it." : undefined}>
        {templates.length === 0 ? (
          <div className={`${spanAll} rounded-[3px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.08] p-3`}>
            <p className={`${t.body} font-medium text-[#7a5c00]`}>No offer letter templates exist yet.</p>
            <p className={`mt-1 ${t.hint} text-[#7a5c00]`}>
              This offer will contain the position and compensation terms only.{" "}
              {defaults.canEditSettings ? (
                <Link href="/admin/settings/offer-templates" className="font-medium underline underline-offset-2">
                  Add a template
                </Link>
              ) : "Ask an administrator to add one"}
              {" "}to control the wording of the letter.
            </p>
          </div>
        ) : (
          <div className={spanAll}>
            <label htmlFor="f-templateId" className={`block ${t.label} font-medium text-ink-800`}>
              Template
            </label>
            <select
              id="f-templateId"
              name="templateId"
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className={`${control} mt-1.5 border-paper-300`}
            >
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}{tpl.category && tpl.category !== "CUSTOM" ? ` · ${tpl.category.replaceAll("_", " ").toLowerCase()}` : ""}
                </option>
              ))}
              <option value="">— None (position and compensation only) —</option>
            </select>
            {/* The letter this template will actually produce, filled in with
                this candidate's details. Selecting a template used to show only
                a one-line quote of the raw template with {{variables}} still
                unresolved, so there was no way to see what the letter said
                without creating the offer first. */}
            {chosen ? (
              <TemplatePreview template={chosen} />
            ) : (
              <p className={`mt-2 ${t.hint} text-graphite-600`}>
                No template — the letter will state the position and compensation only.
              </p>
            )}
          </div>
        )}
      </FormSection>

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
          {showOverrides ? "Hide" : "Adjust"} position and terms for this offer
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

          </div>
        )}
      </div>

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
