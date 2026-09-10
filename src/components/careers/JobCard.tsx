import Link from "next/link";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import type { Job } from "@/db/schema";
import { employmentTypeLabel, experienceLevelLabel, remoteTypeLabel } from "@/lib/format";

/**
 * Public job card. Deliberately mirrors the card treatment already used on the
 * capabilities and locations pages so the careers list reads as native.
 */
export function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group/job flex h-full flex-col p-6 transition-colors hover:bg-paper-50 sm:p-7"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-flame-700">
          {job.department}
        </span>
        <span aria-hidden="true" className="text-paper-300">
          ·
        </span>
        <span className="text-[0.8125rem] text-graphite-600">
          {employmentTypeLabel[job.employmentType] ?? job.employmentType}
        </span>
      </div>

      <h3 className="mt-3 text-[1.25rem] font-medium leading-snug text-ink-900">{job.title}</h3>

      {job.summary && (
        <p className="mt-2.5 line-clamp-2 flex-1 text-[0.9375rem] leading-relaxed text-graphite-600">
          {job.summary}
        </p>
      )}

      <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-paper-200 pt-4 text-[0.875rem] text-graphite-600">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Location</dt>
          <MapPin className="size-3.5 text-graphite-400" aria-hidden="true" />
          <dd>
            {job.location}
            {job.remoteType !== "ON_SITE" && (
              <span className="text-graphite-500">
                {" "}
                · {remoteTypeLabel[job.remoteType]}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Experience level</dt>
          <Briefcase className="size-3.5 text-graphite-400" aria-hidden="true" />
          <dd>{experienceLevelLabel[job.experienceLevel] ?? job.experienceLevel}</dd>
        </div>
      </dl>

      <span className="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-900">
        View position
        <ArrowRight
          className="size-3.5 transition-transform duration-300 group-hover/job:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
