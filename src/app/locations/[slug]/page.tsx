import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { CredentialCards } from "@/components/CredentialCards";
import { capabilities } from "@/lib/capabilities";
import { getLocation, locations } from "@/lib/locations";
import { contact, site } from "@/lib/site";

export function generateStaticParams() {
  return locations.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loc = getLocation(slug);
  if (!loc) return {};

  return {
    title: loc.metaTitle,
    description: loc.metaDescription,
    alternates: { canonical: `/locations/${loc.slug}` },
    openGraph: {
      title: `${loc.metaTitle} | Sohum Systems`,
      description: loc.metaDescription,
      url: `${site.url}/locations/${loc.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${loc.metaTitle} | Sohum Systems`,
      description: loc.metaDescription,
    },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loc = getLocation(slug);
  if (!loc) notFound();

  /**
   * LocalBusiness schema. The address is the real headquarters for every
   * location page — we do not claim offices we do not have. `areaServed`
   * carries the local relevance instead.
   */
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${site.url}/locations/${loc.slug}#business`,
    name: site.legalName,
    url: `${site.url}/locations/${loc.slug}`,
    description: loc.metaDescription,
    parentOrganization: { "@id": `${site.url}/#organization` },
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.street,
      addressLocality: contact.city,
      addressRegion: contact.state,
      postalCode: contact.zip,
      addressCountry: "US",
    },
    telephone: contact.phone,
    email: contact.emailGeneral,
    areaServed: loc.serves.map((s) => ({ "@type": "Place", name: s })),
    knowsAbout: capabilities.map((c) => c.name),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHero
        eyebrow={loc.full}
        crumbs={[{ label: "Locations", href: "/locations" }, { label: loc.name }]}
        title={loc.heading}
        lede={loc.lede}
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/45">Headquarters</p>
            <address className="mt-5 space-y-4 not-italic">
              <p className="flex gap-3 text-[0.9375rem] leading-relaxed text-white/80">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden="true" />
                <span>
                  {contact.street}
                  <br />
                  {contact.city}, {contact.state} {contact.zip}
                </span>
              </p>
              <p className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden="true" />
                <a
                  href={`tel:${contact.phoneHref}`}
                  className="font-mono text-[0.9375rem] text-white/80 transition-colors hover:text-white"
                >
                  {contact.phone}
                </a>
              </p>
            </address>
          </div>
        }
      />

      {/* ---- Narrative ---- */}
      <section className="border-b border-paper-200 bg-white">
        <div className="container-page py-18 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
            <Reveal className="self-start">
              <Eyebrow>Working with us</Eyebrow>
              <h2 className="sr-only">Working with Sohum Systems in {loc.full}</h2>
            </Reveal>
            <Reveal delay={70}>
              <div className="max-w-2xl space-y-5">
                {loc.body.map((para, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? "text-[1.1875rem] font-medium leading-[1.6] tracking-[-0.01em] text-ink-900"
                        : "text-[1.0625rem] leading-[1.75] text-graphite-600"
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Capabilities available locally ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Capabilities"
              title={`What we deliver for ${loc.full} organizations.`}
              lede="Eleven capabilities, delivered by one accountable team under appraised processes."
            />
          </Reveal>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300 sm:grid-cols-2">
            {capabilities.map((c, i) => (
              <Reveal key={c.slug} as="li" delay={i * 30} className="bg-white">
                <div>
                  <Link
                    href={`/capabilities/${c.slug}`}
                    className="group/c flex h-full items-start justify-between gap-4 p-6 transition-colors hover:bg-paper-50"
                  >
                    <span>
                      <span className="block text-[1rem] font-medium leading-snug text-ink-900">
                        {c.name}
                      </span>
                      <span className="mt-1.5 block text-[0.875rem] leading-relaxed text-graphite-600">
                        {c.blurb}
                      </span>
                    </span>
                    <ArrowRight
                      className="mt-1 size-4 shrink-0 text-graphite-400 transition-all duration-300 group-hover/c:translate-x-1 group-hover/c:text-flame-600"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Areas served ---- */}
      <section className="border-y border-paper-200 bg-white">
        <div className="container-page py-16 sm:py-20">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr] lg:gap-16">
              <div className="self-start">
                <Eyebrow>Areas served</Eyebrow>
                <h2 className="mt-4 text-[1.375rem] font-medium leading-snug text-ink-900">
                  Around {loc.full}
                </h2>
              </div>
              <ul className="flex flex-wrap gap-2.5 self-start">
                {loc.serves.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-paper-300 bg-paper-50 px-4 py-2 text-[0.875rem] text-graphite-700"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Credentials ---- */}
      <section className="bg-paper-50">
        <div className="container-page py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Credentials"
              title="Independently appraised and certified."
              lede="Every credential below was awarded by an outside body against a published standard."
            />
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <CredentialCards />
          </Reveal>
        </div>
      </section>

      <CtaBand
        eyebrow="Start a conversation"
        title={`Talk to a team based in ${loc.name}.`}
        lede="Tell us what you are trying to accomplish and the constraints you are working within. We will give you a straight answer about fit and approach."
        secondary={{ href: "/capabilities", label: "Review capabilities" }}
      />
    </>
  );
}
