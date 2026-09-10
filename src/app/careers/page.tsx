import type { Metadata } from "next";
import { ArrowUpRight, GraduationCap, HeartHandshake, MapPin, Users2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Badge, Eyebrow, SectionHeading } from "@/components/ui";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Careers at Sohum Systems — engineering, analysis, and program roles building federal systems, with health, dental, vision, 401(k), tuition reimbursement, and mentorship programs.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Careers | Sohum Systems",
    description: "Build the systems federal programs depend on. Open engineering and analyst roles.",
    url: `${site.url}/careers`,
  },
};

/**
 * Roles currently listed by the company. Kept as data so the page renders an
 * honest empty state if the list is cleared, rather than stale postings.
 */
const openRoles = [
  { title: "Software Engineer", discipline: "Engineering", location: "Overland Park, KS" },
  { title: "Senior Software Developer", discipline: "Engineering", location: "Overland Park, KS" },
  { title: "Software Developer", discipline: "Engineering", location: "Kansas City, MO" },
  { title: "Software Test Engineer", discipline: "Quality Engineering", location: "Kansas City, MO" },
  { title: "Business Analyst", discipline: "Program Delivery", location: "Kansas City, MO" },
];

const benefits = [
  { group: "Health", items: ["Health insurance", "Dental insurance", "Vision insurance"] },
  {
    group: "Protection",
    items: ["Life insurance", "AD&D insurance", "Supplemental AD&D", "Long-term disability"],
  },
  { group: "Time", items: ["Paid time off", "Sick leave"] },
  { group: "Growth", items: ["Tuition reimbursement", "401(k) retirement plan"] },
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        crumbs={[{ label: "Careers" }]}
        title="Build systems that people actually depend on."
        lede="Our engineers, analysts, and project managers work on federal platforms used every day by program staff across the country. The work is technical, the scope is real, and what you ship stays in service."
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Now hiring</p>
            <p className="mt-4 font-[family-name:var(--font-display)] text-[2.75rem] font-medium leading-none text-white">
              {openRoles.length}
            </p>
            <p className="mt-2 text-[0.9375rem] text-white/55">
              open roles across engineering, quality, and program delivery
            </p>
            <a
              href={`mailto:${contact.emailHr}?subject=Application`}
              className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-flame-400 transition-colors hover:text-white"
            >
              {contact.emailHr}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        }
      />

      {/* ---- Value proposition ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-18 sm:py-24">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
              <div className="self-start">
                <Eyebrow>Why here</Eyebrow>
                <h2 className="sr-only">Why work at Sohum Systems</h2>
              </div>
              <div>
                <p className="max-w-3xl text-[1.25rem] font-medium leading-[1.55] tracking-[-0.015em] text-ink-900 sm:text-[1.4375rem]">
                  At a small firm, your work is visible. There is no layer between what you build and
                  the program that uses it.
                </p>
                <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-graphite-600">
                  We are selective about hiring — every applicant goes through a thorough interview
                  process — and deliberate about what happens afterward. Everyone we hire joins our
                  ongoing training programs and becomes an automatic member of our mentorship
                  program. Most of our people hold certification in their primary area of focus, and
                  we support them in getting there.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: Users2,
                h: "Mentorship from day one",
                p: "Every hire becomes an automatic member of our mentorship program — not a program you have to seek out.",
              },
              {
                Icon: GraduationCap,
                h: "Certification supported",
                p: "Ongoing training programs and tuition reimbursement, because most of our team holds certification in their focus area.",
              },
              {
                Icon: HeartHandshake,
                h: "A team, not a bench",
                p: "We work hard to maintain a fun, energized environment. Team effort is how the work actually gets done here.",
              },
              {
                Icon: MapPin,
                h: "Kansas City rooted",
                p: "Headquartered in Overland Park with work across the metro, supporting federal programs nationwide.",
              },
            ].map((item, i) => (
              <Reveal key={item.h} delay={i * 60}>
                <div className="border-t border-paper-300 pt-6">
                  <item.Icon
                    className="size-5 text-ink-500"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-[1.0625rem] font-medium leading-snug text-ink-900">
                    {item.h}
                  </h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-graphite-600">
                    {item.p}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Open roles ---- */}
      <section id="openings" className="scroll-mt-28 bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Open positions"
              title="Current openings"
              lede="Do not see your role? We review résumés from strong engineers and analysts year-round."
            />
          </Reveal>

          <div className="mt-12">
            {openRoles.length === 0 ? (
              <div className="rounded-[4px] border border-dashed border-paper-300 bg-white p-10 text-center">
                <p className="text-[1.0625rem] text-ink-900">
                  No positions are posted right now.
                </p>
                <p className="mt-2 text-[0.9375rem] text-graphite-600">
                  We still welcome résumés at{" "}
                  <a href={`mailto:${contact.emailHr}`} className="underline underline-offset-4">
                    {contact.emailHr}
                  </a>
                  .
                </p>
              </div>
            ) : (
              <ul className="grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300">
                {openRoles.map((role, i) => (
                  <Reveal key={role.title + role.location} as="li" delay={i * 50} className="bg-white">
                    <div>
                      <a
                        href={`mailto:${contact.emailHr}?subject=${encodeURIComponent(
                          `Application — ${role.title} (${role.location})`,
                        )}`}
                        className="group/role flex flex-col gap-4 p-6 transition-colors hover:bg-paper-50 sm:flex-row sm:items-center sm:justify-between sm:p-7"
                      >
                        <div>
                          <h3 className="text-[1.125rem] font-medium text-ink-900">
                            {role.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <Badge>{role.discipline}</Badge>
                            <span className="flex items-center gap-1.5 text-[0.875rem] text-graphite-700">
                              <MapPin className="size-3.5 text-graphite-400" aria-hidden="true" />
                              {role.location}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-2 text-[0.875rem] font-medium text-ink-900">
                          Apply
                          <ArrowUpRight
                            className="size-4 transition-transform duration-300 group-hover/role:translate-x-0.5 group-hover/role:-translate-y-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </a>
                    </div>
                  </Reveal>
                ))}
              </ul>
            )}

            <p className="mt-5 text-[0.8125rem] text-graphite-500">
              Positions are based at {contact.officeAlt} and in the greater Kansas City area unless
              otherwise noted.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Benefits ---- */}
      <section className="relative overflow-hidden border-y border-paper-200 bg-ink-900 text-white">
        <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-45" />
        <div className="container-page relative py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              tone="light"
              eyebrow="Benefits"
              title="What we offer."
              lede="Full-time employees are eligible for health, dental, vision, life, AD&D, supplemental AD&D, and long-term disability coverage."
            />
          </Reveal>

          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((group, i) => (
              <Reveal key={group.group} delay={i * 60}>
                <div className="border-t border-white/15 pt-6">
                  <p className="eyebrow text-flame-400">{group.group}</p>
                  <ul className="mt-5 space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.9375rem] text-white/70">
                        <span
                          className="mt-[0.4375rem] size-1 shrink-0 rounded-full bg-flame-400"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- EEO ---- */}
      <section className="bg-white">
        <div className="container-page py-18 sm:py-20">
          <Reveal>
            <div className="grid gap-8 rounded-[4px] border border-paper-300 bg-paper-50 p-8 sm:p-10 lg:grid-cols-[0.35fr_0.65fr] lg:gap-14">
              <div>
                <Eyebrow>Equal opportunity</Eyebrow>
                <h2 className="mt-4 text-[1.375rem] font-medium leading-snug text-ink-900">
                  The best person for the role.
                </h2>
              </div>
              <p className="text-[1.0625rem] leading-[1.75] text-graphite-600">
                Our goal is always to employ the best person for the right job, regardless of
                background, nationality, age, sex, race, disability, ethnic origin, religion, or any
                other parameter or circumstance. We are committed to equal employment opportunity for
                all, and we maintain robust policies to ensure that discrimination in any form is not
                tolerated.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        eyebrow="Apply"
        title="Send us your résumé."
        lede="Tell us what you have built and what you want to work on next. Our recruiting team reads every submission."
        primary={{ href: `mailto:${contact.emailHr}?subject=Application`, label: "Email recruiting" }}
        secondary={{ href: "#openings", label: "View open roles" }}
      />
    </>
  );
}
