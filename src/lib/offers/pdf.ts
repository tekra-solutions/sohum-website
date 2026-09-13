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

/**
 * Raised when the browser itself could not start.
 *
 * Distinguished from a rendering failure because the cause and the fix are
 * completely different: a launch failure is almost always a deployment problem
 * (the Chromium binary was not traced into this function's bundle), while a
 * render failure is a problem with the document. Callers surface different
 * messages for the two.
 */
export class PdfEngineError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "PdfEngineError";
  }
}

export async function renderOfferPdf(
  html: string,
  options?: { headerTemplate?: string; footerTemplate?: string; margin?: { top: string; bottom: string; left: string; right: string } },
): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch(await resolveLaunchOptions());
  } catch (error) {
    // The message Chromium gives here ("Failed to launch the browser process",
    // "spawn ENOENT", "Could not find Chromium") is meaningless to whoever is
    // reading the logs, so say what it actually means and where to look.
    throw new PdfEngineError(
      "The PDF engine could not start. On Vercel this means the Chromium binary " +
      "was not bundled with this function — check outputFileTracingIncludes in " +
      "next.config.ts covers this route. Locally, install Chrome or set " +
      "CHROME_EXECUTABLE_PATH.",
      error,
    );
  }
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
      headerTemplate: options?.headerTemplate ?? "<span></span>",
      footerTemplate: options?.footerTemplate ??
        '<div style="font-size:9px;width:100%;text-align:center;color:#5b6a80;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">' +
        'Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      // No default margin: the documents declare @page in documentBaseCss and
      // Chromium honours that. Passing one here as well meant the PDF options
      // and the stylesheet disagreed about the usable page height. A caller can
      // still override deliberately.
      ...(options?.margin ? { margin: options.margin } : {}),
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
