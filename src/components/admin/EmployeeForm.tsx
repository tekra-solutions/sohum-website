"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import type { Employee } from "@/db/schema";
import { saveEmployeeAction, type EmployeeFormState } from "@/lib/services/employee-actions";
import {
  Field, FormSection, Select, TextArea, btn, spanAll, t,
} from "@/components/admin/form";
import { employmentTypeLabel } from "@/lib/format";
import { employmentStatuses, employmentTypes } from "@/lib/validation/schemas";

const initial: EmployeeFormState = {};

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

/** A date input needs YYYY-MM-DD, not an ISO timestamp. */
const dateValue = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export function EmployeeForm({
  employee,
  managers,
}: {
  employee?: Employee;
  managers: { id: string; employeeId: string; firstName: string; lastName: string; jobTitle: string }[];
}) {
  const [state, action, pending] = useActionState(saveEmployeeAction, initial);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-6">
      {employee && <input type="hidden" name="id" value={employee.id} />}

      <div aria-live="polite">
        {state.message && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className={`${t.body} text-[#8e2c20]`}>{state.message}</p>
          </div>
        )}
      </div>

      <FormSection title="Personal details">
        <Field name="firstName" label="First name" required defaultValue={employee?.firstName} error={e.firstName} />
        <Field name="lastName" label="Last name" required defaultValue={employee?.lastName} error={e.lastName} />
        <Field
          name="workEmail" label="Work email" type="email" required inputMode="email"
          defaultValue={employee?.workEmail} error={e.workEmail}
          placeholder="first.last@sohumsystems.com"
        />
        <Field
          name="personalEmail" label="Personal email" type="email" inputMode="email"
          defaultValue={employee?.personalEmail} error={e.personalEmail}
        />
        <Field name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={employee?.phone} error={e.phone} />
      </FormSection>

      <FormSection title="Role">
        <Field name="jobTitle" label="Job title" required defaultValue={employee?.jobTitle} error={e.jobTitle} placeholder="Software Engineer" />
        <Field name="department" label="Department" required defaultValue={employee?.department} error={e.department} placeholder="Engineering" />
        <Field name="location" label="Location" defaultValue={employee?.location} error={e.location} placeholder="Overland Park, KS" />
        <Select
          name="employmentType" label="Employment type"
          defaultValue={employee?.employmentType ?? "FULL_TIME"}
          options={employmentTypes.map((v) => ({ value: v, label: employmentTypeLabel[v] ?? v }))}
        />
        <Select
          name="status" label="Status"
          defaultValue={employee?.status ?? "ACTIVE"}
          options={employmentStatuses.map((v) => ({ value: v, label: statusLabel[v] }))}
          error={e.status}
        />
        <Select
          name="managerId" label="Reports to"
          defaultValue={employee?.managerId ?? ""}
          options={[
            { value: "", label: "— None —" },
            ...managers.map((m) => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName} · ${m.jobTitle}`,
            })),
          ]}
          error={e.managerId}
        />
      </FormSection>

      <FormSection title="Dates">
        <Field name="startDate" label="Start date" type="date" defaultValue={dateValue(employee?.startDate)} error={e.startDate} />
        <Field
          name="endDate" label="End date" type="date"
          defaultValue={dateValue(employee?.endDate)} error={e.endDate}
          hint="Required when the status is Terminated."
        />
      </FormSection>

      <FormSection title="Notes" columns={1}>
        <TextArea
          name="notes" label="Internal notes" rows={4}
          defaultValue={employee?.notes} error={e.notes}
          className={spanAll}
          hint="Visible to admins only."
        />
      </FormSection>

      <div className="border-t border-paper-200 pt-5">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
          {employee ? "Save changes" : "Create employee"}
        </button>
        {!employee && (
          <p className={`mt-2 ${t.hint} text-graphite-500`}>
            An employee ID is generated automatically on creation.
          </p>
        )}
      </div>
    </form>
  );
}
