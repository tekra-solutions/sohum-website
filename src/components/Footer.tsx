import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowUpRight, Mail, MapPin, Phone, Printer } from "@/components/icons";
import { Logo, LogoMark } from "./Logo";
import { capabilities } from "@/lib/capabilities";
import {
  contact,
  getActiveVehicles,
  getVisibleCredentials,
  naics,
  procurement,
  site,
  today,
} from "@/content/company";

const company = [
  { href: "/about", label: "About" },
  { href: "/about#leadership", label: "Leadership" },
  { href: "/federal", label: "Federal mission" },
  { href: "/careers", label: "Careers" },
  { href: "/locations", label: "Locations" },
  { href: "/contact", label: "Contact" },
];

const heading = "font-tech text-[0.6875rem] uppercase tracking-[.14em] text-white/40";
const link = "text-[0.9375rem] text-white/65 transition-colors hover:text-white";

export function Footer() {
  const day = today();
  const year = Number(day.slice(0, 4));
  const credentials = getVisibleCredentials(day);
  const vehicles = getActiveVehicles(day);

  return (
    <footer className="relative isolate overflow-hidden bg-[#05070d] text-white">
      {/* Chakra watermark, cropped off the right edge. */}
      <LogoMark
        tone="light"
        className="pointer-events-none absolute -right-40 top-10 -z-10 size-[44rem] opacity-[0.035] sm:-right-24"
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame-500/50 to-transparent" />

      <div className="container-page">

        {/* ---- Directory ---- */}
        <div className="grid gap-x-10 gap-y-12 pb-14 pt-16 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_0.8fr_1.1fr]">
          <div>
            <Logo tone="light" size="lg" />
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-[1.7] text-white/55">
              A small business appraised at CMMI Level 3, engineering and sustaining the software, cloud, data, and GIS
              systems federal agencies depend on, since {site.founded}.
            </p>
            <dl className="mt-7 grid max-w-sm grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {[
                ["UEI", procurement.uei],
                ["CAGE", procurement.cage],
                ["Primary NAICS", procurement.primaryNaics],
                ["Size", procurement.businessSize],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#05070d] px-4 py-3">
                  <dt className={heading}>{k}</dt>
                  <dd className="mt-1 font-tech text-[0.8125rem] text-white/85">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <nav aria-label="Capabilities">
            <p className={heading}>Capabilities</p>
            <ul className="mt-5 space-y-2.5">
              {capabilities.slice(0, 7).map((c) => (
                <li key={c.slug}>
                  <Link href={`/capabilities/${c.slug}`} className={link}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/capabilities" className="mt-4 inline-flex items-center gap-1 text-[0.875rem] font-semibold text-flame-400 hover:text-white">
              All {capabilities.length} capabilities <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </nav>

          <nav aria-label="Company">
            <p className={heading}>Company</p>
            <ul className="mt-5 space-y-2.5">
              {company.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className={heading}>Buy from us</p>
            <ul className="mt-5 space-y-3">
              {vehicles.map((v) => (
                <li key={v.slug}>
                  <Link href={`/contract-vehicles#${v.slug}`} className="group block">
                    <span className="block text-[0.9375rem] text-white/80 transition-colors group-hover:text-white">{v.name}</span>
                    <span className="font-tech text-[0.75rem] text-white/40">{v.number}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/capability-statement"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-[0.8125rem] font-semibold transition-colors hover:border-white hover:bg-white hover:text-ink-950"
            >
              Capability statement <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>

            <p className={`${heading} mt-9`}>Contact</p>
            <ul className="mt-4 space-y-2.5 text-[0.875rem] text-white/65">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                <span>
                  {contact.street}
                  <br />
                  {contact.city}, {contact.state} {contact.zip}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                <a href={`tel:${contact.phoneHref}`} className="hover:text-white">{contact.phone}</a>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                <a href={`mailto:${contact.emailGeneral}`} className="hover:text-white">{contact.emailGeneral}</a>
              </li>
              <li className="flex gap-2.5 text-white/45">
                <Printer className="mt-0.5 size-4 shrink-0 text-white/30" aria-hidden="true" />
                Fax {contact.fax}
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Credentials and NAICS ---- */}
        <div className="grid gap-10 border-t border-white/10 py-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16">
          <div>
            <p className={heading}>Appraisals &amp; certifications</p>
            {/* Badge art carries a white background, so each sits on its own white plate. */}
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {credentials.map((c) => (
                <li key={c.short} className="flex h-14 items-center justify-center rounded-lg bg-white px-1.5" title={c.name}>
                  <Image src={c.badge} alt={c.name} width={544} height={340} sizes="120px" className="h-9 w-auto max-w-full object-contain" />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={heading}>NAICS codes</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {naics.map((n) => (
                <li
                  key={n.code}
                  title={n.label}
                  className={`rounded-full border px-3 py-1 font-tech text-[0.75rem] ${n.primary ? "border-flame-500/60 text-flame-400" : "border-white/15 text-white/60"}`}
                >
                  {n.code} <span className="font-sans text-white/40">· {n.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---- Legal ---- */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-7 text-[0.8125rem] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.legalName}. All rights reserved. Equal opportunity employer.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/accessibility" className="hover:text-white">Accessibility</Link>
            <a href="#main" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-white/70 hover:border-white hover:text-white">
              Back to top <ArrowUp className="size-3.5" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
