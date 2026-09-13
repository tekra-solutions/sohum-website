import { sanitizeOfferBody } from "@/lib/offers/sanitize";
/**
 * The promotion / updated-employment letter.
 *
 * Built on exactly the same chrome as the offer letter — the same letterhead
 * lockup, the same documentBaseCss, the same running header and footer — so
 * the two documents are visibly the same company's. The layout mirrors
 * offers/render-html.ts: recipient block, greeting, template prose, a table of
 * what is changing, the close, and the signature block.
 *
 * The one structural addition is the change table. A promotion letter's whole
 * purpose is to state what moved, so current-versus-new is rendered from the
 * version's frozen previous/new columns rather than left to template prose.
 *
 * The result is frozen into promotion_versions.renderedHtml at write time, so
 * a later template or branding change can never alter a letter the employee
 * has already reviewed or signed.
 */
import { site } from "@/lib/site";
import { employmentTypeLabel, remoteTypeLabel, formatCurrency } from "@/lib/format";
import { escapeHtml } from "@/lib/ats/policy";
import { documentBaseCss } from "@/lib/documents/chrome";
import { sohumLetterheadDataUri } from "@/lib/documents/logo";

export type PromotionSignatureBlock = {
  signerLegalName: string;
  signerEmail: string;
  signatureValue: string;
  signedAt: Date;
  consentedAt: Date;
  consentText: string;
  verificationMethod: string;
  versionNumber: number;
  promotionId: string;
  documentHash?: string | null;
};

export type PromotionHtmlInput = {
  employeeName: string;
  employeeFirstName?: string | null;
  employeeEmail: string;
  employeeNumber?: string | null;

  previousJobTitle: string;
  previousDepartment: string;
  previousLocation?: string | null;
  previousManagerName?: string | null;
  previousAnnualSalaryCents?: number | null;
  previousHourlyRateCents?: number | null;

  jobTitle: string;
  department: string;
  location?: string | null;
  employmentType: string;
  remoteType?: string | null;
  managerName?: string | null;
  annualSalaryCents?: number | null;
  hourlyRateCents?: number | null;
  bonusCents?: number | null;
  otherCompensation?: string | null;
  benefitsSummary?: string | null;
  ptoSummary?: string | null;
  additionalTerms?: string | null;

  effectiveDate: Date;
  expirationDate: Date;

  /** Template prose with its {{variables}} already resolved. */
  templateBodyHtml: string;
  templateTermsHtml?: string | null;
  templateAcknowledgementsHtml?: string | null;
  acceptanceStatement?: string | null;
  authorizedRepresentative?: { name: string; title: string | null } | null;
  versionNumber?: number | null;
  reference?: string | null;
  signature?: PromotionSignatureBlock | null;
};

const fmtCalendarDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
const fmtTimestamp = (d: Date) =>
  `${d.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC`;

const money = (cents?: number | null) => (cents == null ? null : formatCurrency(cents));

function row(label: string, value?: string | null, valueClass?: string) {
  if (!value) return "";
  const cls = valueClass ? ` ${valueClass}` : "";
  return `<tr><td class="k">${escapeHtml(label)}</td><td class="v${cls}">${escapeHtml(value)}</td></tr>`;
}

/** One row of the change table, rendered only when the value actually moved. */
function change(label: string, before?: string | null, after?: string | null) {
  const from = before?.trim() || "—";
  const to = after?.trim() || "—";
  if (from === to) return "";
  return `<tr>
    <td class="ck">${escapeHtml(label)}</td>
    <td class="cv from">${escapeHtml(from)}</td>
    <td class="cv to">${escapeHtml(to)}</td>
  </tr>`;
}

export function renderPromotionHtml(input: PromotionHtmlInput): string {
  const today = fmtDate(new Date());
  const sig = input.signature;

  const pay = (annual?: number | null, hourly?: number | null) =>
    annual != null ? money(annual) : hourly != null ? `${money(hourly)} / hour` : null;

  const changeRows = [
    change("Position", input.previousJobTitle, input.jobTitle),
    change("Department", input.previousDepartment, input.department),
    change("Reporting to", input.previousManagerName, input.managerName),
    change("Location", input.previousLocation, input.location),
    change(
      "Compensation",
      pay(input.previousAnnualSalaryCents, input.previousHourlyRateCents),
      pay(input.annualSalaryCents, input.hourlyRateCents),
    ),
  ].filter(Boolean).join("");

  // Facts that are part of the change but have no "previous" side.
  const additions = [
    row("Employment type", employmentTypeLabel[input.employmentType] ?? input.employmentType),
    input.remoteType ? row("Work arrangement", remoteTypeLabel[input.remoteType] ?? input.remoteType) : "",
    row("Bonus", money(input.bonusCents)),
    row("Other compensation", input.otherCompensation),
    row("Effective date", fmtCalendarDate(input.effectiveDate)),
  ].filter(Boolean).join("");

  const termsProse = input.templateTermsHtml?.trim()
    ? sanitizeOfferBody(input.templateTermsHtml)
    : "";
  const acknowledgements = input.templateAcknowledgementsHtml?.trim()
    ? sanitizeOfferBody(input.templateAcknowledgementsHtml)
    : "";

  /* The statement that everything not listed is unchanged. It is the point of
     an updated-employment letter, so the renderer guarantees it appears even
     if a template omits it — but a template that already says it is not made
     to say it twice. */
  const allProse = `${input.templateBodyHtml} ${termsProse} ${acknowledgements}`;
  const saysUnchanged = /remain in (full )?(force|effect)|otherwise unchanged|all other terms/i.test(allProse);
  const unchangedClause = saysUnchanged
    ? ""
    : `<p>All other terms and conditions of your employment with ${escapeHtml(site.legalName)},
       including those set out in your original offer of employment and the Company&rsquo;s
       written policies, remain in full force and effect.</p>`;

  const acceptanceStatement = input.acceptanceStatement?.trim()
    || "I have received this letter and I accept the terms contained herein.";

  const deadlineStated = /no later than|sign and return|expires/i.test(allProse);
  const deadline = deadlineStated
    ? ""
    : `<p>Please sign and return this letter no later than
       <mark>${escapeHtml(fmtCalendarDate(input.expirationDate))}</mark>.</p>`;

  const recipient = [
    ["Date", today],
    ["Name", input.employeeName],
    ["Email", input.employeeEmail],
    ["Employee ID", input.employeeNumber],
  ].filter(([, v]) => v)
    .map(([k, v]) => `<div><span class="rk">${escapeHtml(String(k))}:</span> <strong>${escapeHtml(String(v))}</strong></div>`)
    .join("");

  const acceptanceRecord = sig
    ? `<div class="record">
        <h2>Electronic acceptance record</h2>
        <table class="kv">
          ${row("Promotion reference", `${input.reference ?? sig.promotionId} (version ${sig.versionNumber})`)}
          ${row("Employee", `${sig.signerLegalName} — ${sig.signerEmail}`)}
          ${row("Consent given", fmtTimestamp(sig.consentedAt))}
          ${row("Signed", fmtTimestamp(sig.signedAt))}
          ${row("Identity verification", sig.verificationMethod === "EMAIL_OTP" ? "One-time code sent to the employee's work email on file" : sig.verificationMethod)}
          ${row("Document hash (SHA-256)", sig.documentHash ?? undefined, "hash")}
        </table>
        <p class="small muted">Consent recorded: &ldquo;${escapeHtml(sig.consentText)}&rdquo;</p>
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Promotion — ${escapeHtml(input.jobTitle)}</title>
<style>
${documentBaseCss}
  /* Geometry and letterhead match the offer letter exactly: top margin clears
     the running letterhead, bottom clears the running footer. */
  @page { margin: 1.35in 0.8in 1.05in; }
  body { font-size: 10.5pt; line-height: 1.42; }

  .letterhead { margin: 0 0 4px; }
  .letterhead img { display: block; width: 100%; max-width: 5.7in; margin: 0 auto; }
  .letterhead .rule { height: 1.1px; border: 0; margin-top: 7px;
    background: linear-gradient(to right, #3b3f8f 0%, #3b3f8f 55%, #e8622a 100%); }
  @media print { .screen-only { display: none; } }

  .recipient { margin: 20px 0 16px; line-height: 1.55; }
  .subject { font-weight: 700; margin: 0 0 12px; }
  .greeting { margin: 0 0 12px; }
  .body-copy p { margin: 0 0 10px; }
  .body-copy ul, .body-copy ol { margin: 4px 0 10px; padding-left: 20px; }
  .body-copy h3 { font-family: inherit; font-size: 10.5pt; font-weight: 700; margin: 12px 0 5px; }
  .body-copy mark { background: #fff3a3; color: inherit; padding: 0 2px; font-weight: 700; }

  /* The change table is the heart of this letter: what it was, what it becomes. */
  table.changes { width: 100%; border-collapse: collapse; margin: 4px 0 12px; }
  table.changes thead th {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 8pt; text-transform: uppercase; letter-spacing: 0.09em; color: #5b6a80;
    text-align: left; padding: 5px 8px 5px 0; border-bottom: 1.2px solid #16233f;
  }
  table.changes td { padding: 6px 8px 6px 0; border-bottom: 1px solid #eef1f5; vertical-align: top; }
  table.changes td.ck {
    width: 26%; color: #5b6a80; font-size: 9pt;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  table.changes td.cv { width: 37%; }
  table.changes td.cv.from { color: #5b6a80; text-decoration: line-through; }
  table.changes td.cv.to { font-weight: 700; color: #16233f; }

  .close { margin-top: 18px; }
  .rep-name { margin-top: 34px; line-height: 1.4; }
  .accept-line { margin: 26px 0 4px; }
  .sign-row { display: flex; gap: 0.5in; margin-top: 42px; break-inside: avoid; page-break-inside: avoid; }
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
  .hash { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 8.2pt; letter-spacing: -0.01em; }
</style>
</head>
<body>

  <header class="letterhead screen-only">
    <img src="${sohumLetterheadDataUri}" alt="${escapeHtml(site.legalName)}">
    <div class="rule"></div>
  </header>

  <div class="recipient">${recipient}</div>

  <p class="subject">Subject: Promotion to ${escapeHtml(input.jobTitle)}</p>

  <p class="greeting">Dear <strong>${escapeHtml(input.employeeFirstName || input.employeeName)}</strong>,</p>

  <div class="body-copy">${sanitizeOfferBody(input.templateBodyHtml)}</div>

  ${changeRows ? `<table class="changes">
    <thead><tr><th></th><th>Current</th><th>New</th></tr></thead>
    <tbody>${changeRows}</tbody>
  </table>` : ""}

  ${additions ? `<table class="kv">${additions}</table>` : ""}

  ${termsProse ? `<div class="body-copy">${termsProse}</div>` : ""}

  ${unchangedClause ? `<div class="body-copy">${unchangedClause}</div>` : ""}

  ${acknowledgements ? `<div class="body-copy">${acknowledgements}</div>` : ""}

  ${deadline ? `<div class="body-copy">${deadline}</div>` : ""}

  <div class="close no-break">
    <p>Sincerely,</p>
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
