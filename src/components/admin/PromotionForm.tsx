"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Save } from "lucide-react";
import { createPromotionAction, updatePromotionAction, type PromotionActionState } from "@/lib/promotions/actions";
import { Field, FormSection, Select, TextArea, btn, control, spanAll, t } from "@/components/admin/form";
import { employmentTypeLabel, remoteTypeLabel } from "@/lib/format";
import { employmentTypes, remoteTypes } from "@/lib/validation/schemas";

const initial: PromotionActionState = {};

const dateValue = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";
const dollars = (cents: number | null | undefined) =>
  cents == null ? "" : String(cents / 100);
const asMoney = (cents: number | null | undefined) =>
  cents == null ? "—" : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export type PromotionFormEmployee = {
  id: string;
  name: string;
  employeeNumber: string;
  jobTitle: string;
  department: string;
  location: string | null;
  employmentType: string;
  managerId: string | null;
  managerName: string | null;
  annualSalaryCents: number | null;
  hourlyRateCents: number | null;
};

export type PromotionFormValues = {
  jobTitle?: string; department?: string; location?: string | null;
  employmentType?: string; remoteType?: string | null; managerId?: string | null;
  effectiveDate?: Date | string | null; expirationDate?: Date | string | null;
  annualSalaryCents?: number | null; hourlyRateCents?: number | null;
  bonusCents?: number | null; otherCompensation?: string | null;
  benefitsSummary?: string | null; ptoSummary?: string | null;
  additionalTerms?: string | null;
};

/**
 * One "current → new" row.
 *
 * The whole point of the promotion form is that an admin can see what is
 * changing without cross-referencing another screen, so every field that has a
 * current value shows it beside the input rather than only pre-filling it.
 */
function Comparison({ label, current, children }: { label: string; current: string; children: React.ReactNode }) {
  return (
    <div className={spanAll}>
      <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)]">
        <div className="rounded-[3px] border border-paper-200 bg-paper-50 px-3 py-2">
          <p className={`${t.micro} font-semibold uppercase tracking-[0.08em] text-graphite-500`}>
            Current {label}
          </p>
          <p className={`mt-0.5 ${t.body} text-graphite-700`}>{current || "—"}</p>
        </div>
        <ArrowRight className="mt-6 hidden size-4 shrink-0 text-graphite-400 sm:block" aria-hidden="true" />
        <div>{children}</div>
      </div>
    </div>
  );
}

export function PromotionForm({
  employee, promotionId, values, managers, templates,
}: {
  employee: PromotionFormEmployee;
  promotionId?: string;
  values?: PromotionFormValues;
  managers: { id: string; name: string }[];
  templates: { id: string; name: string }[];
}) {
  const action = promotionId ? updatePromotionAction : createPromotionAction;
  const [state, formAction, pending] = useActionState(action, initial);

  // Pre-filled with the employee's current values, so an unchanged field is
  // simply left alone. The action refuses a promotion where nothing moved.
  const [jobTitle, setJobTitle] = useState(values?.jobTitle ?? employee.jobTitle);
  const [department, setDepartment] = useState(values?.department ?? employee.department);
  const [salary, setSalary] = useState(
    dollars(values?.annualSalaryCents ?? employee.annualSalaryCents),
  );

  const currentPay = employee.annualSalaryCents != null
    ? `${asMoney(employee.annualSalaryCents)} / year`
    : employee.hourlyRateCents != null
      ? `${asMoney(employee.hourlyRateCents)} / hour`
      : "Not recorded";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="employeeId" value={employee.id} />
      {promotionId && <input type="hidden" name="promotionId" value={promotionId} />}

      <div aria-live="polite">
        {state.error && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p role="alert" className={`${t.body} text-[#8e2c20]`}>{state.error}</p>
          </div>
        )}
        {state.success && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.05] p-3">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p role="status" className={`${t.body} text-[#14603b]`}>{state.success}</p>
          </div>
        )}
      </div>

      <section className="rounded-[4px] border border-paper-200 bg-paper-50 p-4">
        <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Promoting</h2>
        <p className={`mt-1 ${t.hint} text-graphite-600`}>
          {employee.name} · {employee.employeeNumber} · {employee.jobTitle}, {employee.department}
        </p>
      </section>

      <FormSection title="The change" description="Leave a field as it is if it is not changing." columns={1}>
        <Comparison label="title" current={employee.jobTitle}>
          <label htmlFor="f-jobTitle" className={`block ${t.label} font-medium text-ink-800`}>
            New job title <span aria-hidden="true" className="text-graphite-500">*</span>
          </label>
          <input
            id="f-jobTitle" name="jobTitle" required value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className={`${control} mt-1.5 border-paper-300`}
          />
        </Comparison>

        <Comparison label="department" current={employee.department}>
          <label htmlFor="f-department" className={`block ${t.label} font-medium text-ink-800`}>
            New department <span aria-hidden="true" className="text-graphite-500">*</span>
          </label>
          <input
            id="f-department" name="department" required value={department}
            onChange={e => setDepartment(e.target.value)}
            className={`${control} mt-1.5 border-paper-300`}
          />
        </Comparison>

        <Comparison label="compensation" current={currentPay}>
          <label htmlFor="f-annualSalaryCents" className={`block ${t.label} font-medium text-ink-800`}>
            New annual salary
          </label>
          <input
            id="f-annualSalaryCents" name="annualSalaryCents" type="number" inputMode="numeric"
            value={salary} onChange={e => setSalary(e.target.value)} placeholder="135000"
            className={`${control} mt-1.5 border-paper-300`}
          />
          <p className={`mt-1 ${t.hint} text-graphite-500`}>
            Dollars, no commas. Leave blank and use the hourly rate below if paid hourly.
          </p>
        </Comparison>

        <Comparison label="manager" current={employee.managerName ?? "—"}>
          <Select
            name="managerId" label="New reporting manager"
            defaultValue={values?.managerId ?? employee.managerId ?? ""}
            options={[{ value: "", label: "— Unchanged —" }, ...managers.map(m => ({ value: m.id, label: m.name }))]}
          />
        </Comparison>

        <Comparison label="location" current={employee.location ?? "—"}>
          <Field name="location" label="New location" defaultValue={values?.location ?? employee.location ?? ""} />
        </Comparison>
      </FormSection>

      <FormSection title="Other compensation">
        <Field
          name="hourlyRateCents" label="New hourly rate" type="number" inputMode="numeric"
          defaultValue={dollars(values?.hourlyRateCents ?? employee.hourlyRateCents)}
          hint="Use instead of an annual salary."
        />
        <Field
          name="bonusCents" label="Bonus" type="number" inputMode="numeric"
          defaultValue={dollars(values?.bonusCents)} hint="Optional."
        />
        <TextArea
          name="otherCompensation" label="Other compensation" className={spanAll}
          defaultValue={values?.otherCompensation ?? ""} hint="Optional. Appears in the letter."
        />
      </FormSection>

      <FormSection title="Dates">
        <Field
          name="effectiveDate" label="Promotion effective date" type="date" required
          defaultValue={dateValue(values?.effectiveDate)}
          hint="The employee record changes on this date, not before."
        />
        <Field
          name="expirationDate" label="Sign by" type="date" required
          defaultValue={dateValue(values?.expirationDate)}
          hint="The deadline for the employee to sign."
        />
      </FormSection>

      <FormSection title="Employment type" columns={2}>
        <Select
          name="employmentType" label="Employment type" required
          defaultValue={values?.employmentType ?? employee.employmentType}
          options={employmentTypes.map(v => ({ value: v, label: employmentTypeLabel[v] ?? v }))}
        />
        <Select
          name="remoteType" label="Work arrangement"
          defaultValue={values?.remoteType ?? ""}
          options={[{ value: "", label: "— Unchanged —" }, ...remoteTypes.map(v => ({ value: v, label: remoteTypeLabel[v] ?? v }))]}
        />
      </FormSection>

      <FormSection title="Letter" columns={1}>
        {templates.length > 0 && (
          <Select
            name="templateId" label="Letter template" className={spanAll}
            defaultValue=""
            options={[
              { value: "", label: "Sohum Systems promotion letter (built in)" },
              ...templates.map(tpl => ({ value: tpl.id, label: tpl.name })),
            ]}
          />
        )}
        <TextArea
          name="additionalTerms" label="Additional approved terms" className={spanAll}
          defaultValue={values?.additionalTerms ?? ""}
          hint="Optional. Anything beyond the template's standard language, subject to legal review."
        />
      </FormSection>

      <div className="border-t border-paper-200 pt-5">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
          {promotionId ? "Save changes" : "Create promotion & preview letter"}
        </button>
        <p className={`mt-2 ${t.hint} text-graphite-600`}>
          Nothing changes on the employee record until the promotion is approved, signed and reaches
          its effective date.
        </p>
      </div>
    </form>
  );
}
