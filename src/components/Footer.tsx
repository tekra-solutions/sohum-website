import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowUpRight } from "./icons";
import { Logo, LogoMark } from "./Logo";
import { capabilities } from "@/lib/capabilities";
import { contact, getVisibleCredentials, procurement, site, today } from "@/content/company";

const company = [
  { href: "/about", label: "About" },
  { href: "/about#leadership", label: "Leadership" },
  { href: "/federal", label: "Federal mission" },
  { href: "/contract-vehicles", label: "Contract vehicles" },
  { href: "/careers", label: "Careers" },
  { href: "/locations", label: "Locations" },
];

const heading = "font-brand text-[0.75rem] font-bold uppercase tracking-[.1em] text-white/50";
const link = "inline-flex min-h-8 items-center text-[0.9375rem] text-white/70 transition-colors hover:text-white";

/**
 * Site footer. Kept deliberately calm: brand and identifiers, three short
 * columns, one row of credentials. Detailed procurement data (NAICS, contract
 * numbers, fax) lives on the capability statement and contact pages.
 */
export function Footer() {
  const day = today();
  const year = Number(day.slice(0, 4));
  const credentials = getVisibleCredentials(day);

  return (
    <footer className="relative isolate overflow-hidden bg-[#05070d] text-white">
      <LogoMark tone="light" className="pointer-events-none absolute -right-40 top-10 -z-10 size-[40rem] opacity-[0.035] sm:-right-24" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame-500/50 to-transparent" />

      <div className="container-page">
        <div className="grid gap-12 pb-12 pt-16 lg:grid-cols-[1.15fr_2fr] lg:gap-16 lg:pt-20">
          <div>
            <Link href="/" className="inline-block rounded" aria-label="Sohum Systems, home">
              <Logo tone="light" size="lg" />
            </Link>
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-[1.7] text-white/60">
              A CMMI Level 3 appraised small business engineering and sustaining the software, cloud, data, and GIS
              systems federal agencies depend on, since {site.founded}.
            </p>
            <p className="mt-5 font-tech text-[0.8125rem] text-white/55">
              UEI {procurement.uei} <span className="text-white/25">·</span> CAGE {procurement.cage}
            </p>
            <Link
              href="/capability-statement"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 font-brand text-[0.875rem] font-bold transition-colors hover:border-white hover:bg-white hover:text-ink-950"
            >
              Capability statement <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-[1.3fr_1fr_1.1fr]">
            <nav aria-label="Capabilities">
              <p className={heading}>Capabilities</p>
              <ul className="mt-4">
                {capabilities.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/capabilities/${c.slug}`} className={link}>
                      {c.short}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/capabilities" className="inline-flex min-h-8 items-center gap-1 text-[0.9375rem] font-semibold text-flame-400 hover:text-white">
                    All {capabilities.length} capabilities <ArrowUpRight className="size-3.5" />
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Company">
              <p className={heading}>Company</p>
              <ul className="mt-4">
                {company.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="col-span-2 sm:col-span-1">
              <p className={heading}>Contact</p>
              <address className="mt-4 not-italic">
                <p className="text-[0.9375rem] leading-[1.6] text-white/70">
                  {contact.street}
                  <br />
                  {contact.city}, {contact.state} {contact.zip}
                </p>
                <ul className="mt-3">
                  <li>
                    <a href={`tel:${contact.phoneHref}`} className={link}>
                      {contact.phone}
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${contact.emailGeneral}`} className={link}>
                      {contact.emailGeneral}
                    </a>
                  </li>
                  <li>
                    <Link href="/contact" className="inline-flex min-h-8 items-center gap-1 text-[0.9375rem] font-semibold text-flame-400 hover:text-white">
                      Send a message <ArrowUpRight className="size-3.5" />
                    </Link>
                  </li>
                </ul>
              </address>
            </div>
          </div>
        </div>

        {/* ---- Credentials ---- */}
        <div className="flex flex-col gap-5 border-t border-white/10 py-8 lg:flex-row lg:items-center lg:justify-between">
          <p className={heading}>Appraised &amp; certified</p>
          {/* Badge art carries a white background, so each sits on its own white plate. */}
          <ul className="grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap">
            {credentials.map((c) => (
              <li key={c.short} className="flex h-14 items-center justify-center rounded-lg bg-white px-2 sm:w-[6.75rem]" title={c.name}>
                <Image src={c.badge} alt={c.name} width={544} height={340} sizes="120px" className="h-10 w-auto max-w-full object-contain" />
              </li>
            ))}
          </ul>
        </div>

        {/* ---- Legal ---- */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-7 text-[0.8125rem] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.legalName}. All rights reserved. Equal opportunity employer.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="inline-flex min-h-8 items-center hover:text-white">Privacy</Link>
            <Link href="/terms" className="inline-flex min-h-8 items-center hover:text-white">Terms</Link>
            <Link href="/accessibility" className="inline-flex min-h-8 items-center hover:text-white">Accessibility</Link>
            <a href="#main" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-white/75 hover:border-white hover:text-white">
              Back to top <ArrowUp className="size-3.5" />
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
