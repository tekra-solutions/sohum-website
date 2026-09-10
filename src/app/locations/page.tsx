import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { Reveal } from "@/components/Reveal";
import { locations } from "@/lib/locations";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Locations — Kansas City & Overland Park IT Services",
  description:
    "Sohum Systems is headquartered in Overland Park, Kansas, serving the Kansas City metro and federal customers nationwide with software engineering, cloud, data, and GIS services.",
  alternates: { canonical: "/locations" },
  openGraph: {
    title: "Locations | Sohum Systems",
    description:
      "Headquartered in Overland Park, Kansas. Serving the Kansas City metro and federal agencies nationwide.",
    url: `${site.url}/locations`,
  },
};

export default function LocationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Locations"
        crumbs={[{ label: "Locations" }]}
        title="Kansas City rooted. Federal reach."
        lede={`Our headquarters is at ${contact.street} in ${contact.city}, ${contact.state}. We deliver for organizations across the Kansas City metro and for federal agencies nationwide.`}
      />

      <section className="bg-white">
        <div className="container-page py-18 sm:py-24">
          <ul className="grid gap-6 md:grid-cols-3">
            {locations.map((loc, i) => (
              <Reveal key={loc.slug} as="li" delay={i * 70} className="h-full">
                <div className="h-full">
                  <Link
                    href={`/locations/${loc.slug}`}
                    className="group/l flex h-full flex-col rounded-[4px] border border-paper-300 bg-white p-7 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-500/25 hover:shadow-[var(--shadow-lift-lg)]"
                  >
                    <MapPin
                      className="size-5 text-ink-500"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="mt-5 text-[1.25rem] font-medium text-ink-900">{loc.full}</h2>
                    <p className="mt-1 text-[0.8125rem] uppercase tracking-[0.1em] text-flame-700">
                      {loc.region}
                    </p>
                    <p className="mt-4 flex-1 text-[0.9375rem] leading-[1.7] text-graphite-600">
                      {loc.lede}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-900">
                      Read more
                      <ArrowRight
                        className="size-3.5 transition-transform duration-300 group-hover/l:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand
        eyebrow="Get in touch"
        title="Talk to a team in your time zone."
        lede="Whether you are a federal program office or a commercial organization in the metro, start with a conversation."
        secondary={{ href: "/capabilities", label: "Review capabilities" }}
      />
    </>
  );
}
