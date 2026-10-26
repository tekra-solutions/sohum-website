import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Braces,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  Files,
  MapPinned,
  Plus,
  Workflow,
  type IconComponent,
} from "@/components/icons";
import { CapabilityRail } from "@/components/home/CapabilityRail";
import { CountUp } from "@/components/home/CountUp";
import { DotGlobe } from "@/components/home/DotGlobe";
import { DotMap } from "@/components/home/DotMap";
import { LOGO_DISCLAIMER, LogoMarquee } from "@/components/ClientLogos";
import { DeliveryTimeline, type Milestone } from "@/components/home/DeliveryTimeline";
import { ScrollWords } from "@/components/home/ScrollWords";
import { SweepText } from "@/components/home/SweepText";

import {
  businessDevelopment,
  contact,
  currentAwards,
  customers,
  formatMonth,
  getActiveVehicles,
  orderingClosesIn,
  procurement,
  site,
  sources,
  today,
} from "@/content/company";
import { capabilities } from "@/lib/capabilities";

export const metadata: Metadata = {
  title: "Sohum Systems | Federal technology, built for the mission",
  description: site.description,
  alternates: { canonical: "/" },
};

const capabilityIcons: Record<string, IconComponent> = {
  "custom-application-development": Braces,
  "cloud-services-migration": Cloud,
  "artificial-intelligence-data-analytics": Cpu,
  "geographic-information-systems": MapPinned,
  "data-warehousing": Database,
  "business-intelligence": BarChart3,
  devops: Workflow,
  "test-automation": BadgeCheck,
  "program-project-management": ClipboardList,
  "enterprise-resource-planning": Boxes,
  "administrative-support": Files,
};

const milestones: Milestone[] = [
  {
    n: "01",
    phase: "Understand",
    title: "Start with the mission",
    body: "We learn the people, policy, and data behind the requirement first, so what we build fits how your program runs.",
  },
  {
    n: "02",
    phase: "Deliver",
    title: "Deliver in increments",
    body: "Short increments backed by automated testing, so progress shows up as working software you can try.",
  },
  {
    n: "03",
    phase: "Sustain",
    title: "Stay accountable",
    body: "We stay on after go-live, keeping systems secure, current, and performing for years.",
  },
];

const vehicleShort: Record<string, string> = {
  "gsa-mas": "GSA MAS",
  "seaport-nxg": "SeaPort NxG",
  "cio-sp3": "CIO-SP3 SB",
};

/** "A, B, and C" */
const listOf = (items: string[]) => new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(items);

const label = "font-brand text-[0.75rem] font-bold uppercase tracking-[.1em]";

export default function HomePage() {
  const day = today();
  const activeVehicles = getActiveVehicles(day);
  const openAwards = currentAwards.filter((a) => a.start <= day && day <= a.end);
  const years = Number(day.slice(0, 4)) - site.founded;
  const closing = activeVehicles
    .map((v) => ({ v, days: orderingClosesIn(v, day) }))
    .find((x) => x.days !== null);

  /* Each reason carries its own evidence, so the claim can be checked. */
  const reasons: { title: string; body: string; proof: string; href: string; external?: boolean }[] = [
    {
      title: "One accountable team",
      body: "Engineering, operations, and program management work together under one roof. The people who scope your work build and support it.",
      proof: "Meet the leadership team",
      href: "/about#leadership",
    },
    {
      title: "An appraised process",
      body: "Appraised at CMMI Level 3 for both Development and Services. Quality checks are written into every project plan.",
      proof: "Verify on CMMI PARS",
      href: sources.cmmiPars,
      external: true,
    },
    {
      title: "Easy to buy from",
      body: `Open for orders on ${listOf(activeVehicles.map((v) => v.name))}.`,
      proof: activeVehicles.map((v) => v.number).join(" · "),
      href: "/contract-vehicles",
    },
    {
      title: "A direct line to leadership",
      body: `${businessDevelopment.name}, our ${businessDevelopment.title.toLowerCase()}, is your contact for contracts and teaming.`,
      proof: businessDevelopment.phone,
      href: `tel:${businessDevelopment.phoneHref}`,
    },
    {
      title: "A record you can verify",
      body: "Every federal award we cite is listed in public records, with order numbers and dates.",
      proof: "View on USAspending.gov",
      href: sources.usaspending,
      external: true,
    },
    {
      title: "Small-business agility",
      body: `A ${procurement.businessSize.toLowerCase()} under NAICS ${procurement.primaryNaics}, with senior people close to the work and quick decisions.`,
      proof: `UEI ${procurement.uei}`,
      href: sources.sbaProfile,
      external: true,
    },
  ];

  const faqs = [
    {
      q: "How can my agency buy from Sohum Systems?",
      a: `We are open for new orders on ${listOf(activeVehicles.map((v) => `${v.name} (${v.number})`))}. Our contract vehicles page explains how to order on each.`,
      href: "/contract-vehicles",
    },
    {
      q: "What are your UEI, CAGE, and NAICS codes?",
      a: `Our UEI is ${procurement.uei} and our CAGE code is ${procurement.cage}. Our primary NAICS code is ${procurement.primaryNaics}, Custom Computer Programming Services.`,
      href: "/capability-statement",
    },
    {
      q: "What does CMMI Level 3 mean for my program?",
      a: "Our processes for building software and delivering services were independently appraised at Level 3. That means defined, repeatable practices for planning, quality, and risk on every engagement.",
    },
    {
      q: "Which agencies have you worked with?",
      a: `Public award records name ${customers.slice(0, 3).join(", ")}, and others.`,
      href: "/federal",
    },
    {
      q: "Do you work with teaming partners?",
      a: `Yes. Reach ${businessDevelopment.name}, our ${businessDevelopment.title}, at ${businessDevelopment.email} or ${businessDevelopment.phone}.`,
    },
    {
      q: "Where are you located?",
      a: `We are headquartered at ${contact.address}, and support programs nationwide.`,
      href: "/locations",
    },
  ];

  return (
    <div>
      {/* ================================================================ Hero */}
      <section className="relative isolate mt-[-4.5rem] flex min-h-[100svh] flex-col overflow-hidden bg-[#05070d] text-white lg:mt-[-5rem]">
        <div aria-hidden="true" className="absolute inset-0 -z-20 opacity-60 [background-image:radial-gradient(rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:120px_120px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_70%)]" />
        <div className="absolute -right-[72vw] top-[calc(-6vh-12vw)] -z-10 size-[195vw] sm:-right-[49vw] sm:size-[138vw] lg:right-[calc(26vw-89.5vh)] lg:-top-[17vh] lg:size-[179vh]">
          <DotGlobe unroll className="font-tech" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,13,.9)_0%,rgba(5,7,13,.45)_45%,transparent_70%),linear-gradient(0deg,#05070d_0%,transparent_30%),linear-gradient(180deg,rgba(5,7,13,.85)_0%,transparent_22%)]" />

        <div className="container-wide flex flex-1 flex-col justify-end pb-8 pt-32 sm:pb-10">

          <h1 className="font-brand text-[clamp(2.4rem,min(7.4vw,9vh),5rem)] font-extrabold leading-[.96] tracking-[-.035em] text-white">
            {["The systems", "your mission", "runs on."].map((line, i) => (
              <span key={line} className="-mb-[0.08em] block overflow-hidden pb-[0.08em]">
                <span
                  className="hero-line text-sweep inline-block [--sweep-from:#fa752e] [--sweep-to:#5b84ff]"
                  style={{ animationDelay: `${150 + i * 110}ms, ${700 + i * 110}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className="hero-in mt-7 max-w-[34rem] text-base leading-[1.7] text-white/75 [animation-delay:650ms] sm:text-[1.0625rem]">
            We design, build, and sustain software, cloud, data, and GIS systems for federal agencies. One accountable team since {site.founded}, trusted today by USDA and the Department of Transportation.
          </p>

          <div className="hero-in mt-9 flex flex-wrap items-center gap-3 [animation-delay:780ms]">
            <Link href="/contact" className="btn-tech bg-flame-500 text-ink-950 shadow-[0_10px_40px_-12px_rgba(242,88,6,.8)] hover:bg-white">
              Talk to our team <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href="/capability-statement" className="btn-tech border border-white/25 text-white hover:border-white hover:bg-white/10">
              Capability statement
            </Link>
            <Link href="/capabilities" className={`${label} ml-1 inline-flex min-h-11 items-center gap-1.5 text-white/70 transition-colors hover:text-white`}>
              Explore capabilities <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Proof a contracting officer looks for first. */}
          <dl className="hero-in mt-10 grid max-w-[1200px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md [animation-delay:920ms] lg:mt-14 lg:grid-cols-4">
            {[
              { k: "Appraised", v: "CMMI Level 3", d: "Development & Services" },
              {
                k: "Buy through",
                v: activeVehicles.map((v) => vehicleShort[v.slug] ?? v.name).slice(0, 2).join(" · "),
                d: closing ? `${vehicleShort[closing.v.slug] ?? closing.v.name} closes in ${closing.days} days` : `${activeVehicles.length} open contract vehicles`,
                warn: Boolean(closing),
              },
              { k: "Trusted by", v: "USDA · DOT", d: "Also U.S. Navy and CFTC" },
              { k: "Identifiers", v: `CAGE ${procurement.cage}`, d: `UEI ${procurement.uei}` },
            ].map((item) => (
              <div key={item.k} className="bg-[#070a12]/80 px-4 py-4 sm:px-5">
                <dt className={`${label} text-white/40`}>{item.k}</dt>
                <dd className="mt-2 text-sm font-semibold text-white sm:text-[0.9375rem]">{item.v}</dd>
                <dd className={`mt-0.5 text-[0.75rem] ${item.warn ? "font-semibold text-flame-400" : "text-white/50"}`}>{item.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* =========================================================== Intro */}
      <section className="bg-white text-ink-950">
        <div className="container-page pb-20 pt-24 sm:pt-28 lg:pb-28">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className={`${label} text-flame-600`}>Who we are</p>
              <SweepText className="font-brand mt-5 text-[clamp(2.3rem,4.6vw,4rem)] font-extrabold leading-[1] tracking-[-.035em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
                We build it.
                <br />
                We own the outcome.
              </SweepText>
            </div>
            <div className="lg:pt-10">
              <ScrollWords
                className="text-[1.375rem] font-medium leading-[1.4] tracking-[-.025em] sm:text-[1.625rem]"
                accent={["build", "support"]}
                text="Engineering, cloud, data, and program management sit under one roof here. The people who scope your work are the same people who build and support it, so nothing gets lost in a hand-off."
              />
              <ScrollWords
                className="mt-6 text-[1.125rem] font-medium leading-[1.5] tracking-[-.02em] sm:text-[1.25rem]"
                accent={["owns"]}
                text="When something needs fixing, you call one team, and that team owns the fix."
              />
              <Link href="/about" className="btn-tech mt-9 border border-ink-950/20 text-ink-950 hover:border-ink-950 hover:bg-ink-950 hover:text-white">
                Learn more about us <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <dl className="mt-16 grid overflow-hidden rounded-2xl border border-paper-200 sm:grid-cols-3 lg:mt-20">
            {[
              { value: years, suffix: "+", text: "Years delivering for federal programs" },
              { value: customers.length, suffix: "", text: "Federal customers named in public award records" },
              { value: openAwards.length, suffix: "", text: "Federal orders in performance today" },
            ].map((s, i) => (
              <div
                key={s.text}
                className={`flex flex-col-reverse gap-3 p-7 sm:p-8 ${i > 0 ? "border-t border-paper-200 sm:border-l sm:border-t-0" : ""}`}
              >
                <dt className="max-w-[16rem] text-[0.9375rem] leading-snug text-graphite-600">{s.text}</dt>
                <dd className="font-brand text-[clamp(3rem,5.5vw,4.5rem)] font-extrabold leading-none tracking-[-.04em]">
                  <CountUp value={s.value} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===================================================== Capabilities */}
      <CapabilityRail
        word="Capabilities"
        intro={
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <SweepText className="font-brand max-w-[18ch] text-[clamp(1.8rem,3.4vw,3rem)] font-extrabold leading-[1] tracking-[-.035em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
              Everything the mission needs. Under one team.
            </SweepText>
            <Link href="/capabilities" className="btn-tech w-fit shrink-0 bg-ink-950 text-white hover:bg-flame-500 hover:text-ink-950">
              All {capabilities.length} capabilities <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        }
      >
        {capabilities.map((c, i) => {
          const Icon = capabilityIcons[c.slug] ?? Braces;
          return (
            <Link
              key={c.slug}
              href={`/capabilities/${c.slug}`}
              className="group flex w-[17.5rem] shrink-0 snap-start flex-col border-l border-white/10 px-7 py-3 text-white sm:w-[21rem] sm:px-9"
            >
              <span className="flex items-center justify-between">
                <span className="grid size-14 place-items-center bg-white/[0.05] transition-colors group-hover:bg-flame-500/15">
                  <Icon className="size-8 text-white transition-colors group-hover:text-flame-400" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="font-tech text-xs text-white/30">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <SweepText as="h3" className="font-brand mt-8 min-h-[3.2em] text-[1.3rem] font-extrabold leading-[1.1] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
                {c.name}
              </SweepText>
              <p className="mt-4 text-sm leading-[1.65] text-white/55">{c.blurb}</p>
              <span className={`${label} mt-6 inline-flex items-center gap-2 text-white/70 transition-colors group-hover:text-flame-400`}>
                Explore <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </CapabilityRail>

      {/* ======================================================= Milestones */}
      <DeliveryTimeline
        milestones={milestones}
        heading={
          <div>
            <p className={`${label} text-flame-600`}>How we deliver</p>
            <SweepText className="font-brand mt-5 text-[clamp(2.1rem,4.2vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-.035em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
              Accountable at every milestone.
            </SweepText>
          </div>
        }
        lede={
          <p>
            Every engagement runs under processes appraised at CMMI Level 3, so scope, risk, and quality stay visible
            from the first conversation through years of operations.
          </p>
        }
      />

      {/* ===================================================== Current work */}
      <section className="overflow-hidden bg-[#0b0d12] text-white">
        <div className="container-page section-y">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className={`${label} text-flame-400`}>Current federal work</p>
              <SweepText className="font-brand mt-5 text-[clamp(2.1rem,4.2vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-.035em] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
                Trusted with the details.
              </SweepText>
            </div>
            <p className="max-w-md text-base leading-[1.75] text-white/60 lg:justify-self-end">
              Agencies rely on us for platforms their people use every day. These orders are in performance now, each listed in public federal records.
            </p>
          </div>
          <ul className="mt-14 border-t border-white/10">
            {openAwards.map((a, i) => (
              <li
                key={a.order}
                className="group grid gap-x-8 gap-y-2 border-b border-white/10 py-7 transition-colors hover:bg-white/[0.03] md:grid-cols-[2.5rem_minmax(0,14rem)_minmax(0,1fr)_14rem] md:items-baseline md:px-4"
              >
                <span className="font-tech text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
                <span className={`${label} text-white/55`}>{a.agency}</span>
                <span className="text-xl font-semibold tracking-[-.025em] transition-colors group-hover:text-flame-400 lg:text-[1.375rem]">{a.work}</span>
                <span className="text-[0.875rem] text-white/55 md:whitespace-nowrap md:text-right">
                  {a.vehicle} <span className="text-white/30">·</span> to {formatMonth(a.end)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/federal" className="btn-tech mt-10 border border-white/20 text-white hover:border-white hover:bg-white hover:text-ink-950">
            Our federal work
          </Link>
        </div>

        <div className="border-t border-white/10 pb-12 pt-10">
          <div className="container-page mb-7 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <p className={`${label} text-white/55`}>Organizations represented in our work</p>
            <Link href="/federal#organizations" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-white/75 hover:text-white">
              Who these are, grouped <ArrowRight className="inline size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <LogoMarquee />
          <div className="container-page mt-6">
            <p className="max-w-4xl text-[0.75rem] leading-relaxed text-white/35">{LOGO_DISCLAIMER}</p>
          </div>
        </div>
      </section>

      {/* ============================================================ Why us */}
      <section className="relative isolate overflow-clip bg-[#070a12] text-white">
        {/* The hero globe, unrolled: a quiet dotted world map with a slow scan line. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-6 -z-10 aspect-[2.57/1] [mask-image:linear-gradient(180deg,black_45%,transparent_100%)]"
        >
          <DotMap />
        </div>

        <div className="container-page grid gap-14 py-24 sm:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className={`${label} text-flame-400`}>Why Sohum</p>
            <SweepText className="font-brand mt-5 max-w-[14ch] text-[clamp(2.1rem,4.2vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-.035em] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
              Six reasons agencies choose us.
            </SweepText>
            <p className="mt-6 max-w-sm text-base leading-[1.75] text-white/65">
              Every claim on this list comes with a record you can check yourself, from our CMMI appraisal to our federal award history.
            </p>
            <Link href="/contact" className="btn-tech mt-9 bg-flame-500 text-ink-950 hover:bg-white">
              Talk to our team <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <ol className="border-t border-white/12">
            {reasons.map((r, i) => (
              <li key={r.title} className="group relative grid gap-x-8 gap-y-3 border-b border-white/12 py-8 sm:grid-cols-[3rem_1fr]">
                <span aria-hidden="true" className="absolute inset-y-0 -left-4 w-0.5 origin-top scale-y-0 bg-flame-500 transition-transform duration-500 group-hover:scale-y-100" />
                <span className="font-tech text-sm text-flame-400">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[1.375rem] font-bold tracking-[-.025em] text-white">{r.title}</h3>
                  <p className="mt-2.5 max-w-xl text-[0.9375rem] leading-[1.7] text-white/65">{r.body}</p>
                  <a
                    href={r.href}
                    {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 font-tech text-[0.75rem] text-white/80 transition-colors hover:border-flame-500 hover:text-white"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    {r.proof}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                    {r.external && <span className="sr-only">(opens in a new tab)</span>}
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* =============================================================== FAQ */}
      <section className="bg-white text-ink-950">
        <div className="container-page section-y grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className={`${label} text-flame-600`}>Frequently asked questions</p>
            <SweepText className="font-brand mt-5 text-[clamp(2.1rem,4.2vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-.035em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
              Questions buyers ask us.
            </SweepText>
            <p className="mt-6 max-w-sm text-base leading-[1.75] text-graphite-600">
              The questions contracting officers and partners ask us most. Something else? Email{" "}
              <a href={`mailto:${contact.emailGeneral}`} className="font-medium text-ink-950 underline decoration-flame-500 underline-offset-4">
                {contact.emailGeneral}
              </a>
              .
            </p>
          </div>
          <div className="border-t border-ink-950/15">
            {faqs.map((f, i) => (
              <details key={f.q} className="group border-b border-ink-950/15">
                <summary className="flex cursor-pointer list-none items-center gap-5 py-7 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-tech w-7 shrink-0 text-xs text-graphite-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 text-lg font-medium tracking-[-.035em] sm:text-xl">{f.q}</span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-ink-950/15 transition-[transform,background-color,border-color] duration-300 group-open:rotate-45 group-open:border-flame-500 group-open:bg-flame-500">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <div className="max-w-2xl pb-7 pl-12 text-[0.9375rem] leading-[1.8] text-graphite-600">
                  <p>{f.a}</p>
                  {f.href && (
                    <Link href={f.href} className={`${label} mt-3 inline-flex min-h-10 items-center gap-1.5 text-ink-950 hover:text-flame-700`}>
                      Learn more <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================= Closing CTA */}
      <section className="relative isolate overflow-hidden bg-[#05070d] text-white">
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
          <p className={`${label} text-white/60`}>Work with Sohum</p>
          <SweepText className="font-brand mt-6 max-w-[16ch] text-[clamp(2.4rem,5.2vw,4.5rem)] font-extrabold leading-[1] tracking-[-.035em] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
            Ready to modernize the mission?
          </SweepText>
          <p className="mt-6 max-w-md text-base leading-[1.7] text-white/65">
            Start with the challenge. We will bring the right technical and program experience to the conversation.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="btn-tech bg-flame-500 text-ink-950 hover:bg-white">
              Work with us <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href="/capability-statement" className="btn-tech border border-white/25 text-white hover:border-white hover:bg-white/10">
              Capability statement
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
