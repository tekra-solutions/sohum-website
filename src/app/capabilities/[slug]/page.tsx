import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check, CircleDot, Target } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/ui";
import { capabilities, getCapability } from "@/lib/capabilities";
import { activeVehicles, site } from "@/lib/site";

/** All capability pages are known at build time — prerender every one. */
export function generateStaticParams() {
  return capabilities.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const capability = getCapability(slug);
  if (!capability) return {};

  const url = `${site.url}/capabilities/${capability.slug}`;
  return {
    title: capability.name,
    description: capability.metaDescription,
    alternates: { canonical: `/capabilities/${capability.slug}` },
    openGraph: {
      title: `${capability.name} | Sohum Systems`,
      description: capability.metaDescription,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${capability.name} | Sohum Systems`,
      description: capability.metaDescription,
    },
  };
}

export default async function CapabilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const capability = getCapability(slug);
  if (!capability) notFound();

  // Adjacent capabilities in the same pillar, for lateral navigation.
  const related = capabilities
    .filter((c) => c.pillar === capability.pillar && c.slug !== capability.slug)
    .slice(0, 3);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: capability.name,
    description: capability.metaDescription,
    serviceType: capability.name,
    provider: { "@id": `${site.url}/#organization` },
    areaServed: { "@type": "Country", name: "United States" },
    audience: { "@type": "Audience", audienceType: "Federal government agencies" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${capability.name} services`,
      itemListElement: capability.services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <PageHero
        eyebrow={capability.pillar}
        crumbs={[{ label: "Capabilities", href: "/capabilities" }, { label: capability.name }]}
        title={capability.name}
        lede={capability.blurb}
        aside={
          capability.credentials ? (
            <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
              <p className="eyebrow text-white/40">Relevant credentials</p>
              <ul className="mt-5 space-y-3">
                {capability.credentials.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[0.9375rem] leading-snug">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-flame-400"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span className="text-white/70">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : undefined
        }
      />

      {/* ---- The problem ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-18 sm:py-24">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
              <div className="self-start">
                <Eyebrow>The problem</Eyebrow>
                <h2 className="sr-only">The problem</h2>
              </div>
              <p className="max-w-3xl text-[1.25rem] font-medium leading-[1.55] tracking-[-0.015em] text-ink-900 sm:text-[1.4375rem]">
                {capability.problem}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Our approach ---- */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-45" />
        <div className="container-page relative py-18 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow tone="light">Our approach</Eyebrow>
              <h2 className="sr-only">Our approach</h2>
              <p className="mt-5 text-[1.0625rem] leading-[1.7] text-white/55">
                How we work this problem in practice.
              </p>
            </Reveal>

            <ol className="space-y-0">
              {capability.approach.map((step, i) => (
                <Reveal
                  key={i}
                  as="li"
                  delay={i * 60}
                  className="flex gap-5 border-t border-white/12 py-7 first:border-t-0 first:pt-0"
                >
                    <span
                      className="mt-0.5 shrink-0 font-mono text-[0.75rem] font-medium text-flame-400 tabular-nums"
                      aria-hidden="true"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  <p className="text-[1.0625rem] leading-[1.7] text-white/75">{step}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---- Services + outcomes ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-18 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <div>
                <Eyebrow>What we deliver</Eyebrow>
                <h2 className="mt-5 text-[1.625rem] leading-tight text-ink-900 sm:text-[1.875rem]">
                  Services under this capability
                </h2>
                <ul className="mt-8 grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300">
                  {capability.services.map((s) => (
                    <li
                      key={s}
                      className="flex items-start gap-3 bg-white px-5 py-4 text-[0.9375rem] leading-snug text-graphite-700"
                    >
                      <CircleDot
                        className="mt-0.5 size-4 shrink-0 text-flame-600"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div>
                <Eyebrow>Outcomes</Eyebrow>
                <h2 className="mt-5 text-[1.625rem] leading-tight text-ink-900 sm:text-[1.875rem]">
                  What your program gets
                </h2>
                <ul className="mt-8 space-y-5">
                  {capability.outcomes.map((o) => (
                    <li key={o} className="flex items-start gap-3.5">
                      <Target
                        className="mt-0.5 size-[1.125rem] shrink-0 text-ink-500"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span className="text-[1.0625rem] leading-[1.6] text-ink-800">{o}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 rounded-[4px] border border-paper-300 bg-paper-50 p-6">
                  <p className="eyebrow text-graphite-400">Mission context</p>
                  <p className="mt-3.5 text-[0.9375rem] leading-[1.7] text-graphite-600">
                    {capability.mission}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Procurement path ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-16 sm:py-20">
          <Reveal>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <Eyebrow>Procurement path</Eyebrow>
                <p className="mt-4 text-[1.0625rem] leading-[1.7] text-graphite-600">
                  This capability can be acquired through any of our active vehicles, including
                  8(a) sole source.
                </p>
              </div>
              <ul className="flex flex-wrap gap-2.5">
                {activeVehicles.map((v) => (
                  <li key={v.slug}>
                    <Link
                      href={`/contract-vehicles#${v.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-paper-300 bg-white px-4 py-2 text-[0.875rem] font-medium text-ink-800 transition-colors hover:border-ink-500/40 hover:text-ink-950"
                    >
                      <span className="size-1.5 rounded-full bg-flame-500" aria-hidden="true" />
                      {v.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Related ---- */}
      {related.length > 0 && (
        <section className="border-t border-paper-200 bg-white">
          <div className="container-page py-16 sm:py-20">
            <Reveal>
              <div className="flex items-baseline justify-between gap-6">
                <h2 className="text-[1.375rem] font-medium text-ink-900">
                  Related capabilities
                </h2>
                <Link
                  href="/capabilities"
                  className="text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
                >
                  All capabilities
                </Link>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {related.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/capabilities/${c.slug}`}
                    className="group/r flex flex-col rounded-[4px] border border-paper-300 bg-white p-6 transition-[border-color,box-shadow] duration-300 hover:border-ink-500/30 hover:shadow-[var(--shadow-lift)]"
                  >
                    <h3 className="text-[1.0625rem] font-medium leading-snug text-ink-900">
                      {c.name}
                    </h3>
                    <p className="mt-2.5 flex-1 text-[0.875rem] leading-relaxed text-graphite-600">
                      {c.blurb}
                    </p>
                    <ArrowRight
                      className="mt-5 size-4 text-graphite-400 transition-all duration-300 group-hover/r:translate-x-1 group-hover/r:text-flame-600"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <CtaBand
        eyebrow="Start a conversation"
        title={capability.ctaTitle}
        lede="Tell us what you are trying to accomplish and the constraints you are working within. We will tell you plainly what it would take."
        secondary={{ href: "/capabilities", label: "All capabilities" }}
      />
    </>
  );
}
