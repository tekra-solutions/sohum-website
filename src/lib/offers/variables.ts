import { escapeHtml } from "@/lib/ats/policy";
import { sanitizeOfferBody } from "./sanitize";
/**
 * Offer template variables — structurally identical to ats/policy.ts's
 * validateTemplate/renderTemplate, but against a separate, larger allowlist.
 * Kept in its own module rather than parameterizing the ATS email-template
 * functions so the two independent template systems (candidate email vs.
 * offer letter content) never become coupled.
 */
export const offerTemplateVariables = [
  "candidate_name",
  "candidate_first_name",
  "candidate_email",
  "candidate_address",
  "job_title",
  "department",
  "location",
  "employment_type",
  "work_arrangement",
  "work_location",
  "start_date",
  "salary",
  "hourly_rate",
  "pay_frequency",
  "bonus",
  "sign_on_bonus",
  "other_compensation",
  "benefits_summary",
  "pto_summary",
  "additional_terms",
  "manager_name",
  "reports_to",
  "company_name",
  "company_legal_name",
  "company_address",
  "hr_contact_email",
  "authorized_rep_name",
  "authorized_rep_title",
  "offer_date",
  "offer_expiration_date",
  "offer_reference",
] as const;

/**
 * Optional variables may legitimately be absent — not every offer has a
 * sign-on bonus. Rendering must not fail on these, and must not leave an
 * empty sentence behind either, which is what conditional sections are for.
 */
const optionalVariables = new Set<string>([
  "candidate_address", "hourly_rate", "bonus", "sign_on_bonus",
  "other_compensation", "benefits_summary", "pto_summary", "additional_terms",
  "manager_name", "reports_to", "work_location", "salary",
  "authorized_rep_name", "authorized_rep_title", "hr_contact_email",
]);

/** `{{#if name}}` … `{{/if}}` — the block is dropped when the value is empty. */
const CONDITIONAL = /{{#if\s+([a-z_]+)\s*}}([\s\S]*?){{\/if}}/g;

export function validateOfferTemplate(text: string) {
  // Conditionals are checked first, then removed, so the plain-variable scan
  // below sees only ordinary tokens.
  for (const [, name] of text.matchAll(CONDITIONAL)) {
    if (!(offerTemplateVariables as readonly string[]).includes(name)) return false;
  }
  const body = text.replace(CONDITIONAL, (_, __, inner: string) => inner);
  const tokens = [...body.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(m => m[1]);
  if (
    tokens.some(t => !(offerTemplateVariables as readonly string[]).includes(t)) ||
    /[{}]/.test(body.replace(/{{\s*([^{}]+?)\s*}}/g, ""))
  ) return false;
  return true;
}

export function renderOfferTemplate(text: string, values: Record<string, string>) {
  if (!validateOfferTemplate(text)) throw new Error("Unsupported template variable.");
  // Resolve conditionals first: a block whose variable is empty is removed
  // whole, so an absent sign-on bonus leaves no orphaned sentence or heading.
  const resolved = text.replace(CONDITIONAL, (_, name: string, inner: string) =>
    values[name]?.trim() ? inner : "",
  );
  return sanitizeOfferBody(resolved.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => {
    if (!values[key]) {
      // A required field genuinely missing is a real error the recruiter must
      // fix; an optional one simply renders as nothing, since any surrounding
      // prose belongs inside a conditional.
      if (optionalVariables.has(key)) return "";
      throw new Error(`Complete ${key.replaceAll("_", " ")} before generating this offer.`);
    }
    return escapeHtml(values[key]);
  }));
}
