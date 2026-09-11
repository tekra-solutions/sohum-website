/**
 * Renders offer HTML (from render-html.ts) to a PDF buffer via headless
 * Chromium. Deliberately does not accept a URL — the caller always has the
 * exact HTML string in hand (it's what gets frozen into offer_versions), so
 * there is never a second network hop that could fetch something else.
 */
import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * @sparticuz/chromium bundles a Linux x64 binary meant for AWS
 * Lambda/Vercel's serverless runtime — it does not run on a developer's
 * mac/Windows machine. In development, use a local Chrome/Chromium install
 * instead (auto-detected, or pointed at via CHROME_EXECUTABLE_PATH);
 * production always uses the bundled binary.
 */
async function resolveLaunchOptions() {
  if (process.platform === "linux" && !process.env.CHROME_EXECUTABLE_PATH) {
    return { args: chromium.args, executablePath: await chromium.executablePath(), headless: true };
  }
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((p): p is string => Boolean(p));
  const { existsSync } = await import("node:fs");
  const local = candidates.find(existsSync);
  if (local) return { executablePath: local, headless: true };
  // No local browser found — fall back to the bundled binary, which will
  // only work if this happens to be a Linux dev environment.
  return { args: chromium.args, executablePath: await chromium.executablePath(), headless: true };
}

export async function renderOfferPdf(
  html: string,
  options?: { footerTemplate?: string; margin?: { top: string; bottom: string; left: string; right: string } },
): Promise<Buffer> {
  const browser = await puppeteer.launch(await resolveLaunchOptions());
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    // Block every network fetch — a document must never be able to phone home
    // or pull in remote content. data: URIs are allowed through so an inlined
    // logo still renders; they carry their own bytes and reach nothing
    // external. Anything else (http, https, file) is aborted.
    page.on("request", request => {
      if (request.url().startsWith("data:")) void request.continue();
      else void request.abort();
    });
    page.setDefaultNavigationTimeout(15_000);
    await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: options?.footerTemplate ??
        '<div style="font-size:9px;width:100%;text-align:center;color:#5b6a80;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">' +
        'Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: options?.margin ?? { top: "0.6in", bottom: "0.6in", left: "0.6in", right: "0.6in" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
