import Link from "next/link";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import type { Job } from "@/db/schema";
import { employmentTypeLabel, experienceLevelLabel, remoteTypeLabel } from "@/lib/format";

/**
 * Public job row.
 *
 * Laid out as a full-width row rather than a grid tile: the department, title
 * and summary read down the left at a comfortable measure, while location,
 * level and the call to action sit right on wider screens and stack underneath
 * on narrow ones. As a tile in a two-up grid an odd number of roles left a
 * visible empty cell, and each card's text was squeezed into half the measure.
 */
export function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/careers/${job.slug}`}
      className="group/job flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-paper-50 sm:px-7 sm:py-6 lg:flex-row lg:items-center lg:gap-8"
    >
      <div className="min-w-0 flex-1">
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

      <h3 className="mt-2 text-[1.0625rem] font-medium leading-snug text-ink-900 sm:text-[1.125rem]">{job.title}</h3>

      {job.summary && (
        <p className="mt-1.5 line-clamp-2 max-w-2xl text-[0.9375rem] leading-relaxed text-graphite-600">
          {job.summary}
        </p>
      )}
      </div>

      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem] text-graphite-600 lg:shrink-0 lg:flex-col lg:items-start lg:gap-y-1.5">
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

      <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.875rem] font-medium text-ink-900">
        View position
        <ArrowRight
          className="size-3.5 transition-transform duration-300 group-hover/job:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
