"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, Save, Send } from "lucide-react";
import type { Job } from "@/db/schema";
import { saveJobAction, type JobFormState } from "@/lib/services/job-actions";
import { employmentTypeLabel, experienceLevelLabel, remoteTypeLabel } from "@/lib/format";
import { employmentTypes, experienceLevels, remoteTypes } from "@/lib/validation/schemas";

const initial: JobFormState = {};

const control =
  "mt-2 w-full rounded-[3px] border bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink-900 " +
  "placeholder:text-graphite-400 transition-colors focus:border-flame-500 focus:outline-none " +
  "focus:ring-2 focus:ring-flame-500/30";

function Field({
  name, label, defaultValue, error, required, placeholder, hint, className = "",
}: {
  name: string; label: string; defaultValue?: string | null; error?: string;
  required?: boolean; placeholder?: string; hint?: string; className?: string;
}) {
  const id = `j-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">
        {label} {required && <span aria-hidden="true" className="text-graphite-500">*</span>}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control} ${error ? "border-[#c0392b]" : "border-paper-300"}`}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-graphite-500">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-[#c0392b]">{error}</p>
      )}
    </div>
  );
}

function Select({
  name, label, options, labels, defaultValue,
}: {
  name: string; label: string; options: readonly string[];
  labels: Record<string, string>; defaultValue?: string;
}) {
  const id = `j-${name}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">{label}</label>
      <select id={id} name={name} defaultValue={defaultValue} className={`${control} border-paper-300`}>
        {options.map((o) => (
          <option key={o} value={o}>{labels[o] ?? o}</option>
        ))}
      </select>
    </div>
  );
}

function ListArea({
  name, label, defaultValue, hint,
}: { name: string; label: string; defaultValue?: string[]; hint: string }) {
  const id = `j-${name}`;
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">{label}</label>
      <textarea
        id={id}
        name={name}
        rows={5}
        defaultValue={(defaultValue ?? []).join("\n")}
        aria-describedby={`${id}-hint`}
        className={`${control} resize-y border-paper-300`}
      />
      <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-graphite-500">{hint}</p>
    </div>
  );
}

export function JobForm({ job }: { job?: Job }) {
  const [state, action, pending] = useActionState(saveJobAction, initial);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-8">
      {job && <input type="hidden" name="id" value={job.id} />}
      <input type="hidden" name="status" value={job?.status ?? "DRAFT"} />

      <div aria-live="polite">
        {state.message && (
          <div className="flex gap-3 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#8e2c20]">{state.message}</p>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-[1.0625rem] font-medium text-ink-900">Basics</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" name="title" label="Job title" required defaultValue={job?.title} error={e.title} placeholder="Senior Software Engineer" />
          <Field name="department" label="Department" required defaultValue={job?.department} error={e.department} placeholder="Engineering" />
          <Field name="location" label="Location" required defaultValue={job?.location} error={e.location} placeholder="Overland Park, KS" />
          <Select name="employmentType" label="Employment type" options={employmentTypes} labels={employmentTypeLabel} defaultValue={job?.employmentType ?? "FULL_TIME"} />
          <Select name="remoteType" label="Work setting" options={remoteTypes} labels={remoteTypeLabel} defaultValue={job?.remoteType ?? "ON_SITE"} />
          <Select name="experienceLevel" label="Experience level" options={experienceLevels} labels={experienceLevelLabel} defaultValue={job?.experienceLevel ?? "MID"} />
          <Field name="salaryRange" label="Salary range" defaultValue={job?.salaryRange} error={e.salaryRange} placeholder="$120,000 – $150,000" hint="Optional. Shown publicly if set." />
          <Field
            className="sm:col-span-2"
            name="slug"
            label="URL slug"
            defaultValue={job?.slug}
            error={e.slug}
            placeholder="senior-software-engineer"
            hint="Leave blank to generate from the title."
          />
        </div>
      </section>

      <section className="border-t border-paper-200 pt-8">
        <h2 className="text-[1.0625rem] font-medium text-ink-900">Description</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="j-summary" className="block text-[0.875rem] font-medium text-ink-800">
              Summary
            </label>
            <textarea
              id="j-summary"
              name="summary"
              rows={2}
              defaultValue={job?.summary ?? ""}
              maxLength={400}
              placeholder="One or two sentences shown on the careers list."
              className={`${control} resize-y border-paper-300`}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="j-description" className="block text-[0.875rem] font-medium text-ink-800">
              Full description <span aria-hidden="true" className="text-graphite-500">*</span>
            </label>
            <textarea
              id="j-description"
              name="description"
              rows={8}
              required
              defaultValue={job?.description ?? ""}
              aria-invalid={e.description ? true : undefined}
              className={`${control} resize-y ${e.description ? "border-[#c0392b]" : "border-paper-300"}`}
            />
            {e.description && (
              <p className="mt-1.5 text-[0.8125rem] text-[#c0392b]">{e.description}</p>
            )}
          </div>

          <ListArea name="responsibilities" label="Responsibilities" defaultValue={job?.responsibilities} hint="One per line." />
          <ListArea name="qualifications" label="Required qualifications" defaultValue={job?.qualifications} hint="One per line." />
          <ListArea name="preferredQualifications" label="Preferred qualifications" defaultValue={job?.preferredQualifications} hint="One per line." />
          <ListArea name="skills" label="Skills" defaultValue={job?.skills} hint="One per line. Shown as tags." />
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-paper-200 pt-8 sm:flex-row sm:items-center">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper-300 bg-white px-5 py-3 text-[0.9375rem] font-medium text-ink-900 transition-colors hover:border-ink-500 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {job ? "Save changes" : "Save draft"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-5 py-3 text-[0.9375rem] font-medium text-white transition-colors hover:bg-ink-700 disabled:pointer-events-none disabled:opacity-60"
        >
          <Send className="size-4" aria-hidden="true" />
          {job?.status === "PUBLISHED" ? "Save & keep published" : "Publish job"}
        </button>
      </div>
    </form>
  );
}
