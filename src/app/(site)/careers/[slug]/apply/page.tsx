import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ApplyClient } from "@/components/applications/ApplyClient";
import { getPublishedJobBySlug } from "@/lib/services/jobs";
import { employmentTypeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) return { title: "Position not available", robots: { index: false } };
  return {
    title: `Apply — ${job.title}`,
    description: `Apply for ${job.title} at Sohum Systems in ${job.location}.`,
    // Application forms should not compete with the job page in search.
    robots: { index: false, follow: true },
    alternates: { canonical: `/careers/${job.slug}` },
  };
}

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) notFound();

  return (
    <>
      {/* The hero and the back link belong to the act of applying. Once the
          application is in, they are answering a question the visitor no longer
          has — and they pushed the confirmation itself below the fold. Hidden
          via the attribute ApplyClient sets on <html> on success. */}
      <div className="apply-chrome">
        <PageHero
          eyebrow="Apply"
          crumbs={[
            { label: "Careers", href: "/careers" },
            { label: job.title, href: `/careers/${job.slug}` },
            { label: "Apply" },
          ]}
          title={`Apply for ${job.title}`}
          lede={`${job.department} · ${job.location} · ${
            employmentTypeLabel[job.employmentType] ?? job.employmentType
          }`}
        />
      </div>

      <section className="bg-paper-50">
        <div className="container-page section-y-tight">
          <div className="mx-auto max-w-3xl">
            <div className="apply-chrome">
              <Link
                href={`/careers/${job.slug}`}
                className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-graphite-700 transition-colors hover:text-ink-900"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to position details
              </Link>
            </div>

            <div className="apply-panel mt-6 rounded-[4px] border border-paper-300 bg-white p-6 sm:p-10">
              <ApplyClient jobId={job.id} jobTitle={job.title} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
