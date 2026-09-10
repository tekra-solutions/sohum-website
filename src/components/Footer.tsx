import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, Printer } from "lucide-react";
import { Logo } from "./Logo";
import { capabilities } from "@/lib/capabilities";
import { contact, credentials, identifiers, naics, site } from "@/lib/site";

const columns = [
  {
    heading: "Capabilities",
    links: capabilities.slice(0, 6).map((c) => ({ href: `/capabilities/${c.slug}`, label: c.short })),
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/about#leadership", label: "Leadership" },
      { href: "/federal", label: "Federal Mission" },
      { href: "/contract-vehicles", label: "Contract Vehicles" },
      { href: "/careers", label: "Careers" },
      { href: "/locations", label: "Locations" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink-950 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-fine opacity-[0.5]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame-500/45 to-transparent"
      />

      <div className="container-page relative">
        {/* ---- Procurement quick-reference: the data a CO needs, above the links ---- */}
        <div className="grid gap-x-12 gap-y-10 border-b border-white/10 py-14 lg:grid-cols-[1.1fr_1fr_1fr]">
          <div>
            <Logo tone="light" size="lg" />
            <p className="mt-5 max-w-sm text-[0.9375rem] leading-[1.7] text-white/55">
              An SBA-certified 8(a) small business appraised at CMMI Level 3, engineering and
              sustaining the software, cloud, and data systems federal agencies depend on.
            </p>
            <dl className="mt-7 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3">
              {identifiers.map((id) => (
                <div key={id.label}>
                  <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/40">
                    {id.label}
                  </dt>
                  <dd className="mt-1 font-mono text-[0.8125rem] text-white/85">{id.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className="eyebrow text-white/40">{col.heading}</p>
              <ul className="mt-5 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-[0.9375rem] text-white/65 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {col.heading === "Capabilities" && (
                <Link
                  href="/capabilities"
                  className="mt-4 inline-block text-[0.8125rem] font-medium text-flame-400 transition-colors hover:text-white"
                >
                  All 11 capabilities →
                </Link>
              )}
            </nav>
          ))}
        </div>

        {/* ---- Contact + NAICS ---- */}
        <div className="grid gap-x-12 gap-y-10 border-b border-white/10 py-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <p className="eyebrow text-white/40">Contact</p>
            <ul className="mt-5 space-y-3.5 text-[0.9375rem]">
              <li className="flex gap-3 text-white/65">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                <span>
                  {contact.street}
                  <br />
                  {contact.city}, {contact.state} {contact.zip}
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                <a
                  href={`tel:${contact.phoneHref}`}
                  className="font-mono text-[0.875rem] text-white/65 transition-colors hover:text-white"
                >
                  {contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                <a
                  href={`mailto:${contact.emailGeneral}`}
                  className="text-white/65 transition-colors hover:text-white"
                >
                  {contact.emailGeneral}
                </a>
              </li>
              <li className="flex gap-3 text-white/45">
                <Printer className="mt-0.5 size-4 shrink-0 text-white/30" aria-hidden="true" />
                <span className="font-mono text-[0.875rem]">Fax {contact.fax}</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-white/40">NAICS codes</p>
            <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {naics.map((n) => (
                <li key={n.code} className="flex gap-3 text-[0.8125rem] leading-relaxed">
                  <span className="font-mono text-white/85 tabular-nums">{n.code}</span>
                  <span className="text-white/50">
                    {n.label}
                    {n.primary && <span className="text-flame-400"> · primary</span>}
                  </span>
                </li>
              ))}
            </ul>

            <p className="eyebrow mt-9 text-white/40">Appraisals &amp; certifications</p>
            {/* Badge art carries a white background, so each sits on its own
                white plate rather than directly on the dark footer. */}
            {/* Explicit grid rather than flex-wrap: with six badges, wrapping
                left a single orphan on its own row at most widths. */}
            <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
              {credentials.map((c) => (
                <li
                  key={c.short}
                  className="flex h-16 items-center justify-center rounded-[3px] bg-white px-2"
                  title={c.name}
                >
                  <Image
                    src={c.badge}
                    alt={c.name}
                    width={544}
                    height={340}
                    sizes="160px"
                    className="h-[2.75rem] w-auto max-w-full object-contain"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-8 text-[0.8125rem] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.legalName}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-white/80">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white/80">
              Terms
            </Link>
            <Link href="/accessibility" className="transition-colors hover:text-white/80">
              Accessibility
            </Link>
            <span className="text-white/25">Equal opportunity employer</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
