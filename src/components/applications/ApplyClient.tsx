"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ApplicationForm } from "./ApplicationForm";

/**
 * Owns the submitted/not-submitted state.
 *
 * On success the whole page becomes the confirmation, not just this panel: the
 * "Apply for <role>" hero and the "back to position details" link are hidden by
 * the page via the `data-submitted` attribute set below. Leaving them up asked
 * the applicant to apply for a job they had just applied for, and pushed the
 * confirmation itself below the fold.
 */
export function ApplyClient({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [submitted, setSubmitted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!submitted) return;
    // The form was long; the confirmation replaces it at a different height.
    // Put the reader back at the top and move focus to the heading, so screen
    // reader users are told what happened rather than left mid-document.
    window.scrollTo({ top: 0, behavior: "auto" });
    heading.current?.focus();
    document.documentElement.setAttribute("data-application-submitted", "true");
    return () => document.documentElement.removeAttribute("data-application-submitted");
  }, [submitted]);

  if (submitted) {
    return (
      <div className="text-center" role="status" aria-live="polite">
        <CheckCircle2
          className="mx-auto size-11 text-[#1e7a4d]"
          strokeWidth={1.5}
          aria-hidden="true"
        />

        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-5 text-[1.75rem] font-medium leading-tight text-ink-900 outline-none sm:text-[2rem]"
        >
          Thanks for applying
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-[1.0625rem] leading-[1.7] text-graphite-600">
          We have received your application for{" "}
          <span className="font-medium text-ink-900">{jobTitle}</span>. Our recruiting team reads
          every submission, and we will be in touch if your experience is a good match for the role.
        </p>

        <p className="mx-auto mt-3 max-w-lg text-[0.9375rem] leading-[1.65] text-graphite-600">
          A confirmation is on its way to your inbox. Good luck.
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

  return <ApplicationForm jobId={jobId} jobTitle={jobTitle} onSuccess={() => setSubmitted(true)} />;
}
