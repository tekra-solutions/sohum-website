import type { NextConfig } from "next";

/** The bundled Linux Chromium used for PDF rendering in production. */
const CHROMIUM_BIN = "./node_modules/@sparticuz/chromium/bin/**";

const nextConfig: NextConfig = {
  // Pin the workspace root: a package-lock.json in the parent directory would
  // otherwise be picked up and emit a warning during build.
  turbopack: { root: __dirname },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  /**
   * Bundle the headless Chromium binary with every function that renders a PDF.
   *
   * This previously listed only "/admin/offers/*", but PDFs are produced from
   * far more than that: the invoice download and client-facing invoice routes,
   * the candidate and employee signing flows (which generate the countersigned
   * document on acceptance), the promotion screens, and the scheduled job. A
   * function without the binary traced throws "Could not find Chromium" at
   * runtime on Vercel — which never shows up locally, because a developer
   * machine falls back to the installed Chrome.
   *
   * Server actions run inside the bundle of the *page* that invokes them, so
   * the page paths matter as much as the route paths.
   */
  outputFileTracingIncludes: {
    "/admin/offers/**": [CHROMIUM_BIN],
    "/admin/invoices/**": [CHROMIUM_BIN],
    "/admin/promotions/**": [CHROMIUM_BIN],
    "/admin/employees/**": [CHROMIUM_BIN],
    "/offer/**": [CHROMIUM_BIN],
    "/invoice/**": [CHROMIUM_BIN],
    "/promotion/**": [CHROMIUM_BIN],
    "/api/cron/**": [CHROMIUM_BIN],
  },
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
    // Ensures icon imports stay per-icon rather than pulling the barrel file.
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      { source: "/offer/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
