import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { today } from "@/content/company";
import { capabilities } from "@/lib/capabilities";

/**
 * 404 for unmatched URLs and for notFound() anywhere in the app. It renders
 * outside the public site layout, so it brings its own header and footer.
 */
export default function NotFound() {
  return (
    <>
      <Header initialDay={today()} />
      <main id="main" className="flex flex-1 flex-col">
        <section className="relative isolate flex flex-1 flex-col overflow-hidden bg-ink-950 text-white">
          <div className="container-page relative flex min-h-[70vh] flex-col justify-center py-24">
            <div className="max-w-2xl">
              <Eyebrow tone="light">Error 404</Eyebrow>
              <h1 className="mt-6 text-[2.25rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[3rem]">
                That page is not here.
              </h1>
              <p className="mt-6 text-[1.0625rem] leading-[1.7] text-white/60">
                The link may be out of date, or the page may have moved. Here are the places most people
                are looking for.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/" variant="onDark">
                  Back to home
                </ButtonLink>
                <ButtonLink href="/contact" variant="outlineDark">
                  Contact us
                </ButtonLink>
              </div>

              <nav aria-label="Suggested pages" className="mt-14 border-t border-white/12 pt-8">
                <p className="eyebrow text-white/40">Popular pages</p>
                <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {[
                    { href: "/capabilities", label: "All capabilities" },
                    { href: "/contract-vehicles", label: "Contract vehicles" },
                    { href: "/federal", label: "Federal mission focus" },
                    { href: "/about", label: "About the company" },
                    { href: "/careers", label: "Careers" },
                    ...capabilities.slice(0, 3).map((c) => ({
                      href: `/capabilities/${c.slug}`,
                      label: c.name,
                    })),
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-9 items-center text-[0.9375rem] text-white/70 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-flame-400"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
