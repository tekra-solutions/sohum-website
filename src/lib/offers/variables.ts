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
  "job_title",
  "department",
  "location",
  "employment_type",
  "start_date",
  "salary",
  "hourly_rate",
  "bonus",
  "manager_name",
  "company_name",
  "company_address",
  "offer_expiration_date",
] as const;

export function validateOfferTemplate(text: string) {
  const tokens = [...text.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(m => m[1]);
  if (
    tokens.some(t => !(offerTemplateVariables as readonly string[]).includes(t)) ||
    /[{}]/.test(text.replace(/{{\s*([^{}]+?)\s*}}/g, ""))
  ) return false;
  return true;
}

export function renderOfferTemplate(text: string, values: Record<string, string>) {
  if (!validateOfferTemplate(text)) throw new Error("Unsupported template variable.");
  return sanitizeOfferBody(text.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => {
    if (!values[key]) throw new Error(`Complete ${key.replaceAll("_", " ")} before generating this offer.`);
    return escapeHtml(values[key]);
  }));
}
