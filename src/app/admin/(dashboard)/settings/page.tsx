import { AdminHeader } from "@/components/admin/ui";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { requireAdmin } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/env";
import { isStorageConfigured } from "@/lib/storage/resumes";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdmin();

  /** Read-only: secrets are never surfaced, only whether they are present. */
  const integrations = [
    { name: "Database", ok: isDatabaseConfigured(), hint: "DATABASE_URL" },
    { name: "Resume storage", ok: isStorageConfigured(), hint: "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Email", ok: isEmailConfigured(), hint: "RESEND_API_KEY or SMTP_HOST" },
  ];

  return (
    <>
      <AdminHeader title="Settings" description="Your profile and system configuration." />

      <div className="max-w-3xl space-y-5 p-5 sm:p-8">
        <section className="rounded-[4px] border border-paper-300 bg-white p-6">
          <h2 className="text-[1.0625rem] font-medium text-ink-900">Profile</h2>
          <dl className="mt-4">
            {[
              ["Name", admin.name],
              ["Email", admin.email],
              ["Role", admin.role],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 border-b border-paper-200 py-3 last:border-0">
                <dt className="text-[0.8125rem] text-graphite-500">{k}</dt>
                <dd className="text-[0.9375rem] text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-[4px] border border-paper-300 bg-white p-6">
          <h2 className="text-[1.0625rem] font-medium text-ink-900">Change password</h2>
          <div className="mt-4">
            <PasswordForm />
          </div>
        </section>

        <section className="rounded-[4px] border border-paper-300 bg-white p-6">
          <h2 className="text-[1.0625rem] font-medium text-ink-900">Integrations</h2>
          <p className="mt-1.5 text-[0.875rem] text-graphite-600">
            Configured through environment variables. Values are never displayed here.
          </p>
          <ul className="mt-4">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-4 border-b border-paper-200 py-3 last:border-0">
                <div>
                  <p className="text-[0.9375rem] text-ink-900">{i.name}</p>
                  <p className="font-mono text-[0.75rem] text-graphite-500">{i.hint}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
                  i.ok ? "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]" : "border-paper-300 bg-paper-100 text-graphite-600"
                }`}>
                  {i.ok ? "Configured" : "Not set"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
