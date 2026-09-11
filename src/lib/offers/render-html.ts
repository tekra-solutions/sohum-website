import { sanitizeOfferBody } from "./sanitize";
/**
 * Builds the full, standalone, printable HTML document for an offer letter.
 *
 * This is the single source of truth for what an offer looks like: the same
 * string feeds both the on-screen [Preview Offer] view and pdf.ts's
 * renderOfferPdf(), so the preview and the final PDF are guaranteed to match
 * — there is no separate PDF layout to keep in sync. The result is frozen
 * into offer_versions.renderedHtml at write time, not regenerated later, so
 * a subsequent template/branding change can never retroactively alter an
 * already-issued or already-accepted document.
 */
import { site, contact } from "@/lib/site";
import { employmentTypeLabel, remoteTypeLabel, formatCurrency } from "@/lib/format";
import { escapeHtml } from "@/lib/ats/policy";
import { renderOfferTemplate } from "@/lib/offers/variables";

export type OfferHtmlInput = {
  candidateName: string;
  candidateAddress?: string | null;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: string;
  remoteType: string;
  hiringManagerName?: string | null;
  reportsTo?: string | null;
  startDate: Date;
  expirationDate: Date;
  annualSalaryCents?: number | null;
  hourlyRateCents?: number | null;
  bonusCents?: number | null;
  signOnBonusCents?: number | null;
  otherCompensation?: string | null;
  benefitsSummary?: string | null;
  ptoSummary?: string | null;
  workLocation?: string | null;
  additionalTerms?: string | null;
  /** The offer template's body, with its {{variables}} already resolved. */
  templateBodyHtml: string;
};

// startDate/expirationDate are calendar dates (no meaningful time-of-day),
// stored at UTC midnight — format those in UTC so the date never shifts by a
// day depending on the server's local timezone. The letter's issue date is a
// real instant, so it formats in local time as usual.
const fmtCalendarDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function row(label: string, value?: string | null) {
  if (!value) return "";
  return `<tr><td class="k">${escapeHtml(label)}</td><td class="v">${escapeHtml(value)}</td></tr>`;
}

export function renderOfferHtml(input: OfferHtmlInput): string {
  const today = fmtDate(new Date());
  const compensation = [
    row("Annual salary", input.annualSalaryCents != null ? formatCurrency(input.annualSalaryCents) : undefined),
    row("Hourly rate", input.hourlyRateCents != null ? `${formatCurrency(input.hourlyRateCents)} / hour` : undefined),
    row("Bonus", input.bonusCents != null ? formatCurrency(input.bonusCents) : undefined),
    row("Sign-on bonus", input.signOnBonusCents != null ? formatCurrency(input.signOnBonusCents) : undefined),
    row("Other compensation", input.otherCompensation),
  ].filter(Boolean).join("");

  const terms = [
    row("Position", input.jobTitle),
    row("Department", input.department),
    row("Location", input.location),
    row("Employment type", employmentTypeLabel[input.employmentType] ?? input.employmentType),
    row("Work arrangement", remoteTypeLabel[input.remoteType] ?? input.remoteType),
    row("Reports to", input.reportsTo ?? input.hiringManagerName),
    row("Start date", fmtCalendarDate(input.startDate)),
    row("Work location", input.workLocation),
    row("Benefits", input.benefitsSummary),
    row("Paid time off", input.ptoSummary),
    row("Additional terms", input.additionalTerms),
  ].filter(Boolean).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page { margin: 0.6in; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1b2a5e;
    font-size: 13px;
    line-height: 1.6;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.4in;
  }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
  .brand .flame { color: #e8622a; }
  .company-address { font-size: 11px; color: #5b6a80; margin-bottom: 24px; }
  .date { font-size: 12px; color: #5b6a80; margin-bottom: 20px; }
  .candidate-block { font-size: 13px; margin-bottom: 24px; }
  h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
  h2 { font-size: 14px; font-weight: 600; margin: 24px 0 10px; border-bottom: 1px solid #e7ebf1; padding-bottom: 6px; }
  table.kv { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.kv td { padding: 5px 0; vertical-align: top; }
  table.kv td.k { width: 38%; color: #5b6a80; font-weight: 600; }
  table.kv td.v { width: 62%; }
  .body-copy { margin: 16px 0; }
  .disclaimer {
    margin-top: 32px; padding: 12px 14px; border: 1px solid #e7ebf1; background: #f7f8fa;
    font-size: 10.5px; color: #5b6a80; line-height: 1.5;
  }
  .signature { margin-top: 40px; }
  .signature .line { border-top: 1px solid #1b2a5e; width: 3.2in; margin-top: 40px; padding-top: 4px; font-size: 11px; color: #5b6a80; }
  h2 { break-after: avoid; }
  tr, .signature, .disclaimer { break-inside: avoid; }
  td, .body-copy { overflow-wrap: anywhere; }
  @media print {
    body { padding: 0; line-height: 1.45; }
    table.kv td { padding: 4px 0; }
    .company-address, .candidate-block { margin-bottom: 16px; }
    .signature { margin-top: 24px; }
    .disclaimer { margin-top: 20px; }
  }
  .footer { margin-top: 20px; font-size: 10px; color: #8a95a8; border-top: 1px solid #e7ebf1; padding-top: 10px; }
</style>
</head>
<body>
  <div class="brand"><span class="flame">Sohum</span> Systems</div>
  <div class="company-address">${escapeHtml(site.legalName)} &middot; ${escapeHtml(contact.address)}</div>
  <div class="date">${today}</div>

  <div class="candidate-block">
    ${escapeHtml(input.candidateName)}<br>
    ${input.candidateAddress ? escapeHtml(input.candidateAddress).replaceAll("\n", "<br>") + "<br>" : ""}
  </div>

  <h1>Offer of Employment &mdash; ${escapeHtml(input.jobTitle)}</h1>

  <h2>Position details</h2>
  <table class="kv">${terms}</table>

  <h2>Compensation</h2>
  <table class="kv">${compensation}</table>

  <h2>Terms</h2>
  <div class="body-copy">${sanitizeOfferBody(input.templateBodyHtml)}</div>

  <div class="signature">
    <h2>Acceptance</h2>
    <p>By signing below, I acknowledge that I have read and understood the terms of this offer.</p>
    <div class="line">Candidate signature &amp; date</div>
  </div>

  <div class="disclaimer">
    This document is a template generated by Sohum Systems&rsquo; recruiting system.
    It has not been reviewed by counsel for this specific offer and does not
    constitute legally binding terms until countersigned by an authorized
    company representative. This offer expires on ${fmtCalendarDate(input.expirationDate)}.
  </div>

  <div class="footer">${escapeHtml(site.legalName)} &middot; ${escapeHtml(contact.address)} &middot; ${escapeHtml(contact.emailHr)}</div>
</body>
</html>`;
}

export { renderOfferTemplate };
