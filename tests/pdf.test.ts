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
});
