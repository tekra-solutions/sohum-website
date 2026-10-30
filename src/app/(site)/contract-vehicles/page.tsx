import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { AlertCircle, ArrowRight, FileText, Phone } from "@/components/icons";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Badge, Eyebrow, SectionHeading } from "@/components/ui";
import { contact, identifiers, naics, site, siteVehicles } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contract Vehicles",
  description:
    "Contract vehicles for Sohum Systems: GSA Multiple Award Schedule, SeaPort NxG, and CIO-SP3 Small Business, with contract numbers, ordering periods, and how to place an order.",
  alternates: { canonical: "/contract-vehicles" },
  openGraph: {
    title: "Contract Vehicles | Sohum Systems",
    description:
      "GSA MAS and SeaPort NxG are open for orders. Contract numbers, ordering periods, and how to order.",
    url: `${site.url}/contract-vehicles`,
  },
};

export default function ContractVehiclesPage() {
  const active = siteVehicles().filter((v) => v.status === "active");
  const expired = siteVehicles().filter((v) => v.status === "expired");

  return (
    <>
      <PageHero
        eyebrow="Procurement"
        crumbs={[{ label: "Contract Vehicles" }]}
        title="How to put our team under contract."
        lede={`${active.length === 1 ? "One vehicle is" : `${active.length} vehicles are`} open for new orders. Each entry has the contract data your contracting officer needs to build an acquisition.`}
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Entity identifiers</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
              {identifiers.map((id) => (
                <div key={id.label}>
                  <dt className="text-[0.75rem] uppercase tracking-[0.12em] text-white/40">
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
        <div className="container-page section-y-tight">
          <Reveal>
            <div className="grid gap-8 rounded-[4px] border border-flame-500/30 bg-flame-500/[0.045] p-7 sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="eyebrow text-flame-700">Simplest path to award</p>
                <p className="mt-4 text-[1.1875rem] font-medium leading-[1.5] text-ink-900 sm:text-[1.3125rem]">
                  Any federal agency can order from us on the GSA Multiple Award Schedule, contract
                  47QTCA19D00FK, under FAR 8.4. State and local buyers can use it through cooperative
                  purchasing.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="#gsa-mas"
                  className="inline-flex items-center justify-center gap-2 rounded-full font-brand bg-ink-900 px-5 py-3.5 text-[0.875rem] font-bold text-white transition-colors hover:bg-ink-700"
                >
                  GSA MAS details
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a
                  href={`mailto:${contact.emailGeneral}?subject=GSA%20MAS%20order%20inquiry`}
                  className="inline-flex items-center justify-center gap-2 rounded-full font-brand border border-paper-300 bg-white px-5 py-3.5 text-[0.875rem] font-bold text-ink-900 transition-colors hover:border-ink-500"
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
        <div className="container-page section-y">
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
                  className="scroll-mt-40 overflow-hidden rounded-[4px] border border-paper-300 bg-white"
                >
                  <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
                    {/* Narrative */}
                    <div className="p-7 sm:p-9">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone="active">
                          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          Open for orders
                        </Badge>
                        <span className="text-[0.8125rem] text-graphite-500">{v.holder}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <h3 className="text-[1.5rem] font-medium leading-tight text-ink-900 sm:text-[1.75rem]">
                          {v.name}
                        </h3>
                        {v.badge && (
                          <Image
                            src={v.badge}
                            alt={`${v.name} program badge`}
                            width={272}
                            height={170}
                            sizes="120px"
                            className="h-12 w-auto max-w-[7.5rem] object-contain"
                          />
                        )}
                      </div>
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
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full font-brand border border-paper-300 bg-white px-5 py-3 text-[0.875rem] font-bold text-ink-900 transition-colors hover:border-ink-500"
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

      {/* ---- Prior vehicles: disclosed honestly, shown only when one exists ---- */}
      {expired.length > 0 && (
      <section className="border-y border-paper-200 bg-white">
        <div className="container-page section-y">
          <Reveal>
            <SectionHeading
              eyebrow="Prior vehicles"
              title="Vehicles closed to new orders."
              lede="We list these because the work under them is real and relevant. We label them clearly so a contracting officer never has to discover a closed ordering period on their own."
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
                  {["Vehicle", "Holder", "Contract number", "Ordering period", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="whitespace-nowrap py-3 pr-6 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-graphite-500"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {expired.map((v) => (
                  <tr key={v.slug} id={v.slug} className="scroll-mt-40 border-b border-paper-200">
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
                    <td className="py-5 pr-6 text-[0.875rem] text-graphite-600">
                      {v.statusLabel}
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
                If a requirement was planned around one of these vehicles, contact us before you
                build the acquisition. In most cases the same scope can be reached today through
                one of the open vehicles above.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
      )}

      {/* ---- Codes + POC ---- */}
      <section className="bg-paper-50">
        <div className="container-page section-y">
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
                          <span className="ml-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-flame-700">
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
                    <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-graphite-500">
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
                      className="mt-3 inline-flex min-h-10 items-center gap-2 font-mono text-[0.875rem] text-ink-800 transition-colors hover:text-flame-700"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {contact.phoneAlt}
                    </a>
                  </div>

                  <div className="rounded-[4px] border border-paper-300 bg-white p-6">
                    <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-graphite-500">
                      Contracts &amp; business development
                    </p>
                    <a
                      href={`mailto:${contact.emailGeneral}`}
                      className="mt-3 block text-[1.0625rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 transition-colors hover:decoration-flame-500"
                    >
                      {contact.emailGeneral}
                    </a>
                    <a
                      href={`tel:${contact.phoneHref}`}
                      className="mt-2 inline-flex min-h-10 items-center gap-2 font-mono text-[0.875rem] text-ink-800 transition-colors hover:text-flame-700"
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
