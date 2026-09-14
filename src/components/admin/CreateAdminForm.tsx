"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { createAdminAction, type CreateAdminState } from "@/lib/services/admin-actions";
import { Field, Select, btn, t } from "@/components/admin/form";
import { adminRoles } from "@/lib/validation/schemas";

const initial: CreateAdminState = {};

const roleLabel: Record<string, string> = {
  ADMIN: "Admin — manage jobs, applications and employees",
  RECRUITER: "Recruiter — manage jobs and applications",
  SUPER_ADMIN: "Super admin — full access, including admin accounts",
};

export function CreateAdminForm() {
  const [state, action, pending] = useActionState(createAdminAction, initial);
  const e = state.errors ?? {};

  return (
    <form action={action} className="max-w-md space-y-4">
      <div aria-live="polite">
        {state.ok && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-3">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p className={`${t.body} text-[#14603b]`}>
              Created <strong>{state.createdEmail}</strong>. Share the password with them
              directly — it is not sent by email.
            </p>
          </div>
        )}
        {state.message && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className={`${t.body} text-[#8e2c20]`}>{state.message}</p>
          </div>
        )}
      </div>

      <Field name="name" label="Full name" required error={e.name} autoComplete="off" />
      <Field name="email" label="Email" type="email" required error={e.email} autoComplete="off" inputMode="email" />
      <Select
        name="role"
        label="Role"
        defaultValue="ADMIN"
        options={adminRoles.map((r) => ({ value: r, label: roleLabel[r] }))}
        error={e.role}
      />
      <Field
        name="password" label="Temporary password" type="password" required
        error={e.password} autoComplete="new-password"
        hint="At least 12 characters, with upper and lower case and a number."
      />
      <Field
        name="confirmPassword" label="Confirm password" type="password" required
        error={e.confirmPassword} autoComplete="new-password"
      />

      <button type="submit" disabled={pending} className={btn}>
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <UserPlus className="size-3.5" aria-hidden="true" />}
        Create admin
      </button>
    </form>
  );
}
