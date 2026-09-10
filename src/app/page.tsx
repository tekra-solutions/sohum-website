import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Cloud,
  Cpu,
  Database,
  GitBranch,
  LayoutDashboard,
  Map as MapIcon,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Hero } from "@/components/Hero";
import { LogoStrip } from "@/components/LogoWall";
import { CredentialCards } from "@/components/CredentialCards";
import { Reveal } from "@/components/Reveal";
import { ArrowLink, ButtonLink, Eyebrow, SectionHeading } from "@/components/ui";
import { capabilities, pillars } from "@/lib/capabilities";
import { activeVehicles, contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sohum Systems — Digital Modernization for Government",
  description: site.description,
  alternates: { canonical: "/" },
};

/* Icons mapped to the capabilities surfaced on the homepage. */
const featured = [
  { slug: "custom-application-development", Icon: Cpu },
  { slug: "cloud-services-migration", Icon: Cloud },
  { slug: "artificial-intelligence-data-analytics", Icon: Database },
  { slug: "geographic-information-systems", Icon: MapIcon },
  { slug: "business-intelligence", Icon: LayoutDashboard },
  { slug: "devops", Icon: GitBranch },
].map(({ slug, Icon }) => ({ ...capabilities.find((c) => c.slug === slug)!, Icon }));

const leadership = [
  {
    name: "Srinivas Moshugu",
    title: "Chief Executive Officer",
    photo: "/team/srinivas-moshugu.webp",
    note: "Founded Sohum Systems in 2013. Eighteen years in IT, leading strategy, alliances, and partnerships.",
  },
  {
    name: "Jamie Royston",
    title: "Director of Operations",
    photo: "/team/jamie-royston.webp",
    note: "Twenty-plus years of financial and operational leadership in the government market. MBA, PMP.",
  },
  {
    name: "Jacob Robertson",
    title: "Technical Director",
    photo: "/team/jacob-robertson.webp",
    note: "Twenty-plus years in technical leadership, program management, and DevSecOps architecture.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* ================================================= Trust strip */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-12 sm:py-14">
          <Reveal>
            <p className="text-center text-[0.8125rem] leading-relaxed text-graphite-600">
              Delivering for federal and commercial organizations, on the platforms and
              frameworks their teams already run.
            </p>
            <LogoStrip className="mt-8" />
          </Reveal>
        </div>
      </section>

      {/* ================================================= Positioning statement */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-16 sm:py-20">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div className="self-start">
                <Eyebrow>What we do</Eyebrow>
                <h2 className="sr-only">What we do</h2>
              </div>
              <div>
                <p className="text-[1.375rem] font-medium leading-[1.45] tracking-[-0.02em] text-ink-900 sm:text-[1.625rem]">
                  Federal agencies do not need another vendor with a capability list. They need a
                  team that can take a system the mission depends on every day and make it faster,
                  cheaper, and safer to run — without stopping it.
                </p>
                <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-graphite-600">
                  That is the work we have done since 2013: building interactive web mapping
                  applications, business intelligence dashboards, and data warehouses for the
                  U.S. Department of Agriculture and other federal, state, and commercial
                  customers. Our teams hold PMI, GISCI, Esri, Oracle, and Amazon certifications,
                  and our delivery processes are appraised at CMMI Level 3 for both development
                  and services.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                  <ArrowLink href="/about">Our story</ArrowLink>
                  <ArrowLink href="/federal">Federal mission focus</ArrowLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================= Capability pillars */}
      <section className="relative overflow-hidden bg-paper-50">
        <div aria-hidden="true" className="absolute inset-0 grid-fine-light" />
        <div className="container-page relative py-20 sm:py-28">
          <Reveal>
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionHeading
                eyebrow="Capabilities"
                title={
                  <>
                    Eleven capabilities,
                    <br className="hidden sm:block" /> four kinds of problem.
                  </>
                }
                lede="We organize the work the way agencies actually scope it — engineer what runs the mission, modernize what holds it back, turn data into decisions, and lead the programs that deliver."
              />
              <ButtonLink href="/capabilities" variant="secondary" className="shrink-0 self-start lg:self-auto">
                All capabilities
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </Reveal>

          {/* Pillar rail — a different composition from the card grid below */}
          <div className="mt-14 grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, i) => {
              const items = capabilities.filter((c) => c.pillar === pillar.id);
              return (
                <Reveal key={pillar.id} delay={i * 70} className="bg-white">
                  <div className="flex h-full flex-col p-7">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-4 w-0.5 rounded-full bg-flame-500" />
                      <h3 className="text-[1.25rem] font-medium text-ink-900">
                        {pillar.label}
                      </h3>
                    </div>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-graphite-600">
                      {pillar.description}
                    </p>
                    <ul className="mt-6 space-y-2 border-t border-paper-200 pt-5">
                      {items.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/capabilities/${c.slug}`}
                            className="group/link flex items-start gap-2 text-[0.875rem] leading-snug text-graphite-700 transition-colors hover:text-ink-950"
                          >
                            <ArrowUpRight
                              className="mt-0.5 size-3.5 shrink-0 text-graphite-400 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:text-flame-600"
                              aria-hidden="true"
                            />
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Featured capability cards */}
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((c, i) => (
              <Reveal key={c.slug} delay={i * 60}>
                <Link
                  href={`/capabilities/${c.slug}`}
                  className="group/card flex h-full flex-col rounded-[4px] border border-paper-300 bg-white p-7 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-500/30 hover:shadow-[var(--shadow-lift-lg)]"
                >
                  <c.Icon
                    className="size-5 text-ink-500 transition-colors duration-300 group-hover/card:text-flame-600"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 text-[1.125rem] font-medium leading-snug text-ink-900">
                    {c.name}
                  </h3>
                  <p className="mt-2.5 flex-1 text-[0.9375rem] leading-relaxed text-graphite-600">
                    {c.blurb}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-900">
                    Read more
                    <ArrowRight
                      className="size-3.5 transition-transform duration-300 group-hover/card:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= Why Sohum — dark editorial */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-50" />
        <div
          aria-hidden="true"
          className="absolute right-[-10%] top-[-20%] h-[600px] w-[600px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(242,88,6,0.11) 0%, transparent 68%)",
          }}
        />
        <div className="container-page relative py-20 sm:py-28">
          <Reveal>
            <SectionHeading
              tone="light"
              eyebrow="Why Sohum"
              title="Small enough to be accountable. Structured enough to be trusted."
              lede="Large integrators bring process and layers of it. Small firms bring speed and, too often, improvisation. We are built to give agencies both: a lean team you can reach, running processes that have been formally appraised."
            />
          </Reveal>

          <div className="mt-16 grid gap-x-12 gap-y-12 lg:grid-cols-3">
            {[
              {
                h: "A lean structure, by design",
                p: "A flat organization and low overhead mean the people who scope your work are the people who deliver it. Decisions do not queue behind three management layers, and the rate you pay is not carrying a corporate campus.",
              },
              {
                h: "Appraised processes, not promised ones",
                p: "CMMI Level 3 for Development and for Services, plus ISO 9001, ISO/IEC 20000-1:2018, and ISO/IEC 27001. Independent appraisal is the difference between saying you have a process and being able to show it.",
              },
              {
                h: "Certified practitioners on the work",
                p: "PMI-certified project managers, GISCI and Esri certified GIS professionals, and Oracle and Amazon certified systems architects. Most of our staff hold certification in their primary area of focus.",
              },
            ].map((item, i) => (
              <Reveal key={item.h} delay={i * 80}>
                <div className="border-t-2 border-flame-500/70 pt-7">
                  <h3 className="text-[1.3125rem] font-medium leading-snug text-white">
                    {item.h}
                  </h3>
                  <p className="mt-3.5 text-[0.9375rem] leading-[1.7] text-white/60">{item.p}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Security posture — inline, factual */}
          <Reveal delay={120}>
            <div className="mt-16 flex flex-col gap-6 rounded-[4px] border border-white/10 bg-white/[0.03] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
              <div className="max-w-2xl">
                <p className="eyebrow text-flame-400">Information security</p>
                <p className="mt-3 text-[1.0625rem] leading-relaxed text-white/75">
                  Our quality policy commits us to maintaining the confidentiality, integrity, and
                  availability of information — accessible only to authorized users, through proper
                  authentication and access control. That commitment is certified under ISO/IEC 27001.
                </p>
              </div>
              <ButtonLink href="/federal" variant="onDark" className="shrink-0">
                Federal mission focus
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================= Past performance */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-20 sm:py-28">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <div>
                <SectionHeading
                  eyebrow="Past performance"
                  title="Delivered for the mission, not the demo."
                  lede="Our federal work centers on the U.S. Department of Agriculture and its Farm Service Agency, where we build the mapping, reporting, and data platforms that program staff use daily."
                />
                <div className="mt-8">
                  <ArrowLink href="/federal">How we work with agencies</ArrowLink>
                </div>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  {
                    org: "USDA Farm Service Agency",
                    prog: "DFAD",
                    desc: "Recognized program work with the Farm Service Agency's Digital Farm and Agricultural Data efforts.",
                  },
                  {
                    org: "USDA Farm Service Agency",
                    prog: "PARMO",
                    desc: "Recognized program work supporting the Farm Service Agency's Production Adjustment and Risk Management operations.",
                  },
                ].map((p) => (
                  <div
                    key={p.prog}
                    className="rounded-[4px] border border-paper-300 bg-paper-50 p-6"
                  >
                    <Building2 className="size-5 text-ink-500" strokeWidth={1.5} aria-hidden="true" />
                    <p className="mt-4 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-flame-700">
                      {p.prog}
                    </p>
                    <p className="mt-2 text-[1rem] font-medium leading-snug text-ink-900">
                      {p.org}
                    </p>
                    <p className="mt-2.5 text-[0.875rem] leading-relaxed text-graphite-600">
                      {p.desc}
                    </p>
                  </div>
                ))}

                <div className="rounded-[4px] border border-dashed border-paper-300 p-6 sm:col-span-2">
                  <p className="text-[0.9375rem] leading-relaxed text-graphite-600">
                    We also deliver for state and commercial customers, and our teams work within
                    technology ecosystems including{" "}
                    <span className="text-ink-800">Amazon Web Services</span>,{" "}
                    <span className="text-ink-800">Atlassian</span>,{" "}
                    <span className="text-ink-800">Dell</span>, and{" "}
                    <span className="text-ink-800">HP</span>, using{" "}
                    <span className="text-ink-800">SAFe</span> and{" "}
                    <span className="text-ink-800">Scrum Alliance</span> delivery frameworks.
                  </p>
                  <p className="mt-3 text-[0.8125rem] text-graphite-500">
                    Detailed past performance references are available on request.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================= Contract vehicles */}
      <section className="bg-paper-100">
        <div className="container-page py-20 sm:py-28">
          <Reveal>
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionHeading
                eyebrow="Contract vehicles"
                title="Three active pathways to put a team in place."
                lede="Every vehicle below is current, with the numbers your contracting officer needs. Where a period of performance has ended, we say so."
              />
              <ButtonLink href="/contract-vehicles" variant="secondary" className="shrink-0 self-start lg:self-auto">
                Full procurement detail
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {activeVehicles.map((v, i) => (
              <Reveal key={v.slug} delay={i * 70}>
                <Link
                  href={`/contract-vehicles#${v.slug}`}
                  className="group/v flex h-full flex-col rounded-[4px] border border-paper-300 bg-white p-7 transition-[border-color,box-shadow] duration-300 hover:border-ink-500/30 hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-flame-500" aria-hidden="true" />
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-flame-700">
                      Active
                    </span>
                  </div>
                  <h3 className="mt-5 text-[1.25rem] font-medium text-ink-900">{v.name}</h3>
                  <p className="mt-1 text-[0.8125rem] text-graphite-500">{v.holder}</p>
                  <dl className="mt-6 flex-1 space-y-2.5 border-t border-paper-200 pt-5">
                    {v.detail.slice(0, 3).map((d) => (
                      <div key={d.label} className="flex items-baseline justify-between gap-4">
                        <dt className="text-[0.8125rem] text-graphite-500">{d.label}</dt>
                        <dd className="text-right font-mono text-[0.8125rem] font-medium text-ink-800">
                          {d.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-900">
                    How to order
                    <ArrowRight
                      className="size-3.5 transition-transform duration-300 group-hover/v:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= Trust / certifications */}
      <section className="border-y border-paper-200 bg-white">
        <div className="container-page py-20 sm:py-28">
          <Reveal>
            <SectionHeading
              eyebrow="Trust center"
              title="What our certifications actually mean for your program."
              lede="A row of badges tells you nothing about risk. Here is what each appraisal and certification commits us to."
            />
          </Reveal>

          <Reveal className="mt-14">
            <CredentialCards />
          </Reveal>
        </div>
      </section>

      {/* ================================================= Leadership */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-28">
          <Reveal>
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionHeading
                eyebrow="Leadership"
                title="The people accountable for your program."
                lede="A small leadership team means the person who signs the proposal is reachable after the award."
              />
              <ButtonLink href="/about#leadership" variant="secondary" className="shrink-0 self-start lg:self-auto">
                About the company
              </ButtonLink>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {leadership.map((person, i) => (
              <Reveal key={person.name} delay={i * 70}>
                <div className="flex h-full flex-col rounded-[4px] border border-paper-300 bg-white p-7">
                  <Image
                    src={person.photo}
                    alt={`${person.name}, ${person.title}`}
                    width={121}
                    height={121}
                    sizes="64px"
                    className="size-16 rounded-full object-cover ring-1 ring-flame-500/30 ring-offset-2 ring-offset-white"
                  />
                  <h3 className="mt-5 text-[1.125rem] font-medium text-ink-900">
                    {person.name}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-flame-700">
                    {person.title}
                  </p>
                  <p className="mt-3.5 text-[0.9375rem] leading-[1.65] text-graphite-600">
                    {person.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= Careers */}
      <section className="relative overflow-hidden bg-ink-850 text-white">
        <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-40" />
        <div className="container-page relative py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal>
              <div>
                <Eyebrow tone="light">Careers</Eyebrow>
                <h2 className="mt-5 text-[1.875rem] leading-[1.15] text-white sm:text-[2.375rem]">
                  Work that ships, on systems that matter.
                </h2>
                <p className="mt-5 max-w-xl text-[1.0625rem] leading-[1.7] text-white/60">
                  Our engineers, analysts, and project managers build systems federal programs use
                  every day. Every applicant goes through a thorough interview process, and every
                  hire joins our ongoing training and mentorship programs.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/careers" variant="onDark">
                    Open positions
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </ButtonLink>
                  <ButtonLink
                    href={`mailto:${contact.emailHr}`}
                    variant="secondary"
                    className="border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.09]"
                  >
                    Send a résumé
                  </ButtonLink>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-[4px] border border-white/10 bg-white/[0.03] p-7">
                <Users className="size-5 text-flame-400" strokeWidth={1.5} aria-hidden="true" />
                <p className="mt-5 text-[0.9375rem] font-medium text-white">Benefits include</p>
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[0.875rem] text-white/60">
                  {[
                    "Health insurance",
                    "Dental",
                    "Vision",
                    "Life & AD&D",
                    "Long-term disability",
                    "401(k)",
                    "Paid time off",
                    "Tuition reimbursement",
                  ].map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <p className="mt-6 border-t border-white/10 pt-5 text-[0.8125rem] leading-relaxed text-white/40">
                  Full-time employees are eligible for health, dental, vision, life, AD&amp;D,
                  supplemental AD&amp;D, and long-term disability coverage.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================= Contact CTA */}
      <section className="bg-white">
        <div className="container-page py-20 sm:py-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-[4px] border border-paper-300 bg-paper-50">
              <div aria-hidden="true" className="absolute inset-0 grid-fine-light" />
              <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:p-16">
                <div>
                  <Eyebrow>Start a conversation</Eyebrow>
                  <h2 className="mt-5 text-[1.875rem] leading-[1.15] text-ink-900 sm:text-[2.375rem]">
                    Tell us what the mission needs.
                  </h2>
                  <p className="mt-5 max-w-lg text-[1.0625rem] leading-[1.7] text-graphite-600">
                    Whether you have a defined requirement, an expiring contract, or a modernization
                    problem you are still scoping, we will tell you plainly whether we are the right
                    team — and which vehicle is the fastest path.
                  </p>
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/contact">
                      Talk to us
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                        aria-hidden="true"
                      />
                    </ButtonLink>
                    <ButtonLink href="/contract-vehicles" variant="secondary">
                      Review contract vehicles
                    </ButtonLink>
                  </div>
                </div>

                <div className="border-t border-paper-300 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                  <p className="eyebrow text-graphite-400">Direct</p>
                  <ul className="mt-5 space-y-4 text-[0.9375rem]">
                    <li>
                      <p className="text-[0.8125rem] text-graphite-500">Business development</p>
                      <a
                        href={`mailto:${contact.emailGeneral}`}
                        className="mt-1 block font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 transition-colors hover:decoration-flame-500"
                      >
                        {contact.emailGeneral}
                      </a>
                    </li>
                    <li>
                      <p className="text-[0.8125rem] text-graphite-500">Phone</p>
                      <a
                        href={`tel:${contact.phoneHref}`}
                        className="mt-1 block font-mono font-medium text-ink-900"
                      >
                        {contact.phone}
                      </a>
                    </li>
                    <li>
                      <p className="text-[0.8125rem] text-graphite-500">Office</p>
                      <p className="mt-1 leading-relaxed text-ink-800">
                        {contact.street}
                        <br />
                        {contact.city}, {contact.state} {contact.zip}
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
