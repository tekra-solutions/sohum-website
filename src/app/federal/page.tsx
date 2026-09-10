import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Landmark, Lock, ShieldCheck, Workflow } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { LogoWall } from "@/components/LogoWall";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { capabilities } from "@/lib/capabilities";
import { activeVehicles, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Federal Mission",
  description:
    "How Sohum Systems supports federal missions — legacy modernization, secure delivery, mission data platforms, and program leadership under CMMI Level 3 appraised processes and ISO/IEC 27001 certification.",
  alternates: { canonical: "/federal" },
  openGraph: {
    title: "Federal Mission | Sohum Systems",
    description:
      "Mission-critical modernization, secure delivery, and program leadership for federal agencies.",
    url: `${site.url}/federal`,
  },
};

const missionAreas = [
  {
    Icon: Landmark,
    title: "Agriculture & land management",
    body: "Our longest-running federal work is with the U.S. Department of Agriculture and its Farm Service Agency, where we build the mapping, reporting, and data platforms that program staff use to administer programs across the country.",
    caps: ["geographic-information-systems", "data-warehousing", "business-intelligence"],
  },
  {
    Icon: Workflow,
    title: "Legacy system modernization",
    body: "Program offices carry application portfolios spanning decades of technology. We assess them application by application and modernize on a sequence that keeps the mission running — because the systems in question run every day.",
    caps: ["cloud-services-migration", "custom-application-development", "enterprise-resource-planning"],
  },
  {
    Icon: ShieldCheck,
    title: "Secure, verifiable delivery",
    body: "Federal software is judged on evidence, not assertion. We build pipelines that produce test, security, and accessibility artifacts as a by-product of delivery, so compliance conversations start from documentation that already exists.",
    caps: ["devops", "test-automation"],
  },
  {
    Icon: Lock,
    title: "Mission data & decision support",
    body: "Agencies rarely lack data; they lack a governed path from data to a defensible decision. We build the warehouses, models, and instruments that make agency data usable — and traceable when oversight asks.",
    caps: ["artificial-intelligence-data-analytics", "business-intelligence", "data-warehousing"],
  },
];

export default function FederalPage() {
  const bySlug = (s: string) => capabilities.find((c) => c.slug === s)!;

  return (
    <>
      <PageHero
        eyebrow="Federal mission focus"
        crumbs={[{ label: "Federal Mission" }]}
        title="Built for the way federal programs actually get delivered."
        lede="Commercial modernization optimizes for speed. Federal modernization has to satisfy speed, authorization, accessibility, records, and oversight at the same time. We plan for that from the first sprint rather than discovering it before launch."
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Award-ready</p>
            <ul className="mt-5 space-y-3.5">
              {activeVehicles.map((v) => (
                <li key={v.slug} className="border-b border-white/[0.07] pb-3.5 last:border-0 last:pb-0">
                  <p className="text-[0.9375rem] font-medium text-white">{v.name}</p>
                  <p className="mt-0.5 font-mono text-[0.75rem] text-white/45">
                    {v.number ?? v.pop}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href="/contract-vehicles"
              className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-flame-400 transition-colors hover:text-white"
            >
              Procurement detail
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {/* ---- The constraint we design around ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-18 sm:py-24">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
              <div className="self-start">
                <Eyebrow>The constraint</Eyebrow>
                <h2 className="sr-only">The constraint we design around</h2>
              </div>
              <div>
                <p className="max-w-3xl text-[1.25rem] font-medium leading-[1.55] tracking-[-0.015em] text-ink-900 sm:text-[1.4375rem]">
                  A federal system cannot be taken offline for a rewrite. Citizens depend on it,
                  statute requires it, and the program is accountable for its output every single
                  day it is being modernized.
                </p>
                <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-graphite-600">
                  That single constraint shapes everything about how we work: incremental delivery
                  instead of big-bang cutovers, automated verification instead of end-stage testing,
                  and documented handover instead of institutional knowledge that leaves with a
                  contract. It is also why appraised processes matter more here than in commercial
                  work — an agency needs to know the discipline survives staff turnover on both
                  sides.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Mission areas ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Where we work"
              title="Mission areas we support."
              lede="We are deliberate about scope. These are the areas where our past performance and our certified practitioners genuinely line up."
            />
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {missionAreas.map((area, i) => (
              <Reveal key={area.title} delay={i * 70}>
                <div className="flex h-full flex-col rounded-[4px] border border-paper-300 bg-white p-7 sm:p-8">
                  <area.Icon
                    className="size-5 text-ink-500"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 text-[1.3125rem] font-medium leading-snug text-ink-900">
                    {area.title}
                  </h3>
                  <p className="mt-3.5 flex-1 text-[0.9375rem] leading-[1.7] text-graphite-600">
                    {area.body}
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-2 border-t border-paper-200 pt-5">
                    {area.caps.map((slug) => (
                      <li key={slug}>
                        <Link
                          href={`/capabilities/${slug}`}
                          className="inline-block rounded-full border border-paper-300 px-3 py-1.5 text-[0.75rem] font-medium text-graphite-700 transition-colors hover:border-ink-500/40 hover:text-ink-950"
                        >
                          {bySlug(slug).short}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Organizations ---- */}
      <section className="border-t border-paper-200 bg-white">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Organizations"
              title="Who we work with, stated plainly."
              lede="Logo walls usually blur the line between a customer, a platform, and a framework. We separate them, because a contracting officer evaluating past performance deserves to know which is which."
            />
          </Reveal>
          <Reveal delay={80} className="mt-14">
            <LogoWall />
          </Reveal>
          <Reveal>
            <p className="mt-10 max-w-3xl border-t border-paper-200 pt-6 text-[0.875rem] leading-relaxed text-graphite-600">
              Marks shown are the property of their respective owners. Their appearance
              indicates the organizations represented in our work and the technologies our
              teams are certified in — it does not imply endorsement or a current contractual
              relationship. Detailed past performance references are available on request.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- Security & compliance posture ---- */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-45" />
        <div className="container-page relative py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              tone="light"
              eyebrow="Security posture"
              title="Confidentiality, integrity, and availability — as policy, not posture."
              lede="Our quality policy commits us to keeping information accessible only to authorized users, through proper authentication and access control. ISO/IEC 27001 certification is the independent verification of that commitment."
            />
          </Reveal>

          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                h: "Certified information security",
                p: "An ISO/IEC 27001 information security management system governs how access is granted, authenticated, and reviewed across our engagements.",
              },
              {
                h: "Certified service management",
                p: "ISO/IEC 20000-1:2018 governs the service lifecycle — incident, change, and problem management run to a defined standard rather than to local habit.",
              },
              {
                h: "Appraised process maturity",
                p: "CMMI Level 3 for Development and for Services means our processes are defined at the organization level and applied consistently across programs.",
              },
              {
                h: "Security in the pipeline",
                p: "Security and compliance checks run as automated pipeline stages, so findings arrive as build results rather than as late-stage surprises.",
              },
              {
                h: "Accessibility as acceptance criteria",
                p: "Public-facing federal systems are held to accessibility standards that are not negotiable. We verify continuously instead of auditing at the end.",
              },
              {
                h: "Documented handover",
                p: "Interfaces, decisions, and operational runbooks are documented as work proceeds, so the government retains the knowledge regardless of who holds the next contract.",
              },
            ].map((item, i) => (
              <Reveal key={item.h} delay={i * 55}>
                <div className="border-t border-white/15 pt-6">
                  <h3 className="text-[1.0625rem] font-medium leading-snug text-white">{item.h}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-[1.7] text-white/60">{item.p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Engagement model ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Engagement"
              title="What working with us looks like."
              lede="A small firm's advantage is directness. Here is the sequence, without the pre-sales theatre."
            />
          </Reveal>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300 lg:grid-cols-4">
            {[
              {
                h: "Talk to the people who will deliver",
                p: "Your first conversation is with the technical and program leadership who would run the work, not a business development layer that hands you off after award.",
              },
              {
                h: "Get a straight assessment",
                p: "We will tell you if the requirement is a fit, if the timeline is realistic, and if another firm is better positioned. That answer is worth more to you than a proposal.",
              },
              {
                h: "Pick the fastest lawful route",
                p: "8(a) sole source, SEWP VI, or CIO-SP3 — we help your contracting officer identify which pathway gets a team in place soonest.",
              },
              {
                h: "Deliver in visible increments",
                p: "Working software on a predictable cadence, reported against baseline, with the variances included rather than smoothed over.",
              },
            ].map((step, i) => (
              <Reveal key={step.h} as="li" delay={i * 65} className="flex h-full flex-col bg-white p-7">
                <div className="contents">
                  <span className="font-mono text-[0.75rem] font-medium text-flame-700 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-[1.0625rem] font-medium leading-snug text-ink-900">
                    {step.h}
                  </h3>
                  <p className="mt-3 text-[0.9375rem] leading-[1.65] text-graphite-600">
                    {step.p}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        eyebrow="Federal engagement"
        title="Bring us a problem, not a solicitation."
        lede="The most useful conversations start before the requirement is written. Tell us what the mission needs and we will tell you what it would take."
        secondary={{ href: "/contract-vehicles", label: "Contract vehicles" }}
      />
    </>
  );
}
