/**
 * Shared print-document chrome for the offer letter and the invoice.
 *
 * Both documents are standalone printable HTML rendered by the same headless
 * Chromium, so the typography, page geometry and branded header live here
 * once rather than being restated (and drifting) in each renderer.
 */
import { site, contact } from "@/lib/site";
import { escapeHtml } from "@/lib/ats/policy";
import { sohumLogoDataUri } from "./logo";

/**
 * Centered masthead: company name, optional logo, then company/legal detail
 * in smaller type, then the document title.
 *
 * The logo is intentionally constrained by `max-height` with `width:auto` so
 * it can never stretch — aspect ratio is preserved whatever the source image
 * is, and a missing logo simply collapses to the wordmark.
 */
export function documentHeader(opts: {
  title: string;
  /** Data: URI for the mark. Defaults to the Sohum Systems logo, so a caller
   *  cannot accidentally issue an unbranded document — which is what happened
   *  while this was purely opt-in. Remote URLs are not usable: the PDF
   *  renderer aborts every external request, so an http(s) logo renders blank.
   *  Pass `null` explicitly for a deliberately unbranded document. */
  logoDataUri?: string | null;
  legalName?: string | null;
  address?: string | null;
  contactLine?: string | null;
  /** Small right-aligned reference (e.g. an invoice number) under the title. */
  subtitle?: string | null;
  /** Omit the company/legal detail lines under the wordmark. The invoice uses
   *  this because it repeats that detail in its own FROM panel. */
  compact?: boolean;
}) {
  const logo = opts.logoDataUri === null ? null : (opts.logoDataUri || sohumLogoDataUri);
  const legalName = opts.legalName || site.legalName;
  const address = opts.address || contact.address;
  const contactLine = opts.contactLine || `${contact.phone} · ${contact.emailGeneral}`;
  const org = opts.compact
    ? ""
    : `<div class="doc-org">${escapeHtml(legalName)}</div>
  <div class="doc-org">${escapeHtml(address)}</div>
  <div class="doc-org">${escapeHtml(contactLine)}</div>`;
  return `<header class="doc-header">
  ${logo ? `<img class="doc-logo" src="${logo}" alt="">` : ""}
  <div class="doc-wordmark"><span class="flame">SOHUM</span> SYSTEMS</div>
  ${org}
  <h1 class="doc-title">${escapeHtml(opts.title)}</h1>
  ${opts.subtitle ? `<div class="doc-subtitle">${escapeHtml(opts.subtitle)}</div>` : ""}
</header>`;
}

/**
 * Base stylesheet for both documents. Serif body copy at 11.5pt with generous
 * leading reads as a business document rather than a web page, and the print
 * rules keep headings attached to their content across page breaks.
 */
export const documentBaseCss = `
  /* Page geometry is declared here and NOWHERE else. pdf.ts used to pass its
     own 0.6in margin to page.pdf() while this rule said 0.7in; Chromium honours
     the CSS, so the two silently disagreed and the usable height was never what
     the PDF options claimed. renderOfferPdf() now sends no margin at all and
     defers to this rule, so on-screen preview and PDF share one geometry. */
  @page { size: Letter; margin: 0.62in; }
  * { box-sizing: border-box; }
  body {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    color: #16233f; font-size: 10.5pt; line-height: 1.5; margin: 0; padding: 0;
  }
  .doc-header { text-align: center; margin: 0 0 20px; }
  .doc-logo { display: block; margin: 0 auto 10px; max-height: 56px; width: auto; }
  .doc-wordmark {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 18pt; font-weight: 700; letter-spacing: 0.15em;
    color: #16233f; line-height: 1.1;
  }
  .doc-wordmark .flame { color: #e8622a; }
  .doc-org {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 8.5pt; color: #5b6a80; line-height: 1.5; letter-spacing: 0.01em;
  }
  .doc-org:first-of-type { margin-top: 7px; }
  .doc-title {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 12.5pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
    margin: 15px 0 0; padding-top: 11px; border-top: 1.5px solid #16233f; color: #16233f;
  }
  .doc-subtitle {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 10pt; color: #5b6a80; margin-top: 5px; letter-spacing: 0.04em;
  }
  h2 {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 9.5pt; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
    color: #16233f; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #d9dfe8;
  }
  p { margin: 0 0 9px; }
  table.kv { width: 100%; border-collapse: collapse; margin: 0 0 6px; }
  table.kv td { padding: 4px 0; vertical-align: top; border-bottom: 1px solid #eef1f5; }
  table.kv tr:last-child td { border-bottom: 0; }
  table.kv td.k {
    width: 40%; color: #5b6a80; font-size: 8.8pt; letter-spacing: 0.02em;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  table.kv td.v { width: 60%; font-weight: 600; }
  .muted { color: #5b6a80; }
  .small { font-size: 9pt; }
  /* Keep a heading with what follows it, and never split a row or a
     signature/acknowledgement block across a page boundary. */
  h2 { break-after: avoid; page-break-after: avoid; }
  tr, .no-break { break-inside: avoid; page-break-inside: avoid; }
  td, p, .body-copy { overflow-wrap: anywhere; }
  .page-break { break-before: page; page-break-before: always; }
  .legal-note {
    margin-top: 14px; padding: 10px 13px; border: 1px solid #d9dfe8; background: #f7f8fa;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 8.5pt; color: #5b6a80; line-height: 1.5;
  }
`;

/** Footer template for page numbering, passed to Chromium's page.pdf(). */
export function pdfFooterTemplate(reference: string) {
  return `<div style="font-size:8pt;width:100%;padding:0 0.7in;color:#5b6a80;
    font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:flex;justify-content:space-between;">
    <span>${escapeHtml(reference)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
}
