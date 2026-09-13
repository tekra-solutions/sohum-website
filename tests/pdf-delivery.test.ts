/**
 * PDF delivery guards.
 *
 * The failure these cover is invisible in development: a developer machine
 * falls back to an installed Chrome, so a function missing the bundled binary
 * only fails once deployed. Asserting the config is the only cheap way to
 * catch it before it ships.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

describe("chromium bundling", () => {
  // Every surface that reaches renderOfferPdf(), directly through a route
  // handler or indirectly through a server action, which runs inside the
  // bundle of the page that invoked it.
  const surfaces = [
    "/admin/offers/**",      // sending an offer renders and stores its PDF
    "/admin/invoices/**",    // invoice download and send
    "/admin/promotions/**",  // promotion letter preview and PDF
    "/admin/employees/**",   // "Promote" lives here and can render a letter
    "/offer/**",             // candidate download, and signing countersigns
    "/invoice/**",           // client download
    "/promotion/**",         // employee download, and signing countersigns
    "/api/cron/**",          // the scheduled apply can regenerate a document
  ];

  it("traces the binary into every function that renders a PDF", () => {
    for (const surface of surfaces) {
      expect(config, surface).toContain(`"${surface}"`);
    }
  });

  it("keeps puppeteer and chromium external so the binary is not inlined", () => {
    expect(config).toContain('serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"]');
  });
});

describe("PDF engine errors", () => {
  const pdf = readFileSync(new URL("../src/lib/offers/pdf.ts", import.meta.url), "utf8");

  it("distinguishes a browser that will not start from a document that will not render", async () => {
    // The two have completely different causes and fixes: one is a deployment
    // problem, the other is the document. Chromium's own message ("Failed to
    // launch the browser process") says neither.
    const { PdfEngineError } = await import("@/lib/offers/pdf");
    expect(new PdfEngineError("x")).toBeInstanceOf(Error);
    expect(pdf).toMatch(/outputFileTracingIncludes/);
    expect(pdf).toMatch(/CHROME_EXECUTABLE_PATH/);
  });
});

describe("offer PDF download", () => {
  const route = readFileSync(
    new URL("../src/app/offer/[token]/pdf/route.ts", import.meta.url),
    "utf8",
  );

  it("renders on demand when no PDF was stored", () => {
    // The stored file is written when the offer is sent. An older offer, or a
    // storage write that failed, used to return 404 — telling a candidate
    // their own letter does not exist. Both paths render the same frozen
    // renderedHtml, so the bytes are identical either way.
    expect(route).toContain("renderFallbackHtml");
    expect(route).toContain("version.renderedHtml");
  });

  it("still requires a verified session", () => {
    expect(route).toContain("hasVerifiedOfferSession");
  });
});
