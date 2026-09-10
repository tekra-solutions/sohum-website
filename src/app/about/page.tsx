import type { Metadata } from "next";
import Image from "next/image";
import { Quote } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { identifiers, site } from "@/lib/site";
import { CredentialCards } from "@/components/CredentialCards";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sohum Systems, LLC — an SBA 8(a) certified, CMMI Level 3 appraised technology firm founded in 2013 in Overland Park, Kansas, serving federal, state, and commercial customers.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | Sohum Systems",
    description:
      "Founded in 2013 in Overland Park, Kansas. SBA 8(a) certified, CMMI Level 3 appraised, ISO certified.",
    url: `${site.url}/about`,
  },
};

const leadership = [
  {
    name: "Srinivas Moshugu",
    title: "Chief Executive Officer",
    photo: "/team/srinivas-moshugu.webp",
    bio: "Srinivas founded Sohum Systems in 2013 in Overland Park, Kansas. He brings eighteen years of IT experience to the company and plays an integral role in strategic planning, alliances, and partnerships. He received his bachelor's degree from Osmania University in Hyderabad, India.",
    facts: ["18 years in IT", "Founder, 2013", "Osmania University"],
  },
  {
    name: "Jamie Royston",
    title: "Director of Operations",
    photo: "/team/jamie-royston.webp",
    bio: "Jamie joined Sohum as Director of Operations in 2023, bringing more than twenty years of financial and operational leadership experience in the government market. Jamie holds a Master of Business Administration from Brenau University and the Project Management Professional (PMP) certification.",
    facts: ["20+ years in government market", "MBA, Brenau University", "PMP certified"],
  },
  {
    name: "Jacob Robertson",
    title: "Technical Director",
    photo: "/team/jacob-robertson.webp",
    bio: "With over twenty years of experience in technical leadership, program management, and solutions and DevSecOps architecture, Jacob has a proven track record leading and managing technical teams, developing innovative solutions, and driving large-scale projects to completion.",
    facts: ["20+ years technical leadership", "DevSecOps architecture", "Program management"],
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={`Est. ${site.founded}`}
        crumbs={[{ label: "About" }]}
        title="A small firm built to carry serious federal work."
        lede="Sohum Systems was founded in 2013 in Overland Park, Kansas, on a straightforward premise: agencies get better outcomes from a lean team with appraised processes than from a large team with layered ones."
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/40">Company facts</p>
            <dl className="mt-5 space-y-4">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-4">
                <dt className="text-[0.875rem] text-white/50">Founded</dt>
                <dd className="font-mono text-[0.875rem] text-white/90">{site.founded}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-4">
                <dt className="text-[0.875rem] text-white/50">Headquarters</dt>
                <dd className="text-right text-[0.875rem] text-white/90">Overland Park, KS</dd>
              </div>
              {identifiers.map((id) => (
                <div
                  key={id.label}
                  className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-4 last:border-0 last:pb-0"
                >
                  <dt className="text-[0.875rem] text-white/50">{id.label}</dt>
                  <dd className="text-right font-mono text-[0.875rem] text-white/90">{id.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        }
      />

      {/* ---- Story ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-18 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
            <Reveal className="lg:sticky lg:top-40 lg:self-start">
              <Eyebrow>Our story</Eyebrow>
              <h2 className="sr-only">Our story</h2>
            </Reveal>
            <Reveal delay={70}>
              <div className="max-w-2xl">
                <p className="text-[1.25rem] font-medium leading-[1.55] tracking-[-0.015em] text-ink-900 sm:text-[1.4375rem]">
                  We started with a lean organization and low overhead, and we have kept both
                  deliberately.
                </p>
                <div className="mt-7 space-y-5 text-[1.0625rem] leading-[1.75] text-graphite-600">
                  <p>
                    That structure is not a limitation we work around — it is the reason our
                    customers stay. A flat organization means the people who scope your work are the
                    people who deliver it, decisions do not queue behind management layers, and the
                    rate you pay is not carrying overhead you will never benefit from.
                  </p>
                  <p>
                    Since 2013 we have provided high-value solutions to customers in the federal and
                    commercial sectors, and we have grown into one of the fastest-growing small
                    businesses in the Kansas City area. Our customers tell us they value our
                    agility, our concern for quality, and our responsiveness to the changing nature
                    of their programs.
                  </p>
                  <p>
                    We believe that growth has been possible for two reasons: our customers&rsquo; trust
                    in our execution, and an extraordinary workforce. The majority of our employees
                    hold certification in their primary area of focus, and we work hard to give them
                    a challenging, healthy environment in which to grow.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Mission / quality policy ---- */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-50" />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 blur-3xl"
          style={{ background: "radial-gradient(ellipse, rgba(242,88,6,0.09) 0%, transparent 70%)" }}
        />
        <div className="container-page relative py-20 sm:py-28">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <Quote
                className="mx-auto size-8 text-flame-500/60"
                strokeWidth={1.25}
                aria-hidden="true"
              />
              <p className="mt-8 text-[1.375rem] font-medium leading-[1.5] tracking-[-0.015em] text-white sm:text-[1.75rem]">
                We are committed to delivering innovative, high-quality, and cost-effective software
                development, maintenance, and sustainment services that meet our customers&rsquo;
                requirements — and to maintaining the confidentiality, integrity, and availability
                of their information.
              </p>
              <p className="mt-7 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-white/40">
                Sohum Systems quality policy
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-x-10 gap-y-8 border-t border-white/10 pt-14 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                h: "Agility",
                p: "We respond to the dynamic nature of our customers&rsquo; programs rather than defending an original plan.",
              },
              {
                h: "Quality focus",
                p: "Our processes are independently appraised and certified, not self-declared.",
              },
              {
                h: "Customer responsiveness",
                p: "Services are delivered proactively, to promote genuine customer satisfaction.",
              },
              {
                h: "Employee development",
                p: "Ongoing training and mentorship for everyone we hire, from day one.",
              },
            ].map((v, i) => (
              <Reveal key={v.h} delay={i * 60}>
                <div>
                  <h3 className="text-[1.0625rem] font-medium text-white">{v.h}</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-white/55">{v.p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Leadership ---- */}
      <section id="leadership" className="scroll-mt-36 border-b border-paper-200 bg-white">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Leadership"
              title="The people accountable for the work."
              lede="Three leaders, each reachable. On a program of our size, that is not a courtesy — it is how issues get resolved in days instead of quarters."
            />
          </Reveal>

          <div className="mt-14 space-y-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300">
            {leadership.map((person, i) => (
              <Reveal key={person.name} delay={i * 70} className="bg-white">
                <article className="grid gap-7 p-7 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:gap-10">
                  <Image
                    src={person.photo}
                    alt={`${person.name}, ${person.title}`}
                    width={121}
                    height={121}
                    sizes="80px"
                    className="size-20 shrink-0 rounded-full object-cover ring-1 ring-flame-500/30 ring-offset-2 ring-offset-white"
                  />

                  <div>
                    <h3 className="text-[1.375rem] font-medium leading-tight text-ink-900">
                      {person.name}
                    </h3>
                    <p className="mt-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-flame-700">
                      {person.title}
                    </p>
                    <p className="mt-4 max-w-2xl text-[1rem] leading-[1.7] text-graphite-600">
                      {person.bio}
                    </p>
                  </div>

                  <ul className="flex flex-wrap gap-2 lg:max-w-[13rem] lg:flex-col lg:items-end">
                    {person.facts.map((f) => (
                      <li
                        key={f}
                        className="rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-[0.75rem] font-medium text-graphite-600 lg:text-right"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Credentials ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Credentials"
              title="Independently appraised and certified."
              lede="Every credential below was awarded by an outside body against a published standard. That is the point of them."
            />
          </Reveal>

          <Reveal className="mt-14">
            <CredentialCards />
          </Reveal>
        </div>
      </section>

      <CtaBand
        eyebrow="Work with us"
        title="Talk to the people who would run your program."
        lede="No handoff after award, and no business development layer between you and the team. Start with a conversation."
        secondary={{ href: "/careers", label: "Join the team" }}
      />
    </>
  );
}
