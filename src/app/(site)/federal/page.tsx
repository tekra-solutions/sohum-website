import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Landmark, Lock, ShieldCheck, Workflow } from "@/components/icons";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { capabilities } from "@/lib/capabilities";
import { siteActiveVehicles, site } from "@/lib/site";
import { customers } from "@/content/company";
import { LOGO_DISCLAIMER, LogoWall } from "@/components/ClientLogos";

export const metadata: Metadata = {
  title: "Federal Mission",
  description:
    "How Sohum Systems supports federal missions: legacy modernization, secure delivery, mission data platforms, and program leadership under CMMI Level 3 appraised processes and ISO/IEC 27001 certification.",
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
    body: "Program offices carry application portfolios spanning decades of technology. We assess them application by application and modernize on a sequence that keeps the mission running, because the systems in question run every day.",
    caps: ["cloud-services-migration", "custom-application-development", "enterprise-resource-planning"],
  },
  {
    Icon: ShieldCheck,
    title: "Secure, verifiable delivery",
    body: "We build pipelines that produce test, security, and accessibility artifacts as a by-product of delivery, so compliance conversations start from documentation that already exists.",
    caps: ["devops", "test-automation"],
  },
  {
    Icon: Lock,
    title: "Mission data & decision support",
    body: "Most agencies have plenty of data. What they need is a governed path from that data to a decision they can defend. We build the warehouses, models, and instruments that make agency data usable and traceable when oversight asks.",
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
        title="Software and data work for federal programs."
        lede="Federal modernization has to meet authorization, accessibility, records, and oversight requirements while the system stays in service. We plan for all of them from the first sprint."
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Award-ready</p>
            <ul className="mt-5 space-y-3.5">
              {siteActiveVehicles().map((v) => (
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
              className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-[0.875rem] font-medium text-flame-400 transition-colors hover:text-white"
            >
              Procurement detail
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {/* ---- The constraint we design around ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page section-y">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
              <div className="self-start">
                <Eyebrow>The constraint</Eyebrow>
                <h2 className="sr-only">The constraint we design around</h2>
              </div>
              <div>
                <p className="max-w-3xl text-[1.25rem] font-medium leading-[1.55] tracking-[-0.015em] text-ink-900 sm:text-[1.4375rem]">
                  A federal system cannot be taken offline for a rewrite. Citizens depend on it,
                  statute requires it, and the program is accountable for its output every day it
                  is being modernized.
                </p>
                <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-graphite-600">
                  That shapes how we work. We deliver in increments, run automated tests on every
                  change, and document the system as we go so the knowledge stays with the
                  government when a contract ends. It is also why appraised processes matter: an
                  agency needs to know the work will hold up through staff turnover on both sides.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Mission areas ---- */}
      <section className="bg-paper-50">
        <div className="container-page section-y">
          <Reveal>
            <SectionHeading
              eyebrow="Where we work"
              title="Mission areas we support."
              lede="These are the areas where we have past performance and certified staff."
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
      <section id="organizations" className="scroll-mt-24 border-t border-paper-200 bg-white">
        <div className="container-page section-y">
          <Reveal>
            <SectionHeading
              eyebrow="Organizations"
              title="Who we work with."
              lede="Customers, platforms, and frameworks are listed separately so it is clear which is which."
            />
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <LogoWall />
          </Reveal>
          <Reveal>
            <p className="mt-10 max-w-3xl border-t border-paper-200 pt-6 text-[0.875rem] leading-relaxed text-graphite-600">
              Agencies named in public federal award records: {customers.join(", ")}.{" "}
              {LOGO_DISCLAIMER} Past performance references are available on request.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- Security & compliance posture ---- */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="container-page relative section-y">
          <Reveal>
            <SectionHeading
              tone="light"
              eyebrow="Security posture"
              title="Confidentiality, integrity, and availability, written into policy."
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
                p: "ISO/IEC 20000-1:2018 governs the service lifecycle. Incident, change, and problem management follow a defined standard.",
              },
              {
                h: "Appraised process maturity",
                p: "CMMI Level 3 for Development and for Services means our processes are defined at the organization level and applied consistently across programs.",
              },
              {
                h: "Security in the pipeline",
                p: "Security and compliance checks run as automated pipeline stages, so findings show up early in the build.",
              },
              {
                h: "Accessibility as acceptance criteria",
                p: "Public-facing federal systems must meet Section 508. We test accessibility on every build.",
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
        <div className="container-page section-y">
          <Reveal>
            <SectionHeading
              eyebrow="Engagement"
              title="What working with us looks like."
              lede="How an engagement with us usually runs."
            />
          </Reveal>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300 lg:grid-cols-4">
            {[
              {
                h: "Talk to the people who will deliver",
                p: "Your first conversation is with the technical and program leaders who would run the work.",
              },
              {
                h: "Get an honest assessment",
                p: "We will tell you if the requirement is a fit, if the timeline is realistic, and if another firm is better positioned.",
              },
              {
                h: "Choose a contract vehicle",
                p: "GSA MAS or SeaPort NxG. We help your contracting officer pick the one that gets a team in place soonest.",
              },
              {
                h: "Deliver in visible increments",
                p: "Working software on a predictable schedule, reported against baseline, including any variances.",
              },
            ].map((step, i) => (
              <Reveal key={step.h} as="li" delay={i * 65} className="flex h-full flex-col bg-white p-7">
                <div className="contents">
                  <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-flame-500" />
                  <h3 className="mt-5 text-[1.0625rem] font-medium leading-snug text-ink-900">
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
        title="Talk to us early."
        lede="The most useful conversations happen before the requirement is written. Tell us what the program needs and we will tell you what it would take."
        secondary={{ href: "/contract-vehicles", label: "Contract vehicles" }}
      />
    </>
  );
}
