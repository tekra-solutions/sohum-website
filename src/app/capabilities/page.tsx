import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { capabilities, pillars } from "@/lib/capabilities";
import { credentials, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Capabilities",
  description:
    "Eleven federal technology capabilities — application development, cloud modernization, AI and data analytics, GIS, data warehousing, business intelligence, DevOps, test automation, program management, ERP, and administrative support.",
  alternates: { canonical: "/capabilities" },
  openGraph: {
    title: "Capabilities | Sohum Systems",
    description:
      "Application development, cloud modernization, AI and data analytics, GIS, and program delivery for federal agencies.",
    url: `${site.url}/capabilities`,
  },
};

export default function CapabilitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Capabilities"
        crumbs={[{ label: "Capabilities" }]}
        title="Engineering, modernization, and decision support for federal missions."
        lede="Eleven capabilities delivered by one accountable team. We organize them around what an agency is actually trying to accomplish — not around our internal org chart."
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Delivered under</p>
            <ul className="mt-5 space-y-2.5">
              {credentials.slice(0, 5).map((c) => (
                <li key={c.short} className="flex items-baseline gap-3 text-[0.875rem]">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-flame-400" aria-hidden="true" />
                  <span className="text-white/70">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>
        }
      />

      {/* ---- Pillar-organized capability index ---- */}
      <section className="bg-white">
        <div className="container-page py-20 sm:py-24">
          {pillars.map((pillar, pi) => {
            const items = capabilities.filter((c) => c.pillar === pillar.id);
            return (
              <div
                key={pillar.id}
                className={pi > 0 ? "mt-20 border-t border-paper-200 pt-20" : ""}
              >
                <Reveal>
                  <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                    <div className="lg:sticky lg:top-36 lg:self-start">
                      <p className="font-mono text-[0.75rem] font-medium text-flame-700 tabular-nums">
                        0{pi + 1}
                      </p>
                      <h2 className="mt-3 text-[1.75rem] font-medium leading-tight text-ink-900 sm:text-[2rem]">
                        {pillar.label}
                      </h2>
                      <p className="mt-4 text-[1rem] leading-[1.7] text-graphite-600">
                        {pillar.description}
                      </p>
                      <p className="mt-5 text-[0.8125rem] text-graphite-500">
                        {items.length} {items.length === 1 ? "capability" : "capabilities"}
                      </p>
                    </div>

                    <ul className="grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300">
                      {items.map((c) => (
                        <li key={c.slug} className="bg-white">
                          <Link
                            href={`/capabilities/${c.slug}`}
                            className="group/row flex items-start justify-between gap-6 p-6 transition-colors hover:bg-paper-50 sm:p-7"
                          >
                            <div>
                              <h3 className="text-[1.125rem] font-medium leading-snug text-ink-900">
                                {c.name}
                              </h3>
                              <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-graphite-600">
                                {c.blurb}
                              </p>
                            </div>
                            <ArrowRight
                              className="mt-1 size-4 shrink-0 text-graphite-400 transition-all duration-300 group-hover/row:translate-x-1 group-hover/row:text-flame-600"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- How we deliver ---- */}
      <section className="border-t border-paper-200 bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="How we deliver"
              title="The same delivery discipline behind every capability."
              lede="Capability lists are easy to write. What separates programs that land from programs that drift is how the work is run."
            />
          </Reveal>
          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                h: "Understand before building",
                p: "We map the actual workflow, including the exceptions handled by hand, before proposing a system boundary.",
              },
              {
                h: "Deliver in working slices",
                p: "Each increment is a demonstrable path through the system, so stakeholders steer with software rather than status decks.",
              },
              {
                h: "Automate the verification",
                p: "Tests, security checks, and accessibility gates run in the pipeline, so quality is continuous rather than audited late.",
              },
              {
                h: "Hand over cleanly",
                p: "Documented interfaces, readable code, and knowledge transfer, so the next team can change things safely.",
              },
            ].map((step, i) => (
              <Reveal key={step.h} delay={i * 70}>
                <div className="border-t border-paper-300 pt-6">
                  <p className="font-mono text-[0.75rem] font-medium text-flame-700 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3.5 text-[1.0625rem] font-medium leading-snug text-ink-900">
                    {step.h}
                  </h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-graphite-600">
                    {step.p}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Not sure which capability fits your requirement?"
        lede="Describe the problem and we will tell you which of these applies, what it would take, and whether we are the right team for it."
        secondary={{ href: "/contract-vehicles", label: "Review contract vehicles" }}
      />
    </>
  );
}
