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
 *   1. The letter itself — addressee, subject, and the offer prose.
 *   2. Position and compensation summaries, then the employment terms.
 *   3. Acknowledgements, acceptance statement and the signature block.
 *
 * Pages 2 and 3 draw their prose from the offer template's optional
 * termsHtml / acknowledgementsHtml fields. Nothing legal is hard-coded here:
 * when a template supplies no terms, the page says so rather than inventing
 * language on the company's behalf.
 */
import { site } from "@/lib/site";

import { escapeHtml } from "@/lib/ats/policy";
import { formatCurrency } from "@/lib/format";
import { renderOfferTemplate } from "@/lib/offers/variables";
import { documentBaseCss } from "@/lib/documents/chrome";
import { sohumLetterheadDataUri } from "@/lib/documents/logo";

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
  /** Used for the "Dear <name>," greeting; falls back to the full name. */
  candidateFirstName?: string | null;
  candidatePhone?: string | null;
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
/* The letter's own date. The company's letters use a short numeric date
   ("7/22/2021") in the Date: line, not a spelled-out one. */
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
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


  /* The offer's own terms, as a short table.
     The template normally states compensation and dates in prose, so this is
     omitted when it would merely repeat them. When a template does not — and
     for every field no template renders — the figures appear here. This is not
     only presentational: the signed document's SHA-256 covers the rendered
     HTML, so terms that appear nowhere in it would let compensation change
     without changing the hash that evidences what was accepted. */
  const allProse = `${input.templateBodyHtml} ${input.templateTermsHtml ?? ""} ${input.templateAcknowledgementsHtml ?? ""}`;
  const money = (cents?: number | null) => (cents == null ? undefined : formatCurrency(cents));
  const statesPay = /salary|hourly|per hour|compensat/i.test(allProse);
  const statesDates = /start date|no later than|expires/i.test(allProse);
  const structuredTerms = [
    statesPay ? "" : row("Annual salary", money(input.annualSalaryCents)),
    statesPay ? "" : row("Hourly rate", input.hourlyRateCents != null ? `${money(input.hourlyRateCents)} / hour` : undefined),
    statesPay ? "" : row("Sign-on bonus", money(input.signOnBonusCents)),
    statesPay ? "" : row("Performance bonus", money(input.bonusCents)),
    statesDates ? "" : row("Start date", fmtCalendarDate(input.startDate)),
    statesDates ? "" : row("Offer expires", fmtCalendarDate(input.expirationDate)),
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

  /* The acceptance sentence the company's own letters carry above the
     signature rules. Still overridable per template. */
  const acceptanceStatement = input.acceptanceStatement?.trim()
    || "I have received this letter and I accept the terms contained herein.";

  const sig = input.signature;

  // The signature area renders in one of two states from the same markup:
  // an unsigned copy shows ruled lines to sign; the countersigned copy shows
  // the recorded acceptance. Both come from this single function so the
  // signed PDF is provably the same document plus the signature.



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

  /* The sign-and-return deadline.
     The company's letter always states it ("please sign and return this letter
     no later than <date>") with the date highlighted. Most templates say it
     themselves via {{offer_expiration_date}}; when a template does not, the
     letter adds the sentence rather than issuing an offer with no stated
     deadline — that date governs when the offer lapses. */
  const bodyMentionsExpiry = /no later than|expires|expiration/i
    .test(`${input.templateBodyHtml} ${input.templateTermsHtml ?? ""} ${input.templateAcknowledgementsHtml ?? ""}`);
  const deadline = bodyMentionsExpiry
    ? ""
    : `<p>If you agree to accept this offer, please sign and return this letter no later than
       <mark>${escapeHtml(fmtCalendarDate(input.expirationDate))}</mark>.</p>`;

  // Recipient block: Date / Name / Email / Phone, as on the company's own
  // letterhead — not a formal postal address block.
  const recipient = [
    ["Date", today],
    ["Name", input.candidateName],
    ["Email", input.candidateEmail],
    ["Phone", input.candidatePhone],
  ].filter(([, v]) => v)
    .map(([k, v]) => `<div><span class="rk">${escapeHtml(String(k))}:</span> <strong>${escapeHtml(String(v))}</strong></div>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Offer of Employment — ${escapeHtml(input.jobTitle)}</title>
<style>
${documentBaseCss}
  /* ------------------------------------------------------------------
     This letter follows the format Sohum Systems already issues offers in:
     a letterhead lockup above a rule, the recipient block as Date / Name /
     Email / Phone, numbered terms, the at-will paragraph, the eligibility
     conditions as diamond bullets, and a "Sincerely" close over the HR
     signature and the candidate's own signature and date lines. The running
     footer carries the office address, site, phone and fax on every page.
     ------------------------------------------------------------------ */
  /* Top margin clears the running letterhead, bottom the running footer;
     both are drawn by Chromium as page furniture on every page. */
  @page { margin: 1.35in 0.8in 1.05in; }
  body { font-size: 10.5pt; line-height: 1.42; }

  .letterhead { margin: 0 0 4px; }
  /* The PDF draws the letterhead and footer as running page furniture, so the
     in-flow copies are suppressed there to avoid printing them twice. */
  @media print { .screen-only { display: none; } }
  .letterhead img { display: block; width: 100%; max-width: 5.7in; margin: 0 auto; }
  .letterhead .rule {
    border-top: 1.1px solid #3b3f8f; margin-top: 7px;
    /* The letterhead rule fades from navy to orange, as on the original. */
    background: linear-gradient(to right, #3b3f8f 0%, #3b3f8f 55%, #e8622a 100%);
    height: 1.1px; border: 0;
  }

  .recipient { margin: 20px 0 16px; line-height: 1.55; }
  .recipient .rk { color: #16233f; }
  .greeting { margin: 0 0 12px; }

  .body-copy p { margin: 0 0 10px; }
  .body-copy ol { margin: 4px 0 10px; padding-left: 20px; }
  .body-copy ol li { margin-bottom: 6px; padding-left: 3px; }
  /* Eligibility conditions are set with the diamond bullet the letterhead
     uses, rather than a disc. */
  .body-copy ul { margin: 4px 0 10px; padding-left: 18px; list-style: none; }
  .body-copy ul li { margin-bottom: 3px; position: relative; padding-left: 14px; }
  .body-copy ul li::before {
    content: "♦"; position: absolute; left: 0; top: 0; color: #16233f; font-size: 9pt;
  }
  .body-copy h3 {
    font-family: inherit; font-size: 10.5pt; font-weight: 700; color: #16233f;
    margin: 12px 0 5px;
  }
  .body-copy h3:first-child { margin-top: 0; }

  /* The return-by date is highlighted on the company's letter. */
  /* The sign-and-return deadline, highlighted as on the company's letter. */
  .body-copy mark { background: #fff3a3; color: inherit; padding: 0 2px; font-weight: 700; }

  .close { margin-top: 18px; }
  .close .sincerely { margin: 0 0 4px; }
  .rep-name { margin-top: 34px; line-height: 1.4; }
  .rep-name strong { font-weight: 400; }

  .accept-line { margin: 26px 0 4px; }
  .sign-row {
    display: flex; gap: 0.5in; margin-top: 42px; break-inside: avoid; page-break-inside: avoid;
  }
  .sign-row .field { flex: 0 0 3.6in; }
  .sign-row .field.date { flex: 1; }
  .sign-row .rule { border-bottom: 1px solid #16233f; height: 0; }
  .sign-row .caption { font-size: 9.5pt; margin-top: 4px; }
  .signed-name {
    font-family: "Snell Roundhand", "Apple Chancery", "Segoe Script", "Brush Script MT", cursive;
    font-size: 19pt; color: #16233f; line-height: 1; padding-bottom: 3px; white-space: nowrap;
  }

  .record { margin-top: 18px; padding: 10px 13px; border: 1px solid #d9dfe8; background: #f7f8fa; }
  .record h2 {
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 9pt;
    letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 6px;
    padding-bottom: 4px; border-bottom: 1px solid #c9d2de;
  }
  .record, .record table.kv, .record tbody { break-inside: auto; page-break-inside: auto; }
  .record table.kv td { padding: 2.5px 0; }
  .record table.kv td.k { font-size: 8.2pt; }
  .record table.kv td.v { font-size: 9.5pt; }
  .hash { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 8.2pt; letter-spacing: -0.01em; }
</style>
</head>
<body>

  <!-- In print the letterhead is drawn by Chromium's running header so it
       repeats on every page; this copy is for the on-screen preview, which has
       no running header, and is hidden when printing. -->
  <header class="letterhead screen-only">
    <img src="${sohumLetterheadDataUri}" alt="${escapeHtml(site.legalName)}">
    <div class="rule"></div>
  </header>

  <div class="recipient">${recipient}</div>

  <p class="greeting">Dear <strong>${escapeHtml(input.candidateFirstName || input.candidateName)}</strong>,</p>

  <div class="body-copy">${sanitizeOfferBody(input.templateBodyHtml)}</div>

  ${termsProse === "" ? "" : `<div class="body-copy">${termsProse}</div>`}

  ${acknowledgements ? `<div class="body-copy">${acknowledgements}</div>` : ""}

  ${deadline ? `<div class="body-copy">${deadline}</div>` : ""}

  ${structuredTerms ? `<h2>Summary of terms</h2><table class="kv">${structuredTerms}</table>` : ""}

  <div class="close no-break">
    <p class="sincerely">Sincerely,</p>
    ${input.authorizedRepresentative
      ? `<div class="rep-name">
           ${escapeHtml(input.authorizedRepresentative.name)},<br>
           ${escapeHtml(input.authorizedRepresentative.title ?? "")}
         </div>`
      : `<div class="rep-name">${escapeHtml(site.legalName)}</div>`}
  </div>

  <p class="accept-line">${escapeHtml(acceptanceStatement)}</p>

  <div class="sign-row">
    <div class="field">
      ${sig ? `<div class="signed-name">${escapeHtml(sig.signatureValue)}</div>` : ""}
      <div class="rule"></div>
      <div class="caption">Signature</div>
    </div>
    <div class="field date">
      ${sig ? `<div class="signed-name">&nbsp;</div>` : ""}
      <div class="rule"></div>
      <div class="caption">Date</div>
    </div>
  </div>

  ${acceptanceRecord}

</body>
</html>`;
}

export { renderOfferTemplate };
