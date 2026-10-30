import Image from "next/image";
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
  Mail,
  MapPinned,
  Phone,
  Plus,
  Workflow,
  type IconComponent,
} from "@/components/icons";
import { DotGlobe } from "@/components/home/DotGlobe";
import { LOGO_DISCLAIMER, LogoMarquee } from "@/components/ClientLogos";
import { CopyValue } from "@/components/CopyValue";
import { AwardTimeline, type TimelineRow } from "@/components/home/AwardTimeline";
import { DeliveryTimeline, type Milestone } from "@/components/home/DeliveryTimeline";

import {
  businessDevelopment,
  contact,
  currentAwards,
  customers,
  formatDate,
  formatMonth,
  getActiveVehicles,
  getVisibleCredentials,
  getVisibleVehicles,
  leadership,
  naics,
  orderingClosesIn,
  pastPerformance,
  procurement,
  site,
  socioeconomic,
  sources,
  today,
  vehicleStatus,
} from "@/content/company";
import { capabilities } from "@/lib/capabilities";

export const metadata: Metadata = {
  title: { absolute: "Sohum Systems | Federal software, cloud, data, and GIS" },
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
    title: "Learn the program first",
    body: "We start with the people, policy, and data behind the requirement, so what we build fits how your program runs.",
  },
  {
    title: "Deliver in short increments",
    body: "Each increment is tested automatically and shows up as working software your team can try.",
  },
  {
    title: "Stay on after launch",
    body: "We keep systems secure, current, and running for years after go-live.",
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
const heading = "font-brand mt-5 text-[clamp(2.1rem,4.2vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-.035em]";

export default function HomePage() {
  const day = today();
  const activeVehicles = getActiveVehicles(day);
  const openAwards = currentAwards.filter((a) => a.start <= day && day <= a.end);
  const years = Number(day.slice(0, 4)) - site.founded;
  const closing = activeVehicles
    .map((v) => ({ v, days: orderingClosesIn(v, day) }))
    .find((x) => x.days !== null);
  const credentials = getVisibleCredentials(day);
  const buyVehicles = getVisibleVehicles(day);
  const pointOfContact = leadership.find((l) => l.name === businessDevelopment.name);

  /* Completed contracts and current orders on one axis, oldest first. */
  const record: TimelineRow[] = [
    ...pastPerformance.flatMap((p) =>
      p.start && p.end && p.end < day
        ? [{ key: p.id, agency: p.agency, title: p.name, reference: p.contract ?? p.program, start: p.start, end: p.end, done: true }]
        : [],
    ),
    ...openAwards.map((a) => ({
      key: a.order,
      agency: a.agency,
      title: a.work,
      reference: `Order ${a.order} · ${a.vehicle}`,
      start: a.start,
      end: a.end,
    })),
  ].sort((x, y) => x.start.localeCompare(y.start));
  const recordFrom = record[0]?.start.slice(0, 4);
  const recordTo = record.reduce((m, r) => (r.end > m ? r.end : m), "").slice(0, 4);

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
        <div className="absolute -right-[72vw] top-[calc(-6vh-12vw)] -z-10 size-[195vw] sm:-right-[49vw] sm:size-[138vw] lg:right-[calc(26vw-89.5vh-max(0px,(100vw-1440px)/4))] lg:-top-[17vh] lg:size-[179vh]">
          <DotGlobe unroll className="font-tech" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,13,.9)_0%,rgba(5,7,13,.45)_45%,transparent_70%),linear-gradient(0deg,#05070d_0%,transparent_30%),linear-gradient(180deg,rgba(5,7,13,.85)_0%,transparent_22%)]" />

        <div className="container-page flex flex-1 flex-col justify-end pb-8 pt-32 sm:pb-10">
          <h1 className="font-brand text-[clamp(2.4rem,min(7vw,8.5vh),4.75rem)] font-extrabold leading-[.98] tracking-[-.035em] text-white">
            {["Software, cloud,", "data, and GIS for", "federal agencies."].map((line, i) => (
              <span key={line} className="-mb-[0.08em] block overflow-hidden pb-[0.08em]">
                <span className="hero-line inline-block" style={{ animationDelay: `${150 + i * 110}ms` }}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className="hero-in mt-7 max-w-[34rem] text-base leading-[1.7] text-white/75 [animation-delay:650ms] sm:text-[1.0625rem]">
            Sohum Systems is a small business in Overland Park, Kansas. Since {site.founded} we have designed, built, and
            maintained systems for USDA, the Department of Transportation, and other federal customers.
          </p>

          <div className="hero-in mt-9 flex flex-wrap items-center gap-3 [animation-delay:780ms]">
            <Link href="/contact" className="btn-tech bg-flame-500 text-ink-950 hover:bg-white">
              Talk to our team <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href="/capability-statement" className="btn-tech border border-white/25 text-white hover:border-white hover:bg-white/10">
              Capability statement
            </Link>
          </div>

          {/* Proof a contracting officer looks for first. */}
          <dl className="hero-in mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 [animation-delay:920ms] lg:mt-14 lg:grid-cols-4">
            {[
              { k: "Appraised", v: "CMMI Level 3", d: "Development & Services", href: "#credentials" },
              {
                k: "Buy through",
                href: "#order",
                v: activeVehicles.map((v) => vehicleShort[v.slug] ?? v.name).slice(0, 2).join(" · "),
                d: closing ? `${vehicleShort[closing.v.slug] ?? closing.v.name} closes in ${closing.days} days` : `${activeVehicles.length} open contract vehicles`,
                warn: Boolean(closing),
              },
              { k: "Customers", v: "USDA · DOT", d: "Also U.S. Navy and CFTC", href: "#record" },
              { k: "Identifiers", v: `CAGE ${procurement.cage}`, d: `UEI ${procurement.uei}`, href: "#order" },
            ].map((item) => (
              <div key={item.k} className="group relative bg-[#070a12] px-4 py-4 transition-colors hover:bg-[#0d121f] sm:px-5">
                <dt className={`${label} text-white/40`}>{item.k}</dt>
                <dd className="mt-2 text-sm font-semibold text-white sm:text-[0.9375rem]">
                  <a href={item.href} className="outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-flame-400">
                    {item.v}
                  </a>
                </dd>
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
              <p className={`${label} text-flame-600`}>About Sohum</p>
              <h2 className={`${heading} max-w-[14ch]`}>One team from scoping to support.</h2>
            </div>
            <div className="lg:pt-12">
              <p className="text-[1.25rem] font-medium leading-[1.5] tracking-[-.02em] sm:text-[1.4375rem]">
                Engineering, cloud, data, and program management work under one roof here. The people who scope your work
                are the same people who build and support it.
              </p>
              <p className="mt-5 text-[1.0625rem] leading-[1.75] text-graphite-600">
                When something needs fixing, you call one team, and that team fixes it. We have worked this way since{" "}
                {site.founded}, mostly for USDA and its Farm Service Agency.
              </p>
              <Link href="/about" className="btn-tech mt-9 border border-ink-950/20 text-ink-950 hover:border-ink-950 hover:bg-ink-950 hover:text-white">
                About the company <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <dl className="mt-16 grid overflow-hidden rounded-xl border border-paper-200 sm:grid-cols-3 lg:mt-20">
            {[
              { value: `${years}+`, text: "Years delivering for federal programs" },
              { value: customers.length, text: "Federal customers named in public award records" },
              { value: openAwards.length, text: "Federal orders in performance today" },
            ].map((s, i) => (
              <div
                key={s.text}
                className={`flex flex-col-reverse gap-3 p-7 sm:p-8 ${i > 0 ? "border-t border-paper-200 sm:border-l sm:border-t-0" : ""}`}
              >
                <dt className="max-w-[16rem] text-[0.9375rem] leading-snug text-graphite-600">{s.text}</dt>
                <dd className="font-brand text-[clamp(3rem,5.5vw,4.5rem)] font-extrabold leading-none tracking-[-.04em]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===================================================== Capabilities */}
      <section className="border-t border-paper-200 bg-paper-50 text-ink-950">
        <div className="container-page section-y">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`${label} text-flame-600`}>Capabilities</p>
              <h2 className={heading}>What we do</h2>
            </div>
            <Link href="/capabilities" className="btn-tech w-fit shrink-0 border border-ink-950/20 text-ink-950 hover:border-ink-950 hover:bg-ink-950 hover:text-white">
              All {capabilities.length} capabilities <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-paper-200 bg-paper-200 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => {
              const Icon = capabilityIcons[c.slug] ?? Braces;
              return (
                <li key={c.slug} className="bg-white">
                  <Link href={`/capabilities/${c.slug}`} className="group flex h-full gap-4 p-6 transition-colors hover:bg-paper-50 sm:p-7">
                    <Icon className="mt-0.5 size-6 shrink-0 text-flame-600" strokeWidth={1.5} aria-hidden="true" />
                    <span>
                      <span className="block text-[1.0625rem] font-bold tracking-[-.02em] group-hover:text-flame-700">{c.name}</span>
                      <span className="mt-1.5 block text-[0.9375rem] leading-[1.6] text-graphite-600">{c.blurb}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {/* Fills the grid's last cell; eleven capabilities leave one open in both layouts. */}
            <li className="bg-ink-950 text-white">
              <Link href="/contact" className="group flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
                <span className="text-[1.0625rem] font-bold tracking-[-.02em]">Not sure which fits your requirement?</span>
                <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-flame-400 group-hover:text-white">
                  Ask us <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* ======================================================= Milestones */}
      <DeliveryTimeline
        milestones={milestones}
        heading={
          <div>
            <p className={`${label} text-flame-600`}>How we work</p>
            <h2 className={heading}>How a program runs with us</h2>
          </div>
        }
        lede={
          <p>
            Every engagement runs under processes appraised at CMMI Level 3, so you can see scope, risk, and quality from the
            first meeting through years of operations.
          </p>
        }
      />

      {/* ====================================================== Credentials */}
      <section id="credentials" className="scroll-mt-20 border-t border-paper-200 bg-white text-ink-950">
        <div className="container-page py-20 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
            <div>
              <p className={`${label} text-flame-600`}>Credentials</p>
              <h2 className="font-brand mt-5 text-[clamp(1.9rem,3.4vw,2.75rem)] font-extrabold leading-[1.04] tracking-[-.035em]">
                Appraisals and certifications
              </h2>
            </div>
            <p className="max-w-xl text-[1.0625rem] leading-[1.75] text-graphite-600 lg:justify-self-end">
              Our software, service, quality, and security practices are appraised or certified by outside bodies against
              published standards.
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-paper-200 bg-paper-200 lg:grid-cols-5">
            {credentials.map((c, i) => (
              <li
                key={c.short}
                className={`flex flex-col bg-white p-5 sm:p-6 ${i === credentials.length - 1 && credentials.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""}`}
              >
                <div className="flex h-14 items-center">
                  <Image src={c.badge} alt="" width={422} height={110} className="h-14 w-auto max-w-full object-contain object-left" />
                </div>
                <p className="mt-6 text-[0.9375rem] font-semibold leading-snug">{c.name}</p>
                <p className="mt-1 text-[0.8125rem] text-graphite-600">{c.kind}</p>
                {c.verifyAt && (
                  <a
                    href={c.verifyAt.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex min-h-8 items-center gap-1 pt-3 text-[0.8125rem] font-semibold text-ink-950 hover:text-flame-700"
                  >
                    {c.verifyAt.label} <ArrowUpRight className="size-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===================================================== Current work */}
      <section id="record" className="scroll-mt-20 overflow-hidden bg-[#0b0d12] text-white">
        <div className="container-page section-y">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className={`${label} text-flame-400`}>Federal contract record</p>
              <h2 className={heading}>Federal work since {recordFrom}</h2>
            </div>
            <p className="max-w-md text-base leading-[1.75] text-white/60 lg:justify-self-end">
              Completed and current federal work, with orders running through {recordTo}. Each entry is a public record listed
              with its order number and period of performance.
            </p>
          </div>
          <div className="mt-14">
            <AwardTimeline rows={record} day={day} />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/federal" className="btn-tech border border-white/20 text-white hover:border-white hover:bg-white hover:text-ink-950">
              Our federal work
            </Link>
            <a
              href={sources.usaspending}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Verify on USAspending.gov <ArrowUpRight className="size-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pb-12 pt-10">
          <div className="container-page mb-7 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <p className={`${label} text-white/55`}>Organizations represented in our work</p>
            <Link href="/federal#organizations" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-white/75 hover:text-white">
              See them grouped <ArrowRight className="inline size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <LogoMarquee />
          <div className="container-page mt-6">
            <p className="max-w-4xl text-[0.75rem] leading-relaxed text-white/35">{LOGO_DISCLAIMER}</p>
          </div>
        </div>
      </section>

      {/* ======================================================= Leadership */}
      <section className="bg-white text-ink-950">
        <div className="container-page section-y grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className={`${label} text-flame-600`}>Leadership</p>
            <h2 className={heading}>Who runs Sohum</h2>
            <p className="mt-6 max-w-sm text-base leading-[1.75] text-graphite-600">
              Our leaders have decades in technology and the government market, and they stay involved in every program.
            </p>
            <Link href="/about#leadership" className="btn-tech mt-9 border border-ink-950/20 text-ink-950 hover:border-ink-950 hover:bg-ink-950 hover:text-white">
              Full bios <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="border-t border-ink-950/12">
            {leadership.map((p) => (
              <li key={p.name} className="grid grid-cols-[4rem_1fr] items-center gap-x-6 border-b border-ink-950/12 py-7 sm:grid-cols-[5rem_1fr]">
                <Image
                  src={p.photo}
                  alt={p.name}
                  width={121}
                  height={121}
                  className="size-16 rounded-full object-cover ring-1 ring-ink-950/10 sm:size-20"
                />
                <div>
                  <h3 className="text-[1.375rem] font-bold tracking-[-.025em]">{p.name}</h3>
                  <p className={`${label} mt-1 text-flame-700`}>{p.title}</p>
                  <p className="mt-2.5 max-w-xl text-[0.9375rem] leading-[1.7] text-graphite-600">{p.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================ For contracting officers */}
      <section id="order" className="scroll-mt-20 border-t border-paper-200 bg-paper-50 text-ink-950">
        <div className="container-page section-y">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
            <div>
              <p className={`${label} text-flame-600`}>For contracting officers</p>
              <h2 className={heading}>How to buy from us</h2>
            </div>
            <p className="max-w-xl text-[1.0625rem] leading-[1.75] text-graphite-600 lg:justify-self-end">
              Contract numbers, identifiers, and ordering periods, checked against federal records on{" "}
              {formatDate(sources.checkedOn)}. Click any number to copy it.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-start">
            <ul className="grid gap-4">
              {buyVehicles.map((v) => {
                const status = vehicleStatus(v, day);
                const closesIn = orderingClosesIn(v, day);
                return (
                  <li key={v.slug} className="rounded-xl border border-paper-200 bg-white p-6 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {v.badge && (
                          <Image src={v.badge} alt="" width={272} height={170} className="h-12 w-auto rounded-md border border-paper-200" />
                        )}
                        <div>
                          <h3 className="text-lg font-bold leading-snug tracking-[-.02em]">{v.name}</h3>
                          <p className="text-[0.8125rem] text-graphite-600">{v.holder}</p>
                        </div>
                      </div>
                      {status === "Active" ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${
                            closesIn !== null ? "bg-flame-500/12 text-flame-700" : "bg-emerald-500/10 text-emerald-700"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${closesIn !== null ? "bg-flame-500" : "bg-emerald-500"}`} aria-hidden="true" />
                          {closesIn !== null ? `Ordering closes in ${closesIn} day${closesIn === 1 ? "" : "s"}` : "Open for orders"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-paper-200 px-3 py-1 text-[0.8125rem] font-semibold text-graphite-700">{status}</span>
                      )}
                    </div>
                    <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-paper-200 pt-5 sm:grid-cols-[auto_auto_1fr]">
                      <div>
                        <dt className={`${label} text-graphite-500`}>Contract</dt>
                        <dd className="mt-1.5 text-[0.9375rem] font-semibold">
                          <CopyValue value={v.number} label={`${v.name} contract number`} />
                        </dd>
                      </div>
                      <div>
                        <dt className={`${label} text-graphite-500`}>{status === "Active" ? "Ordering through" : "Task orders run to"}</dt>
                        <dd className="mt-1.5 text-[0.9375rem] font-semibold">
                          {status === "Active" || !v.taskOrdersEndOn ? formatDate(v.orderingEndsOn) : formatDate(v.taskOrdersEndOn)}
                        </dd>
                      </div>
                      <div>
                        <dt className={`${label} text-graphite-500`}>Order types</dt>
                        <dd className="mt-1.5 text-[0.875rem] leading-snug text-graphite-700">{v.orderTypes}</dd>
                      </div>
                    </dl>
                    {closesIn !== null && v.taskOrdersEndOn && (
                      <p className="mt-5 rounded-xl bg-flame-500/8 px-4 py-3 text-[0.875rem] leading-relaxed text-ink-900">
                        New orders must be placed by {formatDate(v.orderingEndsOn)}. Task orders awarded by then can run through{" "}
                        {formatMonth(v.taskOrdersEndOn)}.
                      </p>
                    )}
                    <Link
                      href={`/contract-vehicles#${v.slug}`}
                      className="mt-5 inline-flex min-h-8 items-center gap-1.5 text-[0.875rem] font-semibold text-ink-950 hover:text-flame-700"
                    >
                      How to order on {vehicleShort[v.slug] ?? v.name} <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <aside aria-labelledby="identifiers" className="rounded-xl bg-ink-950 p-7 text-white sm:p-8 lg:sticky lg:top-28">
              <h3 id="identifiers" className={`${label} text-white/55`}>
                Company identifiers
              </h3>
              <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
                {[
                  { k: "UEI", v: procurement.uei },
                  { k: "CAGE", v: procurement.cage },
                  { k: "Primary NAICS", v: procurement.primaryNaics },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-[0.875rem] text-white/60">{row.k}</dt>
                    <dd className="text-[0.9375rem] font-semibold">
                      <CopyValue value={row.v} label={row.k} />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6">
                <p className="text-[0.875rem] text-white/60">All NAICS codes</p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {naics.map((n) => (
                    <li
                      key={n.code}
                      title={n.label}
                      className={`rounded-md border px-2 py-1 font-tech text-[0.8125rem] ${n.primary ? "border-flame-500/60 text-flame-300" : "border-white/15 text-white/75"}`}
                    >
                      {n.code}
                      <span className="sr-only">, {n.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6">
                <p className="text-[0.875rem] text-white/60">Size and designations</p>
                <ul className="mt-2.5 space-y-1.5">
                  {socioeconomic(day).map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-[0.9375rem]">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-flame-500" aria-hidden="true" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/capability-statement" className="btn-tech bg-flame-500 text-ink-950 hover:bg-white">
                  Capability statement
                </Link>
                <a
                  href={sources.sbaProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tech border border-white/25 text-white hover:border-white hover:bg-white/10"
                >
                  SBA profile <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* =============================================================== FAQ */}
      <section className="bg-white text-ink-950">
        <div className="container-page section-y grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className={`${label} text-flame-600`}>Questions</p>
            <h2 className={heading}>Common questions</h2>
            <p className="mt-6 max-w-sm text-base leading-[1.75] text-graphite-600">
              Something else? Email{" "}
              <a href={`mailto:${contact.emailGeneral}`} className="font-medium text-ink-950 underline decoration-flame-500 underline-offset-4">
                {contact.emailGeneral}
              </a>
              .
            </p>
          </div>
          <div className="border-t border-ink-950/15">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-ink-950/15">
                <summary className="flex cursor-pointer list-none items-center gap-5 py-6 text-left [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-lg font-medium tracking-[-.025em] sm:text-xl">{f.q}</span>
                  <Plus className="size-5 shrink-0 text-graphite-500 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <div className="max-w-2xl pb-7 text-[0.9375rem] leading-[1.8] text-graphite-600">
                  <p>{f.a}</p>
                  {f.href && (
                    <Link href={f.href} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[0.875rem] font-semibold text-ink-950 hover:text-flame-700">
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
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-28">
          <h2 className="font-brand max-w-[18ch] text-[clamp(2.2rem,4.6vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-.035em]">
            Have a requirement coming up?
          </h2>
          <p className="mt-6 max-w-md text-base leading-[1.7] text-white/65">
            Tell us what you need and when. We will tell you whether we are a fit and how to put us under contract.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="btn-tech bg-flame-500 text-ink-950 hover:bg-white">
              Contact us <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href="/capability-statement" className="btn-tech border border-white/25 text-white hover:border-white hover:bg-white/10">
              Capability statement
            </Link>
          </div>

          <div className="mt-14 flex w-full max-w-xl flex-col items-center gap-5 border-t border-white/10 pt-10 sm:flex-row sm:justify-center sm:text-left">
            {pointOfContact && (
              <Image
                src={pointOfContact.photo}
                alt=""
                width={121}
                height={121}
                className="size-16 shrink-0 rounded-full object-cover ring-2 ring-white/10"
              />
            )}
            <div>
              <p className={`${label} text-white/50`}>Contracts and teaming</p>
              <p className="mt-1.5 text-lg font-semibold">
                {businessDevelopment.name}
                <span className="font-normal text-white/55">, {businessDevelopment.title}</span>
              </p>
              <p className="mt-1.5 flex flex-wrap justify-center gap-x-5 text-[0.9375rem] text-white/75 sm:justify-start">
                <a href={`tel:${businessDevelopment.phoneHref}`} className="inline-flex min-h-8 items-center gap-2 hover:text-white">
                  <Phone className="size-4 text-flame-400" aria-hidden="true" />
                  {businessDevelopment.phone}
                </a>
                <a href={`mailto:${businessDevelopment.email}`} className="inline-flex min-h-8 items-center gap-2 hover:text-white">
                  <Mail className="size-4 text-flame-400" aria-hidden="true" />
                  {businessDevelopment.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
