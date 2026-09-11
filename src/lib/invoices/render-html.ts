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
import { site, contact } from "@/lib/site";
import { escapeHtml } from "@/lib/ats/policy";
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

  const totalRow = (label: string, value: string, strong = false) =>
    `<tr class="${strong ? "strong" : ""}"><td class="tl">${escapeHtml(label)}</td><td class="tv">${escapeHtml(value)}</td></tr>`;

  const totals = [
    totalRow("Subtotal", money(input.subtotalCents)),
    input.discountCents > 0 ? totalRow("Discount", `-${money(input.discountCents)}`) : "",
    input.taxCents > 0 ? totalRow(`Tax (${(input.taxRateBasisPoints / 100).toFixed(2)}%)`, money(input.taxCents)) : "",
    input.additionalChargesCents > 0 ? totalRow("Additional charges", money(input.additionalChargesCents)) : "",
    totalRow("Total", money(input.totalCents), true),
    input.amountPaidCents > 0 ? totalRow("Amount paid", `-${money(input.amountPaidCents)}`) : "",
    totalRow("Balance due", money(input.balanceDueCents), true),
  ].filter(Boolean).join("");

  const billTo = input.billTo;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${escapeHtml(input.invoiceNumber)}</title>
<style>
  @page { margin: 0.55in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1b2a5e; font-size: 12.5px; line-height: 1.55; margin: 0; padding: 0.3in; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .brand .flame { color: #e8622a; }
  .from { font-size: 11px; color: #5b6a80; margin-top: 4px; white-space: pre-line; }
  .title { text-align: right; }
  .title h1 { font-size: 26px; letter-spacing: 0.06em; margin: 0; color: #1b2a5e; }
  .title .number { font-size: 13px; font-weight: 600; margin-top: 4px; }
  .title .dates { font-size: 11px; color: #5b6a80; margin-top: 6px; }
  .panels { display: flex; gap: 28px; margin-top: 26px; }
  .panel { flex: 1; }
  h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #5b6a80;
    margin: 0 0 8px; padding-bottom: 5px; border-bottom: 1px solid #e7ebf1; }
  .party { font-size: 12.5px; white-space: pre-line; }
  .party strong { display: block; font-size: 13.5px; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 3px 0; vertical-align: top; font-size: 11.5px; }
  table.kv td.k { color: #5b6a80; width: 46%; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 26px; }
  table.items thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #5b6a80; text-align: left; padding: 8px 6px; border-bottom: 1.5px solid #1b2a5e; }
  table.items thead th.num, table.items td.num { text-align: right; }
  table.items td { padding: 9px 6px; border-bottom: 1px solid #eef1f5; vertical-align: top; }
  table.items td.desc { width: 55%; }
  table.items .meta { display: block; font-size: 10.5px; color: #5b6a80; margin-top: 2px; }
  /* Keep a row intact across a page break and repeat the header. */
  table.items tr { page-break-inside: avoid; }
  table.items thead { display: table-header-group; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 18px; page-break-inside: avoid; }
  table.totals { width: 46%; border-collapse: collapse; }
  table.totals td { padding: 5px 6px; font-size: 12px; }
  table.totals td.tv { text-align: right; font-variant-numeric: tabular-nums; }
  table.totals tr.strong td { font-weight: 700; border-top: 1px solid #1b2a5e; font-size: 13px; }
  .foot { margin-top: 28px; page-break-inside: avoid; }
  .foot .block { margin-top: 14px; }
  .foot .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #5b6a80; }
  .foot .body { white-space: pre-line; margin-top: 4px; }
  .paid { margin-top: 18px; padding: 9px 12px; border: 1px solid #1e7a4d; color: #14603b;
    font-weight: 600; text-align: center; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; }
  .void { border-color: #8a95a8; color: #5b6a80; }
  .legal { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e7ebf1;
    font-size: 10px; color: #8a95a8; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand"><span class="flame">Sohum</span> Systems</div>
      <div class="from">${escapeHtml(input.from.legalName)}
${escapeHtml(input.from.billingAddress)}
${escapeHtml(input.from.phone)} · ${escapeHtml(input.from.email)}${input.from.taxId ? `\nTax ID ${escapeHtml(input.from.taxId)}` : ""}</div>
    </div>
    <div class="title">
      <h1>INVOICE</h1>
      <div class="number">${escapeHtml(input.invoiceNumber)}</div>
      <div class="dates">Issued ${fmtDate(input.invoiceDate)}<br>Due ${fmtDate(input.dueDate)}</div>
    </div>
  </div>

  <div class="panels">
    <div class="panel">
      <h2>Bill to</h2>
      <div class="party">${billTo ? `<strong>${escapeHtml(billTo.companyName)}</strong>${[
        billTo.agency, billTo.contactName, billTo.billingAddress, billTo.email, billTo.phone,
      ].filter(Boolean).map(v => escapeHtml(String(v))).join("\n")}` : "<em>No client selected</em>"}</div>
    </div>
    ${refs ? `<div class="panel"><h2>Reference</h2><table class="kv">${refs}</table></div>` : ""}
  </div>

  <table class="items">
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-wrap"><table class="totals">${totals}</table></div>

  ${input.balanceDueCents <= 0 && input.totalCents > 0 && input.status !== "VOID" ? '<div class="paid">Paid in full — thank you</div>' : ""}
  ${input.status === "VOID" ? '<div class="paid void">Void — this invoice is not payable</div>' : ""}

  <div class="foot">
    ${input.paymentTerms ? `<div class="block"><div class="label">Payment terms</div><div class="body">${escapeHtml(input.paymentTerms)}</div></div>` : ""}
    ${input.paymentInstructions ? `<div class="block"><div class="label">Payment instructions</div><div class="body">${escapeHtml(input.paymentInstructions)}</div></div>` : ""}
    ${input.notes ? `<div class="block"><div class="label">Notes</div><div class="body">${escapeHtml(input.notes)}</div></div>` : ""}
  </div>

  <div class="legal">${escapeHtml(site.legalName)} · ${escapeHtml(contact.address)} · Invoice ${escapeHtml(input.invoiceNumber)}</div>
</body>
</html>`;
}
