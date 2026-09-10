import type { Metadata } from "next";
import { Briefcase, Mail, MapPin, Phone, Printer, Users } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/ui";
import { contact, identifiers, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact Sohum Systems — ${contact.address}. Phone ${contact.phone}. For contracting, capability, teaming, and recruiting inquiries.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Sohum Systems",
    description: `Talk to us about federal technology requirements. ${contact.city}, ${contact.state}.`,
    url: `${site.url}/contact`,
  },
};

const routes = [
  {
    Icon: Briefcase,
    label: "Contracting & procurement",
    detail: "Vehicle selection, quotes, capability statements, and past performance references.",
    email: contact.emailGeneral,
  },
  {
    Icon: Users,
    label: "Careers & recruiting",
    detail: "Applications, résumés, and questions about open roles.",
    email: contact.emailHr,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        crumbs={[{ label: "Contact" }]}
        title="Tell us what the mission needs."
        lede="Whether you have a defined requirement, an expiring contract, or a modernization problem you are still scoping, we will give you a straight answer about fit, approach, and the fastest contracting path."
      />

      <section className="bg-white">
        <div className="container-page py-18 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            {/* ---- Form ---- */}
            <Reveal>
              <div>
                <Eyebrow>Send a message</Eyebrow>
                <h2 className="mt-5 text-[1.625rem] leading-tight text-ink-900 sm:text-[1.875rem]">
                  Start a conversation
                </h2>
                <p className="mt-4 max-w-xl text-[1rem] leading-[1.7] text-graphite-600">
                  The more you can tell us about the constraint you are working within, the more
                  useful our first response will be.
                </p>
                <div className="mt-9">
                  <ContactForm />
                </div>
              </div>
            </Reveal>

            {/* ---- Direct details ---- */}
            <Reveal delay={90}>
              <div className="space-y-8">
                <div className="rounded-[4px] border border-paper-300 bg-paper-50 p-7">
                  <Eyebrow>Headquarters</Eyebrow>
                  <address className="mt-5 space-y-4 not-italic">
                    <p className="flex gap-3 text-[1rem] leading-relaxed text-ink-800">
                      <MapPin
                        className="mt-1 size-4 shrink-0 text-graphite-400"
                        aria-hidden="true"
                      />
                      <span>
                        {contact.street}
                        <br />
                        {contact.city}, {contact.state} {contact.zip}
                      </span>
                    </p>
                    <p className="flex gap-3">
                      <Phone
                        className="mt-1 size-4 shrink-0 text-graphite-400"
                        aria-hidden="true"
                      />
                      <span>
                        <a
                          href={`tel:${contact.phoneHref}`}
                          className="block font-mono text-[0.9375rem] text-ink-800 transition-colors hover:text-flame-700"
                        >
                          {contact.phone}
                        </a>
                        <a
                          href="tel:+19132217204"
                          className="mt-1 block font-mono text-[0.9375rem] text-graphite-600 transition-colors hover:text-flame-700"
                        >
                          {contact.phoneAlt}
                        </a>
                      </span>
                    </p>
                    <p className="flex gap-3 text-graphite-500">
                      <Printer
                        className="mt-1 size-4 shrink-0 text-graphite-400"
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[0.9375rem]">Fax {contact.fax}</span>
                    </p>
                  </address>
                </div>

                {/* Route the inquiry to the right inbox */}
                <div>
                  <Eyebrow>Direct routes</Eyebrow>
                  <ul className="mt-5 space-y-4">
                    {routes.map((r) => (
                      <li
                        key={r.label}
                        className="rounded-[4px] border border-paper-300 bg-white p-6"
                      >
                        <r.Icon
                          className="size-4.5 text-ink-500"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <p className="mt-3.5 text-[1rem] font-medium text-ink-900">
                          {r.label}
                        </p>
                        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-graphite-600">
                          {r.detail}
                        </p>
                        <a
                          href={`mailto:${r.email}`}
                          className="mt-4 inline-flex items-center gap-2 text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 transition-colors hover:decoration-flame-500"
                        >
                          <Mail className="size-3.5" aria-hidden="true" />
                          {r.email}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Identifiers, so a CO can verify without another call */}
                <div className="rounded-[4px] border border-paper-300 bg-white p-7">
                  <Eyebrow>Entity identifiers</Eyebrow>
                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
                    {identifiers.map((i) => (
                      <div key={i.label}>
                        <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-graphite-500">
                          {i.label}
                        </dt>
                        <dd className="mt-1.5 font-mono text-[0.875rem] text-ink-900">
                          {i.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
