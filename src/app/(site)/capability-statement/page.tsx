import type { Metadata } from "next";
import { capabilities, pillars } from "@/lib/capabilities";
import {
  businessDevelopment,
  contact,
  currentAwards,
  formatDate,
  getActiveVehicles,
  getVisibleCredentials,
  naics,
  pastPerformance,
  procurement,
  site,
  socioeconomic,
  today,
} from "@/content/company";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = {
  title: "Capability Statement",
  description: `${site.legalName} capability statement: UEI ${procurement.uei}, CAGE ${procurement.cage}, NAICS, contract vehicles, certifications, and past performance.`,
  alternates: { canonical: "/capability-statement" },
};

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-ink-900 pb-1 font-sans text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-900">
      {children}
    </h2>
  );
}

/**
 * One-page capability statement built from content/company.ts, so it always
 * matches the site. Printing hides the site chrome (see `print:` utilities on
 * the layout pieces) and yields a clean Letter-size PDF.
 */
export default function CapabilityStatementPage() {
  const day = today();
  const vehicles = getActiveVehicles(day);
  const credentials = getVisibleCredentials(day);
  const differentiators = [
    "CMMI Level 3 appraised for Development and for Services",
    "ISO 9001, ISO/IEC 20000-1 and ISO/IEC 27001 certified",
    "PMI, GISCI, Esri, Oracle and AWS certified practitioners",
    "Lean structure: the people who scope the work deliver it",
  ];

  return (
    <div className="bg-paper-100 py-10 print:bg-white print:py-0">
      <div className="container-page mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-[0.875rem] text-graphite-600">Generated from current company records · {formatDate(day)}</p>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[8.5in] bg-white p-10 text-[0.8125rem] leading-snug text-ink-900 shadow-[var(--shadow-lift)] print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-flame-500 pb-4">
          <div>
            <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">{site.legalName}</h1>
            <p className="mt-2 text-[0.9375rem] text-graphite-600">Capability statement</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[0.75rem]">
            <dt className="text-graphite-500">UEI</dt>
            <dd>{procurement.uei}</dd>
            <dt className="text-graphite-500">CAGE</dt>
            <dd>{procurement.cage}</dd>
            <dt className="text-graphite-500">Founded</dt>
            <dd>{site.founded}</dd>
          </dl>
        </header>

        <p className="mt-4 text-[0.9375rem] leading-relaxed">
          {site.description}
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-[1.4fr_1fr] print:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section>
              <Heading>Core competencies</Heading>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                {pillars.map((p) => (
                  <div key={p.id}>
                    <p className="font-semibold">{p.label}</p>
                    <ul className="mt-0.5 text-graphite-700">
                      {capabilities
                        .filter((c) => c.pillar === p.id)
                        .map((c) => (
                          <li key={c.slug}>{c.name}</li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <Heading>Past performance</Heading>
              <ul className="mt-2 space-y-2">
                {pastPerformance
                  .filter((p) => p.contract)
                  .map((p) => (
                    <li key={p.id}>
                      <p className="font-semibold">
                        {p.agency} — {p.name}
                      </p>
                      <p className="text-graphite-700">
                        {p.work.join("; ")}. {p.contract}, {p.period}.
                      </p>
                    </li>
                  ))}
                {currentAwards.map((a) => (
                  <li key={a.order}>
                    <p className="font-semibold">{a.agency}</p>
                    <p className="text-graphite-700">
                      {a.work}. Order {a.order} on {a.vehicle}, {formatDate(a.start)} – {formatDate(a.end)}.
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <Heading>Differentiators</Heading>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-graphite-700">
                {differentiators.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <section>
              <Heading>Contract vehicles</Heading>
              <ul className="mt-2 space-y-2">
                {vehicles.map((v) => (
                  <li key={v.slug}>
                    <p className="font-semibold">{v.name}</p>
                    <p className="font-mono text-[0.75rem]">{v.number}</p>
                    <p className="text-graphite-700">Ordering through {formatDate(v.orderingEndsOn)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <Heading>NAICS</Heading>
              <ul className="mt-2 space-y-0.5">
                {naics.map((n) => (
                  <li key={n.code}>
                    <span className="font-mono">{n.code}</span> {n.label}
                    {n.primary ? " (primary)" : ""}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <Heading>Certifications</Heading>
              <ul className="mt-2 space-y-0.5">
                {credentials.map((c) => (
                  <li key={c.short}>{c.name}</li>
                ))}
              </ul>
            </section>

            <section>
              <Heading>Socioeconomic</Heading>
              <p className="mt-2">{socioeconomic(day).join(" · ")}</p>
            </section>

            <section>
              <Heading>Point of contact</Heading>
              <p className="mt-2 font-semibold">{businessDevelopment.name}</p>
              <p>{businessDevelopment.title}</p>
              <p className="mt-1">{businessDevelopment.email}</p>
              <p className="font-mono">{businessDevelopment.phone}</p>
              <p className="mt-1 text-graphite-700">{contact.address}</p>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
}
