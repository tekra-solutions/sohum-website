/**
 * The invoice document. One function renders the standalone printable HTML
 * used by both the on-screen preview and the PDF, so the two cannot drift.
 *
 * Multi-page behaviour is handled with print CSS rather than by measuring:
 * the items table repeats its header on every page (thead + the browser's
 * table pagination), the totals block avoids splitting across a page break,
 * and the invoice number sits in a running header so any page is
 * identifiable on its own.
 */
import { escapeHtml } from "@/lib/ats/policy";
import { documentBaseCss, documentHeader } from "@/lib/documents/chrome";
import { formatMoney, formatQuantity } from "./money";

export type InvoiceDocumentInput = {
  invoiceNumber: string;
  status: string;
  invoiceDate: Date;
  dueDate: Date;
  currency: string;
  billTo: {
    companyName: string; contactName?: string | null; email?: string | null;
    phone?: string | null; billingAddress?: string | null; agency?: string | null;
  } | null;
  references: {
    poNumber?: string | null; contractNumber?: string | null; taskOrder?: string | null;
    projectName?: string | null; periodOfPerformance?: string | null;
  };
  items: {
    description: string; quantityMilli: number; rateCents: number; amountCents: number;
    servicePeriod?: string | null; consultantName?: string | null; projectRef?: string | null;
  }[];
  subtotalCents: number; discountCents: number; taxCents: number;
  additionalChargesCents: number; totalCents: number;
  amountPaidCents: number; balanceDueCents: number; taxRateBasisPoints: number;
  paymentTerms?: string | null;
  notes?: string | null;
  paymentInstructions?: string | null;
  from: {
    legalName: string; billingAddress: string; email: string; phone: string; taxId?: string | null;
  };
  /** Optional data: URI logo for the masthead; see documentHeader(). */
  logoDataUri?: string | null;
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function referenceRows(r: InvoiceDocumentInput["references"]) {
  return [
    ["PO number", r.poNumber],
    ["Contract", r.contractNumber],
    ["Task order", r.taskOrder],
    ["Project", r.projectName],
    ["Period of performance", r.periodOfPerformance],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<tr><td class="k">${escapeHtml(String(k))}</td><td class="v">${escapeHtml(String(v))}</td></tr>`,
  ).join("");
}

export function renderInvoiceHtml(input: InvoiceDocumentInput): string {
  const money = (cents: number) => formatMoney(cents, input.currency);
  const refs = referenceRows(input.references);

  const itemRows = input.items.map(item => {
    const meta = [item.servicePeriod, item.consultantName, item.projectRef].filter(Boolean).map(String);
    return `<tr>
      <td class="desc">${escapeHtml(item.description)}${meta.length ? `<span class="meta">${escapeHtml(meta.join(" · "))}</span>` : ""}</td>
      <td class="num">${escapeHtml(formatQuantity(item.quantityMilli))}</td>
      <td class="num">${escapeHtml(money(item.rateCents))}</td>
      <td class="num">${escapeHtml(money(item.amountCents))}</td>
    </tr>`;
  }).join("");

  const totalRow = (label: string, value: string, strong = false, due = false) =>
    `<tr class="${[strong ? "strong" : "", due ? "due" : ""].filter(Boolean).join(" ")}"><td class="tl">${escapeHtml(label)}</td><td class="tv">${escapeHtml(value)}</td></tr>`;

  const totals = [
    totalRow("Subtotal", money(input.subtotalCents)),
    input.discountCents > 0 ? totalRow("Discount", `-${money(input.discountCents)}`) : "",
    input.taxCents > 0 ? totalRow(`Tax (${(input.taxRateBasisPoints / 100).toFixed(2)}%)`, money(input.taxCents)) : "",
    input.additionalChargesCents > 0 ? totalRow("Additional charges", money(input.additionalChargesCents)) : "",
    totalRow("Total", money(input.totalCents), true),
    input.amountPaidCents > 0 ? totalRow("Amount paid", `-${money(input.amountPaidCents)}`) : "",
    totalRow("Balance due", money(input.balanceDueCents), true, true),
  ].filter(Boolean).join("");

  const billTo = input.billTo;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${escapeHtml(input.invoiceNumber)}</title>
<style>
${documentBaseCss}
  /* Invoice-specific layout. Typography, page geometry and the branded
     masthead come from documentBaseCss/documentHeader so the invoice and the
     offer letter stay visually consistent. */
  body { padding: 0; }
  /* The compact masthead carries no org lines, so the rule sits closer. */
  .doc-title { margin-top: 10px; padding-top: 9px; }
  .doc-header { margin-bottom: 14px; }
  .doc-subtitle { font-size: 12pt; font-weight: 700; color: #16233f; letter-spacing: 0.04em; }

  /* Issued/Due sit directly under the number so the three facts a payer looks
     for first — who to pay, which invoice, by when — are grouped. */
  .inv-dates {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 9pt; color: #5b6a80; margin-top: 3px; letter-spacing: 0.02em;
  }
  .inv-dates .due { color: #16233f; font-weight: 600; }

  .panels { display: flex; gap: 24px; margin-top: 15px; }
  .panels h2 { margin: 0 0 6px; padding-bottom: 4px; }
  .panel { flex: 1.15; min-width: 0; }
  /* The reference table is label/value pairs, not prose: it needs less width
     than the address blocks, which otherwise wrap mid-street-address. */
  .panel.ref { flex: 1; }
  .party { white-space: pre-line; line-height: 1.38; font-size: 9.8pt; }
  .party strong { display: block; font-size: 10.8pt; margin-bottom: 1px; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 2px 0; vertical-align: top; font-size: 9.8pt; }
  table.kv td.k {
    color: #5b6a80; width: 46%;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8.8pt;
  }

  table.items { width: 100%; border-collapse: collapse; margin-top: 18px; }
  table.items thead th {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.09em;
    color: #5b6a80; text-align: left; padding: 6px 7px; border-bottom: 1.5px solid #16233f;
  }
  table.items thead th.num, table.items td.num { text-align: right; }
  table.items td { padding: 6.5px 7px; border-bottom: 1px solid #eef1f5; vertical-align: top; }
  table.items td.desc { width: 55%; }
  table.items td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.items tbody tr:nth-child(even) { background: #fafbfc; }
  table.items .meta {
    display: block; color: #5b6a80; margin-top: 2px;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8.8pt;
  }
  /* Keep a row intact across a page break and repeat the header. */
  table.items tr { page-break-inside: avoid; }
  table.items thead { display: table-header-group; }

  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 13px; page-break-inside: avoid; }
  table.totals { width: 48%; border-collapse: collapse; }
  table.totals td { padding: 3px 7px; }
  table.totals td.tl {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 9pt; color: #5b6a80;
  }
  table.totals td.tv { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.totals tr.strong td { font-weight: 700; border-top: 1px solid #16233f; color: #16233f; }
  /* The balance due is the single number the reader is looking for. */
  table.totals tr.due td { font-size: 12pt; border-top: 2px solid #16233f; padding-top: 7px; }
  table.totals tr.due td.tl { color: #16233f; font-size: 9.5pt; }

  .foot { margin-top: 15px; page-break-inside: avoid; }
  .foot .block { margin-top: 9px; page-break-inside: avoid; }
  .foot .label {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.1em; color: #5b6a80;
  }
  .foot .body { white-space: pre-line; margin-top: 2px; line-height: 1.42; }
  /* Payment instructions are the action item: boxed so they are findable. */
  .foot .block.pay { border: 1px solid #d9dfe8; background: #f7f8fa; padding: 8px 12px; }

  .stamp {
    margin-top: 16px; padding: 8px 12px; border: 1px solid #1e7a4d; color: #14603b;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-weight: 700; text-align: center; letter-spacing: 0.1em;
    text-transform: uppercase; font-size: 10pt;
  }
  .stamp.void { border-color: #8a95a8; color: #5b6a80; }
</style>
</head>
<body>
  ${documentHeader({
    title: "Invoice",
    logoDataUri: input.logoDataUri,
    // The remit-to detail lives in the FROM panel below, so the invoice
    // masthead is wordmark + title + number only. Repeating the address here
    // would both duplicate that panel and cost a third of the page.
    compact: true,
    subtitle: input.invoiceNumber,
  })}
  <div class="inv-dates" style="text-align:center">Issued ${fmtDate(input.invoiceDate)} &nbsp;·&nbsp; <span class="due">Due ${fmtDate(input.dueDate)}</span></div>

  <div class="panels">
    <div class="panel">
      <h2>From</h2>
      <div class="party"><strong>${escapeHtml(input.from.legalName)}</strong>${escapeHtml(input.from.billingAddress)}
${escapeHtml(input.from.phone)}
${escapeHtml(input.from.email)}${input.from.taxId ? `\nTax ID ${escapeHtml(input.from.taxId)}` : ""}</div>
    </div>
    <div class="panel">
      <h2>Bill to</h2>
      <div class="party">${billTo ? `<strong>${escapeHtml(billTo.companyName)}</strong>${[
        billTo.agency, billTo.contactName, billTo.billingAddress, billTo.email, billTo.phone,
      ].filter(Boolean).map(v => escapeHtml(String(v))).join("\n")}` : "<em>No client selected</em>"}</div>
    </div>
    ${refs ? `<div class="panel ref"><h2>Reference</h2><table class="kv">${refs}</table></div>` : ""}
  </div>

  <table class="items">
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-wrap"><table class="totals">${totals}</table></div>

  ${input.balanceDueCents <= 0 && input.totalCents > 0 && input.status !== "VOID" ? '<div class="stamp">Paid in full — thank you</div>' : ""}
  ${input.status === "VOID" ? '<div class="stamp void">Void — this invoice is not payable</div>' : ""}

  <div class="foot">
    ${input.paymentTerms ? `<div class="block"><div class="label">Payment terms</div><div class="body">${escapeHtml(input.paymentTerms)}</div></div>` : ""}
    ${input.paymentInstructions ? `<div class="block pay"><div class="label">Payment instructions</div><div class="body">${escapeHtml(input.paymentInstructions)}</div></div>` : ""}
    ${input.notes ? `<div class="block"><div class="label">Notes</div><div class="body">${escapeHtml(input.notes)}</div></div>` : ""}
  </div>

</body>
</html>`;
}
