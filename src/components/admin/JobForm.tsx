"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, Save, Send } from "lucide-react";
import type { Job } from "@/db/schema";
import { saveJobAction, type JobFormState } from "@/lib/services/job-actions";
import { employmentTypeLabel, experienceLevelLabel, remoteTypeLabel } from "@/lib/format";
import { employmentTypes, experienceLevels, remoteTypes } from "@/lib/validation/schemas";
import { control as sharedControl, t } from "@/components/admin/form";

const initial: JobFormState = {};

/** Identity-based remount key: a new result object means a new render pass. */
const keys = new WeakMap<object, number>();
let nextKey = 0;
function formKey(state: JobFormState) {
  if (!state.values) return "initial";
  let key = keys.get(state.values);
  if (key === undefined) { key = ++nextKey; keys.set(state.values, key); }
  return key;
}

// Uses the shared admin control styling so every form matches.
const control = `mt-1.5 ${sharedControl}`;

function Field({
  name, label, defaultValue, error, required, placeholder, hint, className = "",
}: {
  name: string; label: string; defaultValue?: string | null; error?: string;
  required?: boolean; placeholder?: string; hint?: string; className?: string;
}) {
  const id = `j-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className={`block ${t.label} font-medium text-ink-800`}>
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
        <p id={`${id}-hint`} className={`mt-1 ${t.hint} text-graphite-500`}>{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className={`mt-1 ${t.hint} text-[#c0392b]`}>{error}</p>
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
      <label htmlFor={id} className={`block ${t.label} font-medium text-ink-800`}>{label}</label>
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
}: { name: string; label: string; defaultValue?: string; hint: string }) {
  const id = `j-${name}`;
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className={`block ${t.label} font-medium text-ink-800`}>{label}</label>
      <textarea
        id={id}
        name={name}
        rows={5}
        defaultValue={defaultValue ?? ""}
        aria-describedby={`${id}-hint`}
        className={`${control} resize-y border-paper-300`}
      />
      <p id={`${id}-hint`} className={`mt-1 ${t.hint} text-graphite-500`}>{hint}</p>
    </div>
  );
}

export function JobForm({ job }: { job?: Partial<Job> }) {
  const [state, action, pending] = useActionState(saveJobAction, initial);
  const e = state.errors ?? {};

  // A rejected save re-renders this form. Prefer what the user just submitted
  // over the stored record so their work survives the round trip — without
  // this, a validation error (or the approval-required message, where the
  // input was perfectly valid) silently emptied every field.
  const v = state.values;
  const text = (name: keyof Job & string, fallback?: string | null) =>
    v?.[name] ?? (fallback ?? undefined);
  // List fields round-trip as the raw newline-separated text the user typed.
  const list = (name: string, fallback?: string[] | null) =>
    v?.[name] ?? (fallback ?? []).join("\n");

  return (
    // Inputs are uncontrolled, so defaultValue is only read when an element
    // mounts. Keying the form on the echoed values remounts the fields after
    // a rejected save, which is what makes those values actually appear;
    // useActionState returns a new object per result, so a repeated failure
    // still produces a new key.
    <form key={formKey(state)} action={action} className="space-y-6">
      {job?.id && <input type="hidden" name="id" value={job.id} />}
      <input type="hidden" name="status" value={job?.status ?? "DRAFT"} />

      <div aria-live="polite">
        {state.message && (
          <div className="flex gap-3 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className={`${t.body} text-[#8e2c20]`}>{state.message}</p>
          </div>
        )}
      </div>

      <section>
        <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" name="title" label="Job title" required defaultValue={text("title", job?.title)} error={e.title} placeholder="Senior Software Engineer" />
          <Field name="department" label="Department" required defaultValue={text("department", job?.department)} error={e.department} placeholder="Engineering" />
          <Field name="location" label="Location" required defaultValue={text("location", job?.location)} error={e.location} placeholder="Overland Park, KS" />
          <Select name="employmentType" label="Employment type" options={employmentTypes} labels={employmentTypeLabel} defaultValue={v?.employmentType ?? job?.employmentType ?? "FULL_TIME"} />
          <Select name="remoteType" label="Work setting" options={remoteTypes} labels={remoteTypeLabel} defaultValue={v?.remoteType ?? job?.remoteType ?? "ON_SITE"} />
          <Select name="experienceLevel" label="Experience level" options={experienceLevels} labels={experienceLevelLabel} defaultValue={v?.experienceLevel ?? job?.experienceLevel ?? "MID"} />
          <Field name="salaryRange" label="Salary range" defaultValue={text("salaryRange", job?.salaryRange)} error={e.salaryRange} placeholder="$120,000 – $150,000" hint="Optional. Shown publicly if set." />
          <Field
            className="sm:col-span-2"
            name="slug"
            label="URL slug"
            defaultValue={text("slug", job?.slug)}
            error={e.slug}
            placeholder="senior-software-engineer"
            hint="Leave blank to generate from the title."
          />
        </div>
      </section>

      <section className="border-t border-paper-200 pt-6">
        <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Description</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="j-summary" className={`block ${t.label} font-medium text-ink-800`}>
              Summary
            </label>
            <textarea
              id="j-summary"
              name="summary"
              rows={2}
              defaultValue={v?.summary ?? job?.summary ?? ""}
              maxLength={400}
              placeholder="One or two sentences shown on the careers list."
              className={`${control} resize-y border-paper-300`}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="j-description" className={`block ${t.label} font-medium text-ink-800`}>
              Full description <span aria-hidden="true" className="text-graphite-500">*</span>
            </label>
            <textarea
              id="j-description"
              name="description"
              rows={7}
              required
              defaultValue={v?.description ?? job?.description ?? ""}
              aria-invalid={e.description ? true : undefined}
              className={`${control} resize-y ${e.description ? "border-[#c0392b]" : "border-paper-300"}`}
            />
            {e.description && (
              <p className={`mt-1 ${t.hint} text-[#c0392b]`}>{e.description}</p>
            )}
          </div>

          <ListArea name="responsibilities" label="Responsibilities" defaultValue={list("responsibilities", job?.responsibilities)} hint="One per line." />
          <ListArea name="qualifications" label="Required qualifications" defaultValue={list("qualifications", job?.qualifications)} hint="One per line." />
          <ListArea name="preferredQualifications" label="Preferred qualifications" defaultValue={list("preferredQualifications", job?.preferredQualifications)} hint="One per line." />
          <ListArea name="skills" label="Skills" defaultValue={list("skills", job?.skills)} hint="One per line. Shown as tags." />
        </div>
      </section>

      <div className="flex flex-col gap-2.5 border-t border-paper-200 pt-6 sm:flex-row sm:items-center">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper-300 bg-white px-4 py-2 text-[0.8125rem] font-medium text-ink-900 transition-colors hover:border-ink-500 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
          {job ? "Save changes" : "Save draft"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-4 py-2 text-[0.8125rem] font-medium text-white transition-colors hover:bg-ink-700 disabled:pointer-events-none disabled:opacity-60"
        >
          <Send className="size-3.5" aria-hidden="true" />
          {job?.status === "PUBLISHED" ? "Save & keep published" : "Publish job"}
        </button>
      </div>
    </form>
  );
}
