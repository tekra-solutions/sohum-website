import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowRight, FileText, Phone } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Badge, Eyebrow, SectionHeading } from "@/components/ui";
import { contact, identifiers, naics, site, vehicles } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contract Vehicles",
  description:
    "Contract vehicles for Sohum Systems — NASA SEWP VI Category A, SBA 8(a) sole source through 2027, and CIO-SP3 Small Business, with contract numbers, periods of performance, and ordering guidance.",
  alternates: { canonical: "/contract-vehicles" },
  openGraph: {
    title: "Contract Vehicles | Sohum Systems",
    description:
      "NASA SEWP VI, SBA 8(a), and CIO-SP3 Small Business — contract numbers, periods of performance, and how to order.",
    url: `${site.url}/contract-vehicles`,
  },
};

export default function ContractVehiclesPage() {
  const active = vehicles.filter((v) => v.status === "active");
  const expired = vehicles.filter((v) => v.status === "expired");

  return (
    <>
      <PageHero
        eyebrow="Procurement"
        crumbs={[{ label: "Contract Vehicles" }]}
        title="How to put our team under contract."
        lede="Three active pathways, with the contract data your contracting officer needs to build an acquisition. Vehicles whose period of performance has ended are listed separately and labelled as such."
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Entity identifiers</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
              {identifiers.map((id) => (
                <div key={id.label}>
                  <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/40">
                    {id.label}
                  </dt>
                  <dd className="mt-1.5 font-mono text-[0.875rem] text-white/85">{id.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 border-t border-white/10 pt-5 text-[0.8125rem] leading-relaxed text-white/45">
              Registered and active in SAM.gov. Full entity registration details available on
              request.
            </p>
          </div>
        }
      />

      {/* ---- Fastest path callout ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-14 sm:py-16">
          <Reveal>
            <div className="grid gap-8 rounded-[4px] border border-signal-500/25 bg-signal-500/[0.045] p-7 sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="eyebrow text-signal-700">Fastest path to award</p>
                <p className="mt-4 text-[1.1875rem] font-medium leading-[1.5] text-ink-900 sm:text-[1.3125rem]">
                  As an SBA-certified 8(a) small business, we can be awarded directly without full
                  and open competition — within program thresholds — through November 11, 2027.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="#8a"
                  className="inline-flex items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-5 py-3.5 text-[0.875rem] font-medium text-white transition-colors hover:bg-ink-700"
                >
                  8(a) details
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a
                  href={`mailto:${contact.emailGeneral}?subject=8(a)%20sole%20source%20inquiry`}
                  className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper-300 bg-white px-5 py-3.5 text-[0.875rem] font-medium text-ink-900 transition-colors hover:border-ink-500"
                >
                  Contact contracts
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Active vehicles ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Active vehicles"
              title="Current contract pathways"
              lede="Each entry below lists the contract number, period of performance, and how an order is placed."
            />
          </Reveal>

          <div className="mt-14 space-y-6">
            {active.map((v, i) => (
              <Reveal key={v.slug} delay={i * 60}>
                <article
                  id={v.slug}
                  className="scroll-mt-28 overflow-hidden rounded-[4px] border border-paper-300 bg-white"
                >
                  <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
                    {/* Narrative */}
                    <div className="p-7 sm:p-9">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone="active">
                          <span className="size-1.5 rounded-full bg-signal-500" aria-hidden="true" />
                          Active
                        </Badge>
                        <span className="text-[0.8125rem] text-graphite-500">{v.holder}</span>
                      </div>

                      <h3 className="mt-5 text-[1.5rem] font-medium leading-tight text-ink-900 sm:text-[1.75rem]">
                        {v.name}
                      </h3>
                      {v.full && (
                        <p className="mt-1.5 text-[0.9375rem] text-graphite-500">{v.full}</p>
                      )}

                      <p className="mt-6 max-w-2xl text-[1rem] leading-[1.7] text-graphite-600">
                        {v.summary}
                      </p>

                      <div className="mt-7 border-t border-paper-200 pt-6">
                        <p className="eyebrow text-graphite-400">How to order</p>
                        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-ink-800">
                          {v.useIt}
                        </p>
                      </div>
                    </div>

                    {/* Procurement data panel */}
                    <div className="border-t border-paper-200 bg-paper-50 p-7 sm:p-9 lg:border-l lg:border-t-0">
                      <p className="eyebrow text-graphite-400">Contract data</p>
                      <dl className="mt-5">
                        {v.detail.map((d) => (
                          <div
                            key={d.label}
                            className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-paper-300 py-3 last:border-0"
                          >
                            <dt className="text-[0.8125rem] text-graphite-500">{d.label}</dt>
                            <dd className="font-mono text-[0.8125rem] font-medium tabular-nums text-ink-900">
                              {d.value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <a
                        href={`mailto:${contact.emailGeneral}?subject=${encodeURIComponent(
                          `${v.name} inquiry`,
                        )}`}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[3px] border border-paper-300 bg-white px-5 py-3 text-[0.875rem] font-medium text-ink-900 transition-colors hover:border-ink-500"
                      >
                        Request a quote
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Prior vehicles: disclosed honestly ---- */}
      <section className="border-y border-paper-200 bg-white">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Prior vehicles"
              title="Vehicles no longer in their period of performance."
              lede="We list these because the past performance is real and relevant. We label them clearly because a contracting officer should never have to discover an expiration on their own."
            />
          </Reveal>

          {/* Focusable + labelled so keyboard users can scroll this region (WCAG 2.1.1). */}
          <div
            className="mt-12 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Contract vehicles no longer in their period of performance"
          >
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <caption className="sr-only">
                Contract vehicles whose period of performance has ended
              </caption>
              <thead>
                <tr className="border-b border-paper-300">
                  {["Vehicle", "Holder", "Contract number", "Period of performance", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="py-3 pr-6 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-graphite-500"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {expired.map((v) => (
                  <tr key={v.slug} id={v.slug} className="scroll-mt-28 border-b border-paper-200">
                    <th
                      scope="row"
                      className="py-5 pr-6 text-[0.9375rem] font-medium text-ink-900"
                    >
                      {v.name}
                    </th>
                    <td className="py-5 pr-6 text-[0.875rem] text-graphite-600">
                      {v.holder}
                    </td>
                    <td className="py-5 pr-6 font-mono text-[0.8125rem] text-ink-800">
                      {v.number}
                    </td>
                    <td className="py-5 pr-6 font-mono text-[0.8125rem] text-graphite-600">
                      {v.pop}
                    </td>
                    <td className="py-5 pr-6">
                      <Badge tone="muted">Expired</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Reveal>
            <div className="mt-8 flex gap-4 rounded-[4px] border border-paper-300 bg-paper-50 p-6">
              <AlertCircle
                className="mt-0.5 size-5 shrink-0 text-ember-500"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p className="text-[0.9375rem] leading-[1.7] text-graphite-600">
                For requirements you would have routed through GSA Schedule 70 or SeaPort NxG,
                contact us before you build the acquisition. GSA IT Schedule 70 has since been
                consolidated into the GSA Multiple Award Schedule, and in most cases the same scope
                can be reached today through 8(a) or CIO-SP3.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Codes + POC ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <div>
                <Eyebrow>NAICS codes</Eyebrow>
                <h2 className="mt-5 text-[1.625rem] leading-tight text-ink-900">
                  Registered scope
                </h2>
                <dl className="mt-8 overflow-hidden rounded-[4px] border border-paper-300 bg-white">
                  {naics.map((n) => (
                    <div
                      key={n.code}
                      className="flex items-baseline gap-5 border-b border-paper-200 px-5 py-4 last:border-0"
                    >
                      <dt className="font-mono text-[0.875rem] font-medium tabular-nums text-ink-900">
                        {n.code}
                      </dt>
                      <dd className="text-[0.9375rem] text-graphite-600">
                        {n.label}
                        {n.primary && (
                          <span className="ml-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-signal-700">
                            Primary
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div>
                <Eyebrow>Points of contact</Eyebrow>
                <h2 className="mt-5 text-[1.625rem] leading-tight text-ink-900">
                  Who to call
                </h2>
                <div className="mt-8 space-y-4">
                  <div className="rounded-[4px] border border-paper-300 bg-white p-6">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-graphite-500">
                      CIO-SP3 program manager
                    </p>
                    <p className="mt-3 text-[1.0625rem] font-medium text-ink-900">
                      Srinivas Moshugu
                    </p>
                    <p className="mt-0.5 text-[0.875rem] text-graphite-600">
                      Chief Executive Officer
                    </p>
                    <a
                      href="tel:+19132217204"
                      className="mt-4 inline-flex items-center gap-2 font-mono text-[0.875rem] text-ink-800 transition-colors hover:text-signal-600"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {contact.phoneAlt}
                    </a>
                  </div>

                  <div className="rounded-[4px] border border-paper-300 bg-white p-6">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-graphite-500">
                      Contracts &amp; business development
                    </p>
                    <a
                      href={`mailto:${contact.emailGeneral}`}
                      className="mt-3 block text-[1.0625rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 transition-colors hover:decoration-signal-500"
                    >
                      {contact.emailGeneral}
                    </a>
                    <a
                      href={`tel:${contact.phoneHref}`}
                      className="mt-3 inline-flex items-center gap-2 font-mono text-[0.875rem] text-ink-800 transition-colors hover:text-signal-600"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {contact.phone}
                    </a>
                  </div>

                  <div className="flex items-start gap-3.5 rounded-[4px] border border-dashed border-paper-300 p-6">
                    <FileText
                      className="mt-0.5 size-4 shrink-0 text-graphite-400"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <p className="text-[0.875rem] leading-relaxed text-graphite-600">
                      Capability statement, labor rate schedules, and past performance references
                      are available on request.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Procurement support"
        title="We will help your contracting officer find the fastest route."
        lede="Send us the requirement and the timeline. We will come back with the vehicle, the order type, and what we would need from you to move."
        secondary={{ href: "/capabilities", label: "Review capabilities" }}
      />
    </>
  );
}
