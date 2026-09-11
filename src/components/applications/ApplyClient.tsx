"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ApplicationForm } from "./ApplicationForm";

/**
 * Owns the submitted/not-submitted state so the success view can replace the
 * form entirely rather than sitting below it.
 */
export function ApplyClient({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [reference, setReference] = useState<string | null>(null);

  if (reference) {
    return (
      <div
        className="rounded-[4px] border border-paper-300 bg-white p-8 text-center sm:p-12"
        role="status"
      >
        <CheckCircle2
          className="mx-auto size-10 text-flame-600"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="mt-6 text-[1.625rem] font-medium leading-tight text-ink-900 sm:text-[1.875rem]">
          Application submitted
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[1.0625rem] leading-[1.7] text-graphite-600">
          Thank you for your interest in Sohum Systems. Your application for{" "}
          <span className="text-ink-900">{jobTitle}</span> has been successfully received.
        </p>

        <div className="mx-auto mt-8 max-w-xs rounded-[4px] border border-paper-300 bg-paper-50 p-5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-graphite-500">
            Application reference
          </p>
          <p className="mt-2 font-mono text-[1.0625rem] text-ink-900">{reference}</p>
        </div>

        <p className="mt-6 text-[0.875rem] text-graphite-600">
          We have emailed you a confirmation. Our recruiting team reviews every submission.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/careers"
            className="inline-flex items-center justify-center rounded-[3px] bg-ink-900 px-6 py-3.5 text-[0.9375rem] font-medium text-white transition-colors hover:bg-ink-700"
          >
            View other openings
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[3px] border border-paper-300 bg-white px-6 py-3.5 text-[0.9375rem] font-medium text-ink-900 transition-colors hover:border-ink-500"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return <ApplicationForm jobId={jobId} jobTitle={jobTitle} onSuccess={setReference} />;
}
