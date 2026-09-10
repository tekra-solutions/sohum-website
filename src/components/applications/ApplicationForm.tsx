"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { ResumeUpload } from "./ResumeUpload";
import { submitApplicationAction, type ApplyState } from "@/lib/services/submit-action";

const initial: ApplyState = { ok: false };

const field =
  "w-full rounded-[3px] border bg-white px-4 py-3 text-[0.9375rem] text-ink-900 " +
  "placeholder:text-graphite-400 transition-colors focus:border-flame-500 " +
  "focus:outline-none focus:ring-2 focus:ring-flame-500/30";

function Text({
  name, label, type = "text", required, autoComplete, placeholder, error, half,
}: {
  name: string; label: string; type?: string; required?: boolean;
  autoComplete?: string; placeholder?: string; error?: string; half?: boolean;
}) {
  const id = `f-${name}`;
  return (
    <div className={half ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">
        {label} {required && <span aria-hidden="true" className="text-graphite-500">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${field} mt-2 ${error ? "border-[#c0392b]" : "border-paper-300"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[0.8125rem] text-[#c0392b]">
          {error}
        </p>
      )}
    </div>
  );
}

function YesNo({
  name, legend, error,
}: { name: string; legend: string; error?: string }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-[0.875rem] font-medium text-ink-800">
        {legend} <span aria-hidden="true" className="text-graphite-500">*</span>
      </legend>
      <div className="mt-3 flex gap-3">
        {(["yes", "no"] as const).map((v) => (
          <label
            key={v}
            className="flex cursor-pointer items-center gap-2.5 rounded-[3px] border border-paper-300 bg-white px-5 py-2.5 text-[0.9375rem] text-ink-900 transition-colors has-[:checked]:border-flame-500 has-[:checked]:bg-flame-500/[0.06]"
          >
            <input
              type="radio"
              name={name}
              value={v}
              required
              className="size-4 accent-[#e8622a]"
            />
            {v === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-[0.8125rem] text-[#c0392b]">{error}</p>}
    </fieldset>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-paper-200 pt-8 first:border-0 first:pt-0">
      <h2 className="text-[1.125rem] font-medium text-ink-900">{title}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ApplicationForm({
  jobId,
  jobTitle,
  onSuccess,
}: {
  jobId: string;
  jobTitle: string;
  onSuccess: (reference: string) => void;
}) {
  const [state, action, pending] = useActionState(submitApplicationAction, initial);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Derived, not state: once the server has warned about a duplicate, the next
  // submit carries the acknowledgement. No effect needed.
  const confirmDuplicate = Boolean(state.duplicateWarning);

  // Announce success upward, and move focus to any error summary.
  useEffect(() => {
    if (state.ok && state.reference) {
      onSuccess(state.reference);
      return;
    }
    if (state.message || state.duplicateWarning || state.errors) {
      summaryRef.current?.focus();
    }
  }, [state, onSuccess]);

  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="jobId" value={jobId} />
      {confirmDuplicate && <input type="hidden" name="confirmDuplicate" value="yes" />}

      {/* Honeypot: visually and programmatically hidden from people. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div ref={summaryRef} tabIndex={-1} aria-live="polite" className="scroll-mt-40">
        {state.duplicateWarning && (
          <div className="flex gap-3 rounded-[3px] border border-flame-500/40 bg-flame-500/[0.06] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-flame-700" aria-hidden="true" />
            <div>
              <p className="text-[0.9375rem] font-medium text-ink-900">
                {state.duplicateWarning}
              </p>
              <p className="mt-1 text-[0.875rem] text-graphite-600">
                Press “Submit application” again to send an updated application.
              </p>
            </div>
          </div>
        )}
        {state.message && !state.ok && (
          <div className="flex gap-3 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#8e2c20]">{state.message}</p>
          </div>
        )}
      </div>

      <Section title="Personal information">
        <Text half name="firstName" label="First name" required autoComplete="given-name" error={e.firstName} />
        <Text half name="lastName" label="Last name" required autoComplete="family-name" error={e.lastName} />
        <Text half name="email" label="Email" type="email" required autoComplete="email" error={e.email} />
        <Text half name="phone" label="Phone" type="tel" autoComplete="tel" error={e.phone} />
      </Section>

      <Section title="Location">
        <Text name="address" label="Street address" autoComplete="street-address" error={e.address} />
        <Text half name="city" label="City" autoComplete="address-level2" error={e.city} />
        <Text half name="state" label="State" autoComplete="address-level1" error={e.state} />
        <Text half name="zipCode" label="ZIP code" autoComplete="postal-code" error={e.zipCode} />
        <Text half name="country" label="Country" autoComplete="country-name" error={e.country} />
      </Section>

      <Section title="Professional information">
        <Text half name="linkedinUrl" label="LinkedIn" type="url" placeholder="https://linkedin.com/in/…" error={e.linkedinUrl} />
        <Text half name="portfolioUrl" label="Portfolio or website" type="url" placeholder="https://…" error={e.portfolioUrl} />
        <Text half name="yearsExperience" label="Years of experience" type="number" error={e.yearsExperience} />
      </Section>

      <Section title="Work authorization">
        <YesNo
          name="workAuthorized"
          legend="Are you legally authorized to work in the United States?"
          error={e.workAuthorized}
        />
        <YesNo
          name="sponsorshipRequired"
          legend="Will you now or in the future require sponsorship?"
          error={e.sponsorshipRequired}
        />
      </Section>

      <Section title="Application materials">
        <div className="sm:col-span-2">
          <ResumeUpload error={e.resume} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="f-coverLetter" className="block text-[0.875rem] font-medium text-ink-800">
            Cover letter
          </label>
          <textarea
            id="f-coverLetter"
            name="coverLetter"
            rows={7}
            placeholder={`Why are you interested in ${jobTitle}? What would you bring to it?`}
            className={`${field} mt-2 resize-y border-paper-300`}
          />
        </div>
        <Text name="source" label="How did you hear about us?" error={e.source} />
      </Section>

      <div className="flex flex-col gap-4 border-t border-paper-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={pending}
          className="group/btn inline-flex items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-7 py-4 text-[0.9375rem] font-medium text-white transition-colors hover:bg-ink-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Submitting…
            </>
          ) : (
            <>
              Submit application
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>
        <p className="text-[0.8125rem] text-graphite-600">
          Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
      </div>
    </form>
  );
}
