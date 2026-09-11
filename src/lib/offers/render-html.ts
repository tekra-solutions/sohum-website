import { sanitizeOfferBody } from "./sanitize";
/**
 * Builds the full, standalone, printable HTML document for an offer letter.
 *
 * This is the single source of truth for what an offer looks like: the same
 * string feeds the on-screen [Preview Offer] view, the candidate's review
 * page, and pdf.ts's renderOfferPdf(), so preview and PDF cannot drift.
 * The result is frozen into offer_versions.renderedHtml at write time, so a
 * later template or branding change can never retroactively alter an
 * already-issued or already-accepted document.
 *
 * The document is laid out as three pages with real content, not padding:
 *   1. Offer summary — parties, position details, compensation.
 *   2. Employment terms — entirely from the configurable HR template.
 *   3. Acknowledgements, acceptance statement and the signature block.
 *
 * Pages 2 and 3 draw their prose from the offer template's optional
 * termsHtml / acknowledgementsHtml fields. Nothing legal is hard-coded here:
 * when a template supplies no terms, the page says so rather than inventing
 * language on the company's behalf.
 */
import { site } from "@/lib/site";
import { employmentTypeLabel, remoteTypeLabel, formatCurrency } from "@/lib/format";
import { escapeHtml } from "@/lib/ats/policy";
import { renderOfferTemplate } from "@/lib/offers/variables";
import { documentHeader, documentBaseCss } from "@/lib/documents/chrome";

/** The acceptance record, present only once the candidate has signed. */
export type OfferSignatureBlock = {
  candidateLegalName: string;
  candidateEmail: string;
  signatureValue: string;
  signedAt: Date;
  consentedAt: Date;
  consentText: string;
  verificationMethod: string;
  offerVersionNumber: number;
  offerId: string;
  documentHash?: string | null;
};

export type OfferHtmlInput = {
  candidateName: string;
  candidateAddress?: string | null;
  candidateEmail?: string | null;
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
  payFrequency?: string | null;
  /** The offer template's body, with its {{variables}} already resolved. */
  templateBodyHtml: string;
  /** Page 2 employment terms, from the template. Optional. */
  templateTermsHtml?: string | null;
  /** Page 3 acknowledgements, from the template. Optional. */
  templateAcknowledgementsHtml?: string | null;
  /** Shown on page 3 above the signature. Configurable, not invented here. */
  acceptanceStatement?: string | null;
  authorizedRepresentative?: { name: string; title: string | null } | null;
  offerVersionNumber?: number | null;
  offerReference?: string | null;
  logoDataUri?: string | null;
  /** Present only on the countersigned copy. */
  signature?: OfferSignatureBlock | null;
};

// startDate/expirationDate are calendar dates (no meaningful time-of-day),
// stored at UTC midnight — format those in UTC so the date never shifts by a
// day depending on the server's local timezone. The letter's issue date is a
// real instant, so it formats in local time as usual.
const fmtCalendarDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const fmtTimestamp = (d: Date) =>
  `${d.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC`;

function row(label: string, value?: string | null, valueClass?: string) {
  if (!value) return "";
  // `valueClass` is caller-supplied styling only; the value itself stays escaped.
  const cls = valueClass ? ` ${valueClass}` : "";
  return `<tr><td class="k">${escapeHtml(label)}</td><td class="v${cls}">${escapeHtml(value)}</td></tr>`;
}

export function renderOfferHtml(input: OfferHtmlInput): string {
  const today = fmtDate(new Date());
  const reference = input.offerReference ?? "";

  // Optional compensation lines are omitted entirely when absent, rather
  // than rendering an empty row.
  const compensation = [
    row("Annual salary", input.annualSalaryCents != null ? formatCurrency(input.annualSalaryCents) : undefined),
    row("Hourly rate", input.hourlyRateCents != null ? `${formatCurrency(input.hourlyRateCents)} / hour` : undefined),
    row("Pay frequency", input.payFrequency),
    row("Bonus", input.bonusCents != null ? formatCurrency(input.bonusCents) : undefined),
    row("Sign-on bonus", input.signOnBonusCents != null ? formatCurrency(input.signOnBonusCents) : undefined),
    row("Other compensation", input.otherCompensation),
  ].filter(Boolean).join("");

  const position = [
    row("Position", input.jobTitle),
    row("Department", input.department),
    row("Employment type", employmentTypeLabel[input.employmentType] ?? input.employmentType),
    row("Work arrangement", remoteTypeLabel[input.remoteType] ?? input.remoteType),
    row("Work location", input.workLocation ?? input.location),
    row("Reporting manager", input.reportsTo ?? input.hiringManagerName),
    row("Proposed start date", fmtCalendarDate(input.startDate)),
  ].filter(Boolean).join("");

  // Page 2 sections that come from structured version fields rather than the
  // template prose. Omitted when empty.
  const structuredTerms = [
    row("Benefits", input.benefitsSummary),
    row("Paid time off", input.ptoSummary),
    row("Additional terms", input.additionalTerms),
  ].filter(Boolean).join("");

  const termsProse = input.templateTermsHtml?.trim()
    ? sanitizeOfferBody(input.templateTermsHtml)
    : `<p class="muted">No additional employment terms have been configured for this
       offer template. Terms of employment are governed by the offer summary,
       the acknowledgements on the following page, and ${escapeHtml(site.legalName)}&rsquo;s
       written policies.</p>`;

  const acknowledgements = input.templateAcknowledgementsHtml?.trim()
    ? sanitizeOfferBody(input.templateAcknowledgementsHtml)
    : "";

  const acceptanceStatement = input.acceptanceStatement?.trim()
    || "I acknowledge that I have reviewed this offer and accept the terms described in this Offer of Employment.";

  const sig = input.signature;

  // The signature area renders in one of two states from the same markup:
  // an unsigned copy shows ruled lines to sign; the countersigned copy shows
  // the recorded acceptance. Both come from this single function so the
  // signed PDF is provably the same document plus the signature.
  const signatureBlock = sig
    ? `<table class="kv">
        ${row("Candidate legal name", sig.candidateLegalName)}
        ${row("Candidate email", sig.candidateEmail)}
        ${row("Signed", fmtTimestamp(sig.signedAt))}
      </table>
      <div class="signed-mark">
        <div class="signed-name">${escapeHtml(sig.signatureValue)}</div>
        <div class="signed-rule"></div>
        <div class="small muted">Electronically signed by ${escapeHtml(sig.candidateLegalName)}</div>
      </div>`
    : `<table class="kv">
        ${row("Candidate legal name", input.candidateName)}
        ${row("Candidate email", input.candidateEmail)}
      </table>
      <div class="sign-line"><div class="rule"></div><div class="caption">Signature</div></div>
      <div class="sign-line"><div class="rule"></div><div class="caption">Date</div></div>`;

  // A template that already sets these out in prose makes the summary tables
  // duplicates: they restate the same facts a paragraph later and push the
  // letter onto an extra page. The tables stay for sparser templates, so an
  // offer whose body omits the details still states them somewhere.
  const body = input.templateBodyHtml ?? "";
  const showCompensationTable = !/compensation|salary|hourly rate/i.test(body);
  const showPositionTable = !/position of|role of/i.test(body);

  const representative = input.authorizedRepresentative
    ? `<h2>Company representative</h2>
       <table class="kv">
         ${row("Authorized representative", input.authorizedRepresentative.name)}
         ${row("Title", input.authorizedRepresentative.title)}
       </table>
       ${sig ? "" : `<div class="sign-line"><div class="rule"></div><div class="caption">Signature</div></div>`}`
    : "";

  // The electronic acceptance record. Deliberately carries no tokens or
  // session identifiers — only what evidences the acceptance itself.
  const acceptanceRecord = sig
    ? `<div class="record">
        <h2>Electronic acceptance record</h2>
        <table class="kv">
          ${row("Offer reference", `${reference || sig.offerId} (version ${sig.offerVersionNumber})`)}
          ${row("Candidate", `${sig.candidateLegalName} — ${sig.candidateEmail}`)}
          ${row("Consent given", fmtTimestamp(sig.consentedAt))}
          ${row("Signed", fmtTimestamp(sig.signedAt))}
          ${row("Identity verification", sig.verificationMethod === "EMAIL_OTP" ? "One-time code sent to the candidate's email on file" : sig.verificationMethod)}
          ${row("Document hash (SHA-256)", sig.documentHash ?? undefined, "hash")}
        </table>
        <p class="small muted">Consent recorded: &ldquo;${escapeHtml(sig.consentText)}&rdquo;</p>
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Offer of Employment — ${escapeHtml(input.jobTitle)}</title>
<style>
${documentBaseCss}
  .letter-date { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 9pt; color: #5b6a80; margin-bottom: 14px; }
  .party { margin-bottom: 14px; line-height: 1.45; }
  .party strong { font-weight: 600; }
  .subject { font-weight: 700; margin: 0 0 11px; }
  .body-copy { margin: 12px 0 0; }
  /* A ruled line to sign on, with its label underneath. */
  .sign-line { margin-top: 22px; }
  .sign-line .rule { border-bottom: 1px solid #16233f; height: 32px; width: 3.4in; }
  .sign-line .caption {
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 8.5pt; color: #5b6a80; margin-top: 4px;
  }
  .signed-mark { margin-top: 12px; }
  .signed-name {
    font-family: "Snell Roundhand", "Apple Chancery", "Segoe Script", "Brush Script MT", cursive;
    font-size: 18pt; color: #16233f; line-height: 1.2; padding-bottom: 4px;
  }
  .signed-rule { border-bottom: 1px solid #16233f; width: 3.4in; }
  .record { margin-top: 12px; padding: 10px 13px; border: 1px solid #d9dfe8; background: #f7f8fa; }
  .record h2 { margin-top: 0; border-bottom-color: #c9d2de; break-after: avoid; page-break-after: avoid; }
  /* The acceptance record is evidentiary, not decorative: let its rows flow across
     a page boundary rather than shunting the whole block to a near-empty page. */
  .record, .record table.kv, .record tbody { break-inside: auto; page-break-inside: auto; }
  .record table.kv td { padding: 2.5px 0; }
  .record table.kv td.k { font-size: 8.2pt; }
  .record table.kv td.v { font-size: 9.5pt; }
  /* A 64-char hash wraps to two serif lines; a condensed mono face keeps it to one. */
  .hash { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 8.2pt; letter-spacing: -0.01em; }
  .expiry { margin: 11px 0; padding: 8px 12px; border-left: 3px solid #e8622a; background: #fff6f2; }
  .body-copy h3 {
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 9.5pt; font-weight: 700; color: #16233f; margin: 13px 0 5px;
    letter-spacing: 0.02em;
  }
  .body-copy h3:first-child { margin-top: 0; }
  .body-copy ul { margin: 0 0 9px; padding-left: 18px; }
</style>
</head>
<body>

${documentHeader({ title: "Offer of Employment", logoDataUri: input.logoDataUri, subtitle: reference || null })}

  <div class="letter-date">${today}</div>

  <div class="party">
    <strong>${escapeHtml(input.candidateName)}</strong>${input.candidateEmail ? `<br>${escapeHtml(input.candidateEmail)}` : ""}
    ${input.candidateAddress ? `<br>${escapeHtml(input.candidateAddress).replaceAll("\n", "<br>")}` : ""}
  </div>

  <p class="subject">Subject: Offer of Employment &ndash; ${escapeHtml(input.jobTitle)}</p>

  <div class="body-copy">${sanitizeOfferBody(input.templateBodyHtml)}</div>

  ${showPositionTable ? `<h2>Position details</h2>
  <table class="kv">${position}</table>` : ""}

  ${showCompensationTable
    ? `<h2>Compensation</h2>
  <table class="kv">${compensation || `<tr><td class="k">Compensation</td><td class="v muted">To be confirmed</td></tr>`}</table>`
    : ""}

  <!-- ======================= PAGE 2: EMPLOYMENT TERMS ======================= -->
  <div class="page-break"></div>
  <h2>Employment terms</h2>
  <div class="body-copy">${termsProse}</div>
  ${structuredTerms ? `<h2>Summary of terms</h2><table class="kv">${structuredTerms}</table>` : ""}

  <!-- ================== PAGE 3: ACCEPTANCE AND SIGNATURE =================== -->
  <div class="page-break"></div>
  ${acknowledgements ? `<h2>Acknowledgements</h2><div class="body-copy">${acknowledgements}</div>` : ""}

  <div class="expiry no-break">
    <strong>This offer expires on ${fmtCalendarDate(input.expirationDate)}.</strong>
    ${sig ? "" : " Please complete your acceptance on or before this date."}
  </div>

  <div class="no-break">
    <h2>Candidate acceptance</h2>
    <p>${escapeHtml(acceptanceStatement)}</p>
    ${signatureBlock}
  </div>

  ${representative ? `<div class="no-break">${representative}</div>` : ""}

  ${acceptanceRecord}

  <div class="legal-note">
    This document was generated by ${escapeHtml(site.legalName)}&rsquo;s recruiting system from a
    configurable template. Its content has not been reviewed by counsel for this
    specific offer. Terms of employment are those stated above together with any
    written company policies referenced in them.
  </div>

</body>
</html>`;
}

export { renderOfferTemplate };
