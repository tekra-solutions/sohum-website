import type { Metadata } from "next";
import { site, contact } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "Invoice", template: "%s · Sohum Systems" },
  robots: { index: false, follow: false },
};

/** Minimal branded chrome for the client-facing invoice — no marketing nav,
 *  no admin sidebar. */
export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper-100">
      <header className="border-b border-paper-300 bg-white px-5 py-4 sm:px-8">
        <span className="font-[family-name:var(--font-display)] text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink-900">
          <span className="text-flame-600">Sohum</span> Systems
        </span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">{children}</main>
      <footer className="border-t border-paper-300 px-5 py-4 text-center text-[0.6875rem] text-graphite-500 sm:px-8">
        {site.legalName} · {contact.address}
      </footer>
    </div>
  );
}
