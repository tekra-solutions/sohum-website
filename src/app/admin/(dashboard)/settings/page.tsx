import { db } from "@/db";
import { recruitingSettings } from "@/db/schema";
import { permits } from "@/lib/ats/policy";
import { configureRecruitingAction } from "@/lib/ats/job-actions";
import { WorkflowForm, WorkflowField } from "@/components/admin/WorkflowForm";
import { AdminHeader, StatusPill } from "@/components/admin/ui";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { CreateAdminForm } from "@/components/admin/CreateAdminForm";
import { btnSecondary, t } from "@/components/admin/form";
import { listAdmins, setAdminActiveAction } from "@/lib/services/admin-actions";
import { canManageAdmins } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/env";
import { isStorageConfigured } from "@/lib/storage/resumes";
import { isDatabaseConfigured } from "@/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  SUPER_ADMIN: "Super admin",
};

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const [recruiting] = permits(admin.role, "settings") ? await db.select().from(recruitingSettings).limit(1) : [];
  const mayManage = canManageAdmins(admin.role);
  const team = mayManage && isDatabaseConfigured() ? await listAdmins() : [];

  const integrations = [
    { name: "Database", ok: isDatabaseConfigured(), hint: "DATABASE_URL" },
    { name: "Resume storage", ok: isStorageConfigured(), hint: "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Email", ok: isEmailConfigured(), hint: "RESEND_API_KEY or SMTP_HOST" },
  ];

  return (
    <>
      {permits(admin.role, "settings") && <a href="/admin/settings/email-templates" className="block px-8 pt-4 text-sm underline">Manage email templates</a>}
      <AdminHeader title="Settings" description="Your profile, admin accounts and system configuration." />

      <div className="max-w-3xl space-y-5 p-5 sm:p-6 lg:p-8">
        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Profile</h2>
          <dl className="mt-3">
            {[["Name", admin.name], ["Email", admin.email], ["Role", roleLabel[admin.role] ?? admin.role]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-paper-200 py-2 last:border-0">
                <dt className={`${t.hint} text-graphite-500`}>{k}</dt>
                <dd className={`${t.body} text-ink-900`}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Change password</h2>
          <div className="mt-3">
            <PasswordForm />
          </div>
        </section>

        {permits(admin.role, "settings") && <section className="rounded-[4px] border border-paper-300 bg-white p-5"><h2 className="mb-3 text-sm font-medium">Job approval workflow</h2><WorkflowForm action={configureRecruitingAction} label="Save recruiting settings"><WorkflowField name="requireJobApproval" label="Approval before publication" value={recruiting?.requireJobApproval ? "1" : "0"} options={[{ value: "0", label: "Disabled — preserve direct publication" }, { value: "1", label: "Enabled — jobs must be approved" }]} /></WorkflowForm></section>}
        {mayManage && (
          <>
            <section className="rounded-[4px] border border-paper-300 bg-white p-5">
              <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Admin accounts</h2>
              <p className={`mt-1 ${t.hint} text-graphite-600`}>
                {team.length} account{team.length === 1 ? "" : "s"}. Deactivating revokes access immediately.
              </p>
              <ul className="mt-3">
                {team.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 py-2.5 last:border-0">
                    <div className="min-w-0">
                      <p className={`${t.body} font-medium text-ink-900`}>
                        {a.name}
                        {a.id === admin.id && (
                          <span className={`ml-2 ${t.hint} font-normal text-graphite-500`}>(you)</span>
                        )}
                      </p>
                      <p className={`${t.hint} text-graphite-600`}>
                        {a.email} · {roleLabel[a.role] ?? a.role}
                        {a.lastLoginAt ? ` · last in ${relativeTime(a.lastLoginAt)}` : " · never signed in"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <StatusPill status={a.isActive ? "PUBLISHED" : "ARCHIVED"} label={a.isActive ? "Active" : "Disabled"} />
                      {a.id !== admin.id && (
                        <form action={setAdminActiveAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="active" value={String(!a.isActive)} />
                          <button type="submit" className={btnSecondary}>
                            {a.isActive ? "Disable" : "Enable"}
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[4px] border border-paper-300 bg-white p-5">
              <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Create an admin</h2>
              <p className={`mt-1 ${t.hint} text-graphite-600`}>
                The password is set here and shown to nobody afterwards — pass it to the
                person directly and have them change it.
              </p>
              <div className="mt-4">
                <CreateAdminForm />
              </div>
            </section>
          </>
        )}

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Integrations</h2>
          <p className={`mt-1 ${t.hint} text-graphite-600`}>
            Configured through environment variables. Values are never displayed here.
          </p>
          <ul className="mt-3">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-4 border-b border-paper-200 py-2.5 last:border-0">
                <div>
                  <p className={`${t.body} text-ink-900`}>{i.name}</p>
                  <p className={`font-mono ${t.micro} text-graphite-500`}>{i.hint}</p>
                </div>
                <StatusPill status={i.ok ? "PUBLISHED" : "DRAFT"} label={i.ok ? "Configured" : "Not set"} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
