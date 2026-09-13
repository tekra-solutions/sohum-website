import "server-only";
import { renderOfferTemplate, offerTemplateVariables } from "@/lib/offers/variables";
import { employmentTypeLabel, remoteTypeLabel, formatCurrency } from "@/lib/format";
import { site, contact } from "@/lib/site";

/**
 * Promotion letters reuse the offer template system — the same
 * offer_templates table, the same {{variable}} syntax, the same validation and
 * the same admin editor. A promotion template is simply one whose category is
 * PROMOTION-shaped by convention; nothing new had to be built for it.
 *
 * The variable names are the offer set, so an admin who knows one knows the
 * other: {{job_title}} is the NEW title, {{salary}} the NEW salary. The
 * previous values are rendered by the letter's change table from frozen
 * columns, not by prose, so there are no "previous_*" variables to get wrong.
 */

/** Values a promotion resolves its template against. */
export type PromotionTemplateValues = {
  employeeName: string;
  employeeFirstName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  location?: string | null;
  employmentType: string;
  remoteType?: string | null;
  managerName?: string | null;
  effectiveDate: Date;
  expirationDate: Date;
  annualSalaryCents?: number | null;
  hourlyRateCents?: number | null;
  bonusCents?: number | null;
  otherCompensation?: string | null;
  benefitsSummary?: string | null;
  ptoSummary?: string | null;
  additionalTerms?: string | null;
  hrContactEmail?: string | null;
  authorizedRepName?: string | null;
  authorizedRepTitle?: string | null;
  reference?: string | null;
};

const money = (cents?: number | null) => (cents == null ? "" : formatCurrency(cents));
const day = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });

export function promotionVariables(v: PromotionTemplateValues): Record<string, string> {
  return {
    candidate_name: v.employeeName,
    candidate_first_name: v.employeeFirstName,
    candidate_email: v.employeeEmail,
    candidate_address: "",
    job_title: v.jobTitle,
    department: v.department,
    location: v.location ?? "",
    employment_type: (employmentTypeLabel[v.employmentType] ?? v.employmentType).toLowerCase(),
    work_arrangement: v.remoteType ? (remoteTypeLabel[v.remoteType] ?? v.remoteType).toLowerCase() : "",
    work_location: v.location ?? "",
    start_date: day(v.effectiveDate),
    salary: money(v.annualSalaryCents),
    hourly_rate: money(v.hourlyRateCents),
    pay_frequency: v.hourlyRateCents != null ? "bi-weekly" : "semi-monthly",
    bonus: money(v.bonusCents),
    sign_on_bonus: "",
    other_compensation: v.otherCompensation ?? "",
    benefits_summary: v.benefitsSummary ?? "",
    pto_summary: v.ptoSummary ?? "",
    additional_terms: v.additionalTerms ?? "",
    manager_name: v.managerName ?? "",
    reports_to: v.managerName ?? "",
    company_name: site.name,
    company_legal_name: site.legalName,
    company_address: contact.address,
    hr_contact_email: v.hrContactEmail ?? contact.emailHr,
    authorized_rep_name: v.authorizedRepName ?? "",
    authorized_rep_title: v.authorizedRepTitle ?? "",
    offer_date: day(new Date()),
    offer_expiration_date: day(v.expirationDate),
    offer_reference: v.reference ?? "",
  };
}

/** Renders one template page, or null when it is empty or cannot resolve. */
export function renderPromotionSection(html: string | null | undefined, values: PromotionTemplateValues) {
  if (!html?.trim()) return null;
  try {
    return renderOfferTemplate(html, promotionVariables(values));
  } catch {
    return null;
  }
}

export { offerTemplateVariables as promotionTemplateVariables };

/**
 * The built-in promotion letter, used when no template is chosen.
 *
 * Written so that a promotion needs no prose from HR at all: the congratulatory
 * opening, the statement of the change, and the acknowledgement come from here,
 * while the specifics come from the change table the renderer builds. Sample
 * content pending legal review, exactly like the offer templates.
 */
export const DEFAULT_PROMOTION_TEMPLATE = {
  name: "Sohum Systems Promotion Letter",
  subject: "Promotion to {{job_title}} — {{company_name}}",

  bodyHtml: `<p>Congratulations. In recognition of your contribution to {{company_name}} and the quality of your work, we are pleased to confirm your promotion to the position of <strong>{{job_title}}</strong>, effective <strong>{{start_date}}</strong>.</p>
<p>The changes to your employment are set out below. Everything not listed remains as it is today.</p>`,

  termsHtml: `{{#if manager_name}}<p>In this role you will report to {{manager_name}}. You will perform the duties and responsibilities customarily associated with the position, together with such other responsibilities as may reasonably be assigned.</p>{{/if}}
{{#if salary}}<p>Your revised annual base salary of <strong>{{salary}}</strong> will be paid {{pay_frequency}}, subject to applicable withholdings and deductions, and takes effect on {{start_date}}.</p>{{/if}}
{{#if hourly_rate}}<p>Your revised hourly rate of <strong>{{hourly_rate}}</strong> takes effect on {{start_date}} and applies to hours worked from that date, subject to applicable withholdings and deductions.</p>{{/if}}
{{#if bonus}}<p>You will be eligible for a performance bonus of up to <strong>{{bonus}}</strong>, awarded at the Company's discretion based on individual and company performance.</p>{{/if}}
{{#if other_compensation}}<p>{{other_compensation}}</p>{{/if}}
{{#if benefits_summary}}<p>{{benefits_summary}}</p>{{/if}}
{{#if pto_summary}}<p>{{pto_summary}}</p>{{/if}}
{{#if additional_terms}}<p>{{additional_terms}}</p>{{/if}}`,

  acknowledgementsHtml: `<p>By signing below you acknowledge that you have read and understood this letter and accept the revised terms of your employment described in it.</p>
<p>Your employment remains at will, and this letter does not create a contract of employment for any fixed term.</p>
{{#if hr_contact_email}}<p>If you have any questions, please contact us at {{hr_contact_email}}.</p>{{/if}}
<p>Thank you for the work you do here. We look forward to your continued contribution.</p>`,
};
