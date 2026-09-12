import Link from "next/link";
import { db } from "@/db";
import { recruitingSettings } from "@/db/schema";
import { permits } from "@/lib/ats/policy";
import { configureRecruitingAction, configureOfferDefaultsAction } from "@/lib/ats/job-actions";
import { WorkflowForm, WorkflowField } from "@/components/admin/WorkflowForm";
import { AdminHeader, Card, PageBody, StatusPill } from "@/components/admin/ui";
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
      <AdminHeader
        title="Settings"
        description="Your profile, admin accounts and system configuration."
      />

      <PageBody className="max-w-3xl">
        <Card title="Your account">
          <dl>
            {[["Name", admin.name], ["Email", admin.email], ["Role", roleLabel[admin.role] ?? admin.role]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-paper-200 py-2 last:border-0">
                <dt className={`${t.hint} text-graphite-500`}>{k}</dt>
                <dd className={`${t.body} text-ink-900`}>{v}</dd>
              </div>
            ))}
          </dl>
          <details className="mt-4 border-t border-paper-200 pt-4">
            <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Change password</summary>
            <div className="mt-4"><PasswordForm /></div>
          </details>
        </Card>

        {permits(admin.role, "settings") && (
          <Card title="Templates" description="The wording used in outbound email, offer letters and invoices">
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/settings/email-templates" className={btnSecondary}>Email templates</Link>
              <Link href="/admin/settings/offer-templates" className={btnSecondary}>Offer letter templates</Link>
              <Link href="/admin/settings/invoice-settings" className={btnSecondary}>Invoice settings</Link>
            </div>
          </Card>
        )}

        {permits(admin.role, "settings") && (
          <Card
            title="Offer letter defaults"
            description="Applied to every new offer, so recruiters only enter compensation and dates. Changing these never alters an offer already issued."
          >
            <WorkflowForm action={configureOfferDefaultsAction} label="Save offer defaults">
              <WorkflowField name="authorizedRepName" label="Authorized representative" value={recruiting?.authorizedRepName ?? ""} />
              <WorkflowField name="authorizedRepTitle" label="Representative title" value={recruiting?.authorizedRepTitle ?? ""} />
              <WorkflowField name="hrContactEmail" label="HR contact email" value={recruiting?.hrContactEmail ?? ""} />
              <WorkflowField name="defaultBenefitsSummary" label="Standard benefits summary" value={recruiting?.defaultBenefitsSummary ?? ""} multiline />
              <WorkflowField name="defaultPtoSummary" label="Standard PTO summary" value={recruiting?.defaultPtoSummary ?? ""} multiline />
            </WorkflowForm>
          </Card>
        )}

        {permits(admin.role, "settings") && (
          <Card title="Job approval workflow" description="Whether a job must be approved before it can be published">
            <WorkflowForm action={configureRecruitingAction} label="Save">
              <WorkflowField
                name="requireJobApproval"
                label="Approval before publication"
                value={recruiting?.requireJobApproval ? "1" : "0"}
                options={[
                  { value: "0", label: "Disabled — publish directly" },
                  { value: "1", label: "Enabled — jobs must be approved" },
                ]}
              />
            </WorkflowForm>
          </Card>
        )}

        {mayManage && (
          <>
            <Card title="Admin accounts" description={`${team.length} account${team.length === 1 ? "" : "s"}. Deactivating revokes access immediately.`}>
              <ul>
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
              <details className="mt-4 border-t border-paper-200 pt-4">
                <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Create an admin</summary>
                <p className={`mt-2 ${t.hint} text-graphite-600`}>
                  The password is set here and shown to nobody afterwards — pass it to the
                  person directly and have them change it.
                </p>
                <div className="mt-4"><CreateAdminForm /></div>
              </details>
            </Card>
          </>
        )}

        <Card title="Integrations" description="Configured through environment variables. Values are never displayed here.">
          <ul>
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
        </Card>
      </PageBody>
    </>
  );
}
