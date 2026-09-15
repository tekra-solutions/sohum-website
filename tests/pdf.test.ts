import { describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { renderOfferHtml } from "@/lib/offers/render-html";
import { renderOfferPdf } from "@/lib/offers/pdf";

describe.skipIf(!process.env.PDF_SMOKE)("real Chromium offer PDF", () => {
  it("renders the branded letter while refusing scripts and external requests", async () => {
    let requests = 0;
    const server = createServer((_, response) => { requests++; response.end("external"); });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address() as { port: number };
      const probe = `http://127.0.0.1:${address.port}/probe`;
      const html = renderOfferHtml({ candidateName: "Ada Lovelace", jobTitle: "Principal Engineer",
        department: "Engineering", location: "Kansas City", employmentType: "FULL_TIME", remoteType: "HYBRID",
        startDate: new Date("2099-11-01"), expirationDate: new Date("2099-10-01"), annualSalaryCents: 16500000,
        benefitsSummary: "Medical, dental and vision insurance.", ptoSummary: "20 days annually.",
        templateBodyHtml: "<p>We are pleased to offer you this position at Sohum Systems.</p>" });
      // Historical stored HTML gets the same rendering protection as new templates.
      const pdf = await renderOfferPdf(html.replace("</body>", `<script>fetch('${probe}')</script><img src="${probe}" alt="" style="position:absolute;width:0;height:0"></body>`));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(10000);
      expect(requests).toBe(0);
      await writeFile("/tmp/sohum-review-offer.pdf", pdf);
    } finally { server.close(); }
  }, 30000);
  it("renders signed offers, promotion letters and multipage invoices with original branding", async () => {
    const { appendElectronicSignature } = await import("@/lib/documents/signature");
    const { renderPromotionHtml } = await import("@/lib/promotions/render-html");
    const { renderInvoiceHtml } = await import("@/lib/invoices/render-html");
    const { letterheadHeaderTemplate, letterheadFooterTemplate, pdfFooterTemplate } = await import("@/lib/documents/chrome");
    const { sohumLetterheadDataUri } = await import("@/lib/documents/logo");
    const terms = { jobTitle: "Principal Engineer", department: "Engineering", location: "Kansas City", employmentType: "FULL_TIME", remoteType: "HYBRID", annualSalaryCents: 16500000, expirationDate: new Date("2099-10-01"), templateBodyHtml: "<p>We are pleased to confirm your new role with Sohum Systems.</p>" };
    const signature = { name: "Ada Lovelace", email: "ada@example.com", value: "Ada Lovelace", signedAt: new Date("2026-09-14T12:00:00Z"), consentText: "I consent to sign this document electronically.", verificationMethod: "EMAIL_OTP", reference: "LOCAL-PDF-REVIEW-V1" };
    const offer = appendElectronicSignature(renderOfferHtml({ ...terms, candidateName: "Ada Lovelace", startDate: new Date("2099-11-01") }), signature);
    const promotion = appendElectronicSignature(renderPromotionHtml({ ...terms, employeeName: "Ada Lovelace", employeeEmail: signature.email, previousJobTitle: "Senior Engineer", previousDepartment: "Engineering", previousAnnualSalaryCents: 14500000, effectiveDate: new Date("2099-11-01") }), signature);
    const invoice = renderInvoiceHtml({ invoiceNumber: "SOH-2099-0042", status: "SENT", invoiceDate: new Date("2099-10-01"), dueDate: new Date("2099-11-01"), currency: "USD", billTo: { companyName: "Review Client", billingAddress: "123 Test Street, Kansas City, KS" }, references: { poNumber: "LOCAL-REVIEW" }, items: Array.from({ length: 45 }, (_, n) => ({ description: `Engineering service ${n + 1}`, quantityMilli: 1000, rateCents: 10000, amountCents: 10000 })), subtotalCents: 450000, discountCents: 0, taxCents: 0, additionalChargesCents: 0, totalCents: 450000, amountPaidCents: 0, balanceDueCents: 450000, taxRateBasisPoints: 0, paymentTerms: "Net 30", from: { legalName: "Sohum Systems LLC", billingAddress: "Kansas City, KS", email: "billing@sohum.invalid", phone: "" } });
    for (const [kind, html] of [["signed-offer", offer], ["signed-promotion", promotion], ["invoice", invoice]]) {
      const pdf = await renderOfferPdf(html, kind === "invoice" ? { footerTemplate: pdfFooterTemplate("SOH-2099-0042") } : { headerTemplate: letterheadHeaderTemplate(sohumLetterheadDataUri), footerTemplate: letterheadFooterTemplate() });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(10000);
      await writeFile(`/tmp/sohum-review-${kind}.pdf`, pdf);
    }
  }, 60000);

});
