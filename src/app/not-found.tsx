import Link from "next/link";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { capabilities } from "@/lib/capabilities";

export default function NotFound() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-55" />
      <div className="container-page relative flex min-h-[70vh] flex-col justify-center py-24">
        <div className="max-w-2xl">
          <Eyebrow tone="light">Error 404</Eyebrow>
          <h1 className="mt-6 text-[2.25rem] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[3rem]">
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
            <ButtonLink
              href="/contact"
              variant="secondary"
              className="border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.09]"
            >
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
                    className="text-[0.9375rem] text-white/65 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-signal-300"
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
  );
}
