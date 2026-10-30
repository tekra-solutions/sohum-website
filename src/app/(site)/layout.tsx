import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Script from "next/script";
import { today } from "@/content/company";

/**
 * Marketing chrome.
 *
 * Lives here rather than in the root layout so /admin can render its own shell
 * without the public header and footer wrapping it.
 */
/**
 * Re-render public pages at most hourly, so date-driven facts (vehicle ordering
 * windows, credential validity, the footer year) follow the calendar without a
 * redeploy.
 */
export const revalidate = 3600;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header initialDay={today()} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      {/* OrchestrAI chat widget. Loads after the page is interactive. */}
      <Script id="orchestrai-config" strategy="afterInteractive">
        {`window.ORCHESTRAI_CONFIG = {
          widgetKey: 'wk_fab266797ee65b3ee414690a15dfab827c65338637397abc',
          position: 'bottom-right',
          apiUrl: 'https://orckai.app/api'
        };`}
      </Script>
      <Script src="https://orckai.app/orchestrai-widget.min.js" strategy="afterInteractive" />
    </>
  );
}
