import "server-only";
import { renderOfferTemplate } from "./variables";
import { employmentTypeLabel, remoteTypeLabel, formatCurrency } from "@/lib/format";
import { site, contact } from "@/lib/site";

/**
 * A filled-in preview of what a template will actually say.
 *
 * The create-offer form used to show only a one-line quote of the raw template
 * ("BETA body for candidate first name"), so choosing a template told a
 * recruiter almost nothing: the variables were still variable names, and pages
 * 2 and 3 were not shown at all. The only way to see the letter was to create
 * the offer and then open it.
 *
 * This resolves each template against the candidate, job and company settings
 * already on the page, using the same renderOfferTemplate() the real offer
 * uses — so the preview cannot say something different from the document.
 *
 * Compensation and dates are not known until the recruiter types them, so
 * those variables resolve to a readable placeholder rather than being blanked:
 * a sentence reading "a starting salary of —" shows where the figure will go.
 */
export type TemplatePreviewValues = {
  candidateFirstName: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: string;
  remoteType: string;
  workLocation?: string | null;
  hiringManagerName?: string | null;
  reportsTo?: string | null;
  benefitsSummary?: string | null;
  ptoSummary?: string | null;
  hrContactEmail?: string | null;
  authorizedRepName?: string | null;
  authorizedRepTitle?: string | null;
  /** Entered by the recruiter; absent while the form is still blank. */
  annualSalaryCents?: number | null;
  startDate?: string | null;
  expirationDate?: string | null;
};

/** Stands in for a value the recruiter has not entered yet. */
const PENDING = "—";

const day = (iso?: string | null) => {
  if (!iso) return PENDING;
  const d = new Date(`${iso}T00:00:00Z`);
  return isNaN(d.getTime()) ? PENDING : d.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
};

export function templateVariablesFor(v: TemplatePreviewValues): Record<string, string> {
  return {
    candidate_name: v.candidateName,
    candidate_first_name: v.candidateFirstName,
    candidate_email: v.candidateEmail,
    candidate_address: v.candidateAddress,
    job_title: v.jobTitle,
    department: v.department,
    location: v.location,
    employment_type: (employmentTypeLabel[v.employmentType] ?? v.employmentType).toLowerCase(),
    work_arrangement: (remoteTypeLabel[v.remoteType] ?? v.remoteType).toLowerCase(),
    work_location: v.workLocation ?? "",
    start_date: day(v.startDate),
    salary: v.annualSalaryCents != null ? formatCurrency(v.annualSalaryCents) : PENDING,
    hourly_rate: "",
    pay_frequency: "semi-monthly",
    bonus: "",
    sign_on_bonus: "",
    other_compensation: "",
    benefits_summary: v.benefitsSummary ?? "",
    pto_summary: v.ptoSummary ?? "",
    additional_terms: "",
    manager_name: v.hiringManagerName ?? v.reportsTo ?? "",
    reports_to: v.reportsTo ?? v.hiringManagerName ?? "",
    company_name: site.name,
    company_legal_name: site.legalName,
    company_address: contact.address,
    hr_contact_email: v.hrContactEmail ?? contact.emailHr,
    authorized_rep_name: v.authorizedRepName ?? "",
    authorized_rep_title: v.authorizedRepTitle ?? "",
    offer_date: day(new Date().toISOString().slice(0, 10)),
    offer_expiration_date: day(v.expirationDate),
    offer_reference: PENDING,
  };
}

/**
 * Renders one template's three pages against the values above.
 *
 * A template that fails to render (an unknown variable that predates
 * validation, say) returns null for that page rather than throwing: a broken
 * preview must not take the whole create-offer screen down.
 */
export function renderTemplatePreview(
  template: { bodyHtml: string; termsHtml?: string | null; acknowledgementsHtml?: string | null },
  values: TemplatePreviewValues,
) {
  const variables = templateVariablesFor(values);
  const safe = (html?: string | null) => {
    if (!html?.trim()) return null;
    try {
      return renderOfferTemplate(html, variables);
    } catch {
      return null;
    }
  };
  return {
    bodyHtml: safe(template.bodyHtml),
    termsHtml: safe(template.termsHtml),
    acknowledgementsHtml: safe(template.acknowledgementsHtml),
  };
}
