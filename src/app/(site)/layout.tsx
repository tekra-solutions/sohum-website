import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/**
 * Marketing chrome.
 *
 * Lives here rather than in the root layout so /admin can render its own shell
 * without the public header and footer wrapping it.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
