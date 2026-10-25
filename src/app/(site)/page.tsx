import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Braces,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  FileCheck2,
  Files,
  Handshake,
  Landmark,
  MapPinned,
  Plus,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { CapabilityRail } from "@/components/home/CapabilityRail";
import { CountUp } from "@/components/home/CountUp";
import { DotGlobe } from "@/components/home/DotGlobe";
import { MilestoneRoute, type Milestone } from "@/components/home/MilestoneRoute";
import { ParallaxPanel } from "@/components/home/ParallaxPanel";
import { ScrollWords } from "@/components/home/ScrollWords";
import { SweepText } from "@/components/home/SweepText";
import { mono, wide } from "@/components/home/fonts";
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
  today,
} from "@/content/company";
import { capabilities } from "@/lib/capabilities";

export const metadata: Metadata = {
  title: "Sohum Systems | Federal technology, built for the mission",
  description: site.description,
  alternates: { canonical: "/" },
};

const capabilityIcons: Record<string, LucideIcon> = {
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
    step: "01 / Understand",
    title: "Start with the mission",
    body: "The people, policy, and data behind the requirement, so what we build fits how your program runs.",
  },
  {
    step: "02 / Deliver",
    title: "Ship in the open",
    body: "Short, visible increments with automated testing. Progress you can see, not a report you have to trust.",
  },
  {
    step: "03 / Sustain",
    title: "Stay accountable",
    body: "We stay on after go-live, keeping systems secure, current, and performing for years.",
  },
];

const vehicleShort: Record<string, string> = {
  "gsa-mas": "GSA MAS",
  "seaport-nxg": "SeaPort NxG",
  "cio-sp3": "CIO-SP3 SB",
};

const label = "font-tech text-[0.6875rem] uppercase tracking-[.14em]";

export default function HomePage() {
  const day = today();
  const activeVehicles = getActiveVehicles(day);
  const openAwards = currentAwards.filter((a) => a.start <= day && day <= a.end);
  const years = Number(day.slice(0, 4)) - site.founded;
  const closing = activeVehicles
    .map((v) => ({ v, days: orderingClosesIn(v, day) }))
    .find((x) => x.days !== null);

  const reasons: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: UsersRound, title: "One accountable team", body: "Engineering, operations, and program management under one roof. No hand-offs, no one else to blame." },
    { icon: ClipboardCheck, title: "An appraised process", body: "Appraised at CMMI Level 3 for Development and Services. Quality is built in, not inspected in." },
    { icon: Landmark, title: "Easy to buy from", body: `Open for orders on ${activeVehicles.map((v) => v.name).join(", ")}.` },
    { icon: Handshake, title: "A line to leadership", body: `Our ${businessDevelopment.title.toLowerCase()} is your contact for contracts and teaming.` },
    { icon: FileCheck2, title: "A record you can verify", body: "Every award we cite is listed in public federal records." },
    { icon: Braces, title: "Small-business agility", body: `A ${procurement.businessSize.toLowerCase()} under NAICS ${procurement.primaryNaics}, with senior people close to the work.` },
  ];

  const faqs = [
    {
      q: "How can my agency buy from Sohum Systems?",
      a: `We are open for new orders on ${activeVehicles.map((v) => `${v.name} (${v.number})`).join(" and ")}. Our contract vehicles page explains how to order on each.`,
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
    <div className={`${wide.variable} ${mono.variable}`}>
      {/* ================================================================ Hero */}
      <section className="relative isolate -mt-[calc(5.25rem+1px)] flex min-h-[100svh] flex-col overflow-hidden bg-[#05070d] text-white sm:-mt-[calc(6.25rem+1px)] lg:-mt-[calc(7rem+1px)]">
        <div aria-hidden="true" className="absolute inset-0 -z-20 opacity-60 [background-image:radial-gradient(rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:120px_120px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_70%)]" />
        <div className="absolute -right-[72vw] top-[calc(-6vh-12vw)] -z-10 size-[195vw] sm:-right-[49vw] sm:size-[138vw] lg:right-[calc(26vw-89.5vh)] lg:-top-[17vh] lg:size-[179vh]">
          <DotGlobe unroll className="font-tech" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,13,.9)_0%,rgba(5,7,13,.45)_45%,transparent_70%),linear-gradient(0deg,#05070d_0%,transparent_30%)]" />

        <div className="container-page flex flex-1 flex-col justify-end pb-8 pt-32 sm:pb-10">
          <Link
            href="/contract-vehicles"
            className="hero-in group inline-flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.05] py-1.5 pl-3 pr-4 font-tech text-[0.6875rem] uppercase tracking-[.1em] text-white/80 backdrop-blur transition-colors hover:border-white/35"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-emerald-400" />
            </span>
            Open for orders
            <span className="hidden sm:inline">· {activeVehicles.map((v) => vehicleShort[v.slug] ?? v.name).join(" · ")}</span>
            <span className="sm:hidden">· {activeVehicles.length} vehicles</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>

          <h1 className="font-wide mt-7 text-[clamp(2rem,min(8.6vw,10vh),5.2rem)] font-semibold uppercase leading-[.96] tracking-[-.02em] text-white">
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
            <Link href="/capabilities" className={`${label} ml-1 inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white`}>
              Explore capabilities <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Proof a contracting officer looks for first. */}
          <dl className="hero-in mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md [animation-delay:920ms] lg:mt-14 lg:grid-cols-4">
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
                <dd className={`mt-0.5 font-tech text-[0.6875rem] ${item.warn ? "text-flame-400" : "text-white/45"}`}>{item.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Night into day: the hero dissolves through the brand glow into white. */}
      <div aria-hidden="true" className="h-[45vh] bg-[linear-gradient(180deg,#05070d_0%,#0d1430_22%,#283c99_46%,#9aaeff_68%,#fde3d3_86%,#ffffff_100%)]" />

      {/* =========================================================== Intro */}
      <section className="bg-white text-ink-950">
        <div className="container-page grid gap-14 pb-24 pt-10 lg:grid-cols-2 lg:gap-20 lg:pb-32">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="relative aspect-[16/10] w-56 overflow-hidden rounded-xl bg-night-950 sm:w-64">
              <Image src="/images/mission/ai-data-network.webp" alt="" fill sizes="256px" className="object-cover" />
            </div>
            <SweepText className="font-wide mt-10 text-[clamp(2.3rem,5vw,4.4rem)] font-semibold uppercase leading-[.95] tracking-[-.02em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
              We build it.
              <br />
              We own the
              <br />
              outcome.
            </SweepText>
          </div>

          <div>
            <ScrollWords
              className="text-[1.5rem] font-medium leading-[1.35] tracking-[-.02em] sm:text-[1.9rem]"
              accent={["accountable", "predictably", "transparently", "excuses"]}
              text="With engineering, cloud, data, and program management under one roof and one accountable team, your systems run the way your mission demands: predictably, transparently, and without excuses."
            />
            <ScrollWords
              className="mt-8 text-[1.25rem] font-medium leading-[1.4] tracking-[-.02em] sm:text-[1.45rem]"
              accent={["outcome"]}
              text="No fragmented vendors. No finger-pointing. One team that owns the outcome."
            />
            <Link href="/about" className="btn-tech mt-10 border border-ink-950/20 text-ink-950 hover:border-ink-950 hover:bg-ink-950 hover:text-white">
              Learn more about us
            </Link>

            <p className={`${label} mt-20 border-b border-paper-300 pb-4 text-graphite-500`}>
              From {years} years of federal work, <span className="text-flame-600">clarity emerges</span>
            </p>
            <dl>
              {[
                { value: years, suffix: "+", text: "Years delivering for federal programs" },
                { value: customers.length, suffix: "", text: "Federal customers named in public award records" },
                { value: openAwards.length, suffix: "", text: "Federal orders in performance today" },
              ].map((s) => (
                <div key={s.text} className="border-b border-paper-300 py-8">
                  <dd className="font-wide text-[clamp(4rem,10vw,8rem)] font-semibold leading-none tracking-[-.04em]">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </dd>
                  <dt className="mt-3 text-lg text-graphite-600">{s.text}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ===================================================== Capabilities */}
      <CapabilityRail
        word="Capabilities"
        intro={
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <SweepText className="font-wide max-w-[18ch] text-[clamp(1.8rem,3.4vw,3rem)] font-semibold uppercase leading-[1] tracking-[-.02em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
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
                  <Icon className="dot-matrix size-10 text-white transition-colors group-hover:text-flame-400" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="font-tech text-xs text-white/30">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <SweepText as="h3" className="font-wide mt-8 min-h-[3.2em] text-[1.3rem] font-semibold uppercase leading-[1.1] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
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
      <MilestoneRoute
        milestones={milestones}
        heading={
          <SweepText className="font-wide text-[clamp(2.1rem,4.6vw,4.2rem)] font-semibold uppercase leading-[.95] tracking-[-.02em] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
            Accountable
            <br />
            at every
            <br />
            milestone
          </SweepText>
        }
      />

      {/* ===================================================== Current work */}
      <section className="overflow-hidden bg-[#0b0d12] text-white">
        <div className="container-page section-y">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <SweepText className="font-wide text-[clamp(2.1rem,4.6vw,4.2rem)] font-semibold uppercase leading-[.95] tracking-[-.02em] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
              Trusted with
              <br />
              the details
            </SweepText>
            <p className="max-w-md text-base leading-[1.75] text-white/60 lg:justify-self-end">
              Agencies rely on us for platforms their people use every day. These orders are in performance now, each listed in public federal records.
            </p>
          </div>
          <ul className="mt-14 border-t border-white/10">
            {openAwards.map((a, i) => (
              <li key={a.order} className="group grid gap-3 border-b border-white/10 py-7 transition-colors hover:bg-white/[0.03] sm:grid-cols-[4rem_1.2fr_2fr_auto] sm:items-center sm:gap-6 sm:px-4">
                <span className="font-tech text-xs text-white/30">{String(i + 1).padStart(2, "0")}</span>
                <span className={`${label} text-white/50`}>{a.agency}</span>
                <span className="text-xl font-medium tracking-[-.02em] transition-colors group-hover:text-flame-400 sm:text-2xl">{a.work}</span>
                <span className={`${label} text-white/40`}>{a.vehicle} · to {formatMonth(a.end)}</span>
              </li>
            ))}
          </ul>
          <Link href="/federal" className="btn-tech mt-10 border border-white/20 text-white hover:border-white hover:bg-white hover:text-ink-950">
            Our federal work
          </Link>
        </div>

        <div className="border-t border-white/10 py-10" aria-label="Federal customers">
          <div className="flex w-max marquee">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 || undefined}>
                {customers.map((name) => (
                  <li key={name} className="font-wide flex items-center whitespace-nowrap text-[clamp(1.6rem,3.2vw,2.8rem)] font-semibold uppercase text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.45)]">
                    <span className="px-8">{name}</span>
                    <span className="size-2.5 rounded-full bg-flame-500" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ Why us */}
      <ParallaxPanel
        className="bg-night-950 text-white"
        background={
          <>
            <Image src="/images/mission/connected-globe.webp" alt="" fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,13,.85),rgba(5,7,13,.55)_40%,rgba(5,7,13,.92))]" />
          </>
        }
      >
        <div className="container-page py-28 sm:py-36">
          <p className={`${label} text-center text-white/60`}>Why Sohum</p>
          <SweepText className="font-wide mx-auto mt-6 max-w-[16ch] text-center text-[clamp(2.2rem,5.4vw,5rem)] font-semibold uppercase leading-[.95] tracking-[-.02em] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
            Technology that works as hard as you do
          </SweepText>
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="group rounded-2xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-md transition-colors hover:border-flame-500/50 hover:bg-white/[0.1]">
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-flame-400" strokeWidth={1.6} aria-hidden="true" />
                  <span className="font-tech text-xs text-white/30">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-10 text-lg font-semibold tracking-[-.02em]">{title}</h3>
                <p className="mt-2 text-sm leading-[1.7] text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </ParallaxPanel>

      {/* =============================================================== FAQ */}
      <section className="bg-white text-ink-950">
        <div className="container-page section-y grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SweepText className="font-wide text-[clamp(3rem,8vw,7rem)] font-semibold uppercase leading-[.9] text-ink-950 [--sweep-from:#f25806] [--sweep-to:#304368]">
              F.A.Q
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
                  <span className="flex-1 text-lg font-medium tracking-[-.02em] sm:text-xl">{f.q}</span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-ink-950/15 transition-[transform,background-color,border-color] duration-300 group-open:rotate-45 group-open:border-flame-500 group-open:bg-flame-500">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <div className="max-w-2xl pb-7 pl-12 text-[0.9375rem] leading-[1.8] text-graphite-600">
                  <p>{f.a}</p>
                  {f.href && (
                    <Link href={f.href} className={`${label} mt-4 inline-flex items-center gap-1.5 text-ink-950 hover:text-flame-700`}>
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
        <div className="absolute left-1/2 top-[60%] -z-10 aspect-square w-[184vw] -translate-x-1/2 sm:w-[138vw] lg:w-[110vw]">
          <DotGlobe tilt={34} spin={3} lens={false} startLng={60} className="font-tech" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#05070d_20%,transparent_70%)]" />
        <div className="container-page flex min-h-[85vh] flex-col items-center pt-28 text-center sm:pt-36">
          <p className={`${label} text-white/60`}>Work with Sohum</p>
          <SweepText className="font-wide mt-6 max-w-[14ch] text-[clamp(2.4rem,6.4vw,6rem)] font-semibold uppercase leading-[.94] tracking-[-.02em] text-white [--sweep-from:#fa752e] [--sweep-to:#5b84ff]">
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
