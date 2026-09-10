import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Banknote, Briefcase, Building2, MapPin, Signal } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { getPublishedJobBySlug, listPublishedJobs } from "@/lib/services/jobs";
import { employmentTypeLabel, experienceLevelLabel, formatDate, remoteTypeLabel } from "@/lib/format";
import { contact, site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) {
    // Unpublished or archived roles must not be indexed.
    return { title: "Position not available", robots: { index: false, follow: true } };
  }

  const description =
    job.summary ??
    `${job.title} at Sohum Systems — ${job.location}. ${employmentTypeLabel[job.employmentType] ?? ""}.`;

  return {
    title: job.title,
    description: description.slice(0, 300),
    alternates: { canonical: `/careers/${job.slug}` },
    openGraph: {
      title: `${job.title} | Sohum Systems`,
      description: description.slice(0, 300),
      url: `${site.url}/careers/${job.slug}`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title: `${job.title} | Sohum Systems` },
  };
}

/** Renders a list section only when it has content. */
function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h2 className="text-[1.25rem] font-medium text-ink-900">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-[1rem] leading-[1.7] text-graphite-700">
            <span
              aria-hidden="true"
              className="mt-[0.6875rem] size-1.5 shrink-0 rounded-full bg-flame-500"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) notFound();

  const others = (await listPublishedJobs()).filter((j) => j.id !== job.id).slice(0, 3);

  /** JobPosting schema — only ever emitted for a published role. */
  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: (job.publishedAt ?? job.createdAt).toISOString(),
    employmentType: job.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: site.legalName,
      sameAs: site.url,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.split(",")[0]?.trim(),
        addressRegion: job.location.split(",")[1]?.trim(),
        addressCountry: "US",
      },
    },
    ...(job.remoteType === "REMOTE" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.skills.length ? { skills: job.skills.join(", ") } : {}),
    ...(job.qualifications.length
      ? { qualifications: job.qualifications.join(" ") }
      : {}),
    directApply: true,
  };

  const facts = [
    { Icon: Building2, label: "Department", value: job.department },
    { Icon: MapPin, label: "Location", value: job.location },
    { Icon: Briefcase, label: "Type", value: employmentTypeLabel[job.employmentType] ?? job.employmentType },
    { Icon: Signal, label: "Work setting", value: remoteTypeLabel[job.remoteType] ?? job.remoteType },
    { Icon: Briefcase, label: "Level", value: experienceLevelLabel[job.experienceLevel] ?? job.experienceLevel },
    ...(job.salaryRange ? [{ Icon: Banknote, label: "Compensation", value: job.salaryRange }] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageHero
        eyebrow={job.department}
        crumbs={[{ label: "Careers", href: "/careers" }, { label: job.title }]}
        title={job.title}
        lede={job.summary ?? undefined}
        aside={
          <div className="rounded-[4px] border border-white/10 bg-white/[0.035] p-7">
            <p className="eyebrow text-white/45">Position details</p>
            <dl className="mt-5 space-y-3.5">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-[0.8125rem] text-white/50">{f.label}</dt>
                  <dd className="text-right text-[0.875rem] text-white/90">{f.value}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink
              href={`/careers/${job.slug}/apply`}
              variant="onDark"
              className="mt-7 w-full"
            >
              Apply now
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        }
      />

      <section className="bg-white">
        <div className="container-page py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
            {/* ---- Description ---- */}
            <Reveal>
              <div className="max-w-2xl space-y-10">
                <div>
                  <Eyebrow>About the role</Eyebrow>
                  <div className="mt-5 space-y-4">
                    {job.description.split("\n").filter(Boolean).map((para, i) => (
                      <p key={i} className="text-[1.0625rem] leading-[1.75] text-graphite-700">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>

                <ListBlock title="What you will do" items={job.responsibilities} />
                <ListBlock title="What we are looking for" items={job.qualifications} />
                <ListBlock title="Nice to have" items={job.preferredQualifications} />

                {job.skills.length > 0 && (
                  <div>
                    <h2 className="text-[1.25rem] font-medium text-ink-900">Skills</h2>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {job.skills.map((s) => (
                        <li
                          key={s}
                          className="rounded-full border border-paper-300 bg-paper-50 px-3.5 py-1.5 text-[0.875rem] text-graphite-700"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-paper-200 pt-8">
                  <ButtonLink href={`/careers/${job.slug}/apply`}>
                    Apply for this position
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </ButtonLink>
                  <p className="mt-4 text-[0.875rem] text-graphite-600">
                    Questions? Email{" "}
                    <a
                      href={`mailto:${contact.emailHr}`}
                      className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
                    >
                      {contact.emailHr}
                    </a>
                    .
                  </p>
                </div>
              </div>
            </Reveal>

            {/* ---- Sidebar ---- */}
            <Reveal delay={90}>
              <aside className="lg:sticky lg:top-40 lg:self-start">
                <div className="rounded-[4px] border border-paper-300 bg-paper-50 p-6">
                  <p className="eyebrow text-graphite-400">Posted</p>
                  <p className="mt-2 text-[0.9375rem] text-ink-900">
                    {formatDate(job.publishedAt ?? job.createdAt)}
                  </p>
                </div>

                {others.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow text-graphite-400">Other openings</p>
                    <ul className="mt-4 space-y-3">
                      {others.map((o) => (
                        <li key={o.id}>
                          <Link
                            href={`/careers/${o.slug}`}
                            className="group/o block rounded-[4px] border border-paper-300 bg-white p-4 transition-colors hover:border-ink-500/25"
                          >
                            <span className="block text-[0.9375rem] font-medium leading-snug text-ink-900">
                              {o.title}
                            </span>
                            <span className="mt-1 block text-[0.8125rem] text-graphite-600">
                              {o.location}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  href="/careers"
                  className="mt-6 inline-block text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
                >
                  All open positions
                </Link>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
