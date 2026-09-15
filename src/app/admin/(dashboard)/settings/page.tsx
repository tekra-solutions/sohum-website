import Link from "next/link";
import { ArrowUpRight, FileText, Mail, Receipt, ShieldCheck, Users, SlidersHorizontal, Plug, UserRound, CheckCircle2, CircleAlert } from "lucide-react";
import { db, isDatabaseConfigured } from "@/db";
import { recruitingSettings } from "@/db/schema";
import { permits } from "@/lib/ats/policy";
import { configureRecruitingAction, configureOfferDefaultsAction } from "@/lib/ats/job-actions";
import { WorkflowForm, WorkflowField } from "@/components/admin/WorkflowForm";
import { AdminHeader, Card, PageBody } from "@/components/admin/ui";
import { PasswordForm } from "@/components/admin/PasswordForm";
import { AdminTeamSettings } from "@/components/admin/AdminTeamSettings";
import { listAdmins } from "@/lib/services/admin-actions";
import { adminRoleDetails, canManageAdmins } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { isCronConfigured, isEmailConfigured } from "@/lib/env";
import { isStorageConfigured } from "@/lib/storage/resumes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const mayConfigure = permits(admin.role, "settings");
  const mayManage = canManageAdmins(admin.role);
  const [[recruiting], team] = await Promise.all([
    mayConfigure && isDatabaseConfigured() ? db.select().from(recruitingSettings).limit(1) : Promise.resolve([]),
    mayManage && isDatabaseConfigured() ? listAdmins() : Promise.resolve([]),
  ]);
  const sections = [
    ...(mayManage ? [{ id: "team", label: "Team & access", icon: Users }] : []),
    { id: "account", label: "Your account", icon: UserRound },
    ...(mayConfigure ? [
      { id: "templates", label: "Templates", icon: FileText },
      { id: "recruiting", label: "Recruiting defaults", icon: SlidersHorizontal },
      { id: "integrations", label: "Integrations", icon: Plug },
    ] : []),
  ];
  const integrations = [
    { name: "Database", ok: isDatabaseConfigured(), description: "Jobs, candidates and business records.", setup: "Configure the database connection with your deployment administrator." },
    { name: "Document storage", ok: isStorageConfigured(), description: "Private resumes, offer letters and invoices.", setup: "Connect Supabase and configure the private document buckets." },
    { name: "Email delivery", ok: isEmailConfigured(), description: "Candidate messages and signing verification codes.", setup: "Connect an email provider and verify the sender address." },
    { name: "Scheduled jobs", ok: isCronConfigured(), description: "Apply signed promotions on their effective date.", setup: "Configure the scheduled-job secret in deployment settings." },
  ];
  return (
    <>
      <AdminHeader title="Settings" description="Manage your team, recruiting preferences and connected services." />
      <PageBody className="max-w-7xl">
        <div className="grid items-start gap-6 xl:grid-cols-[180px_minmax(0,1fr)] xl:gap-8">
          <nav aria-label="Settings sections" className="xl:sticky xl:top-28">
            <p className="mb-3 hidden text-[0.625rem] font-semibold uppercase tracking-widest text-graphite-400 xl:block">Workspace settings</p>
            <ul className="flex flex-wrap gap-1 xl:flex-col">{sections.map(({id,label,icon:Icon}) => <li key={id}><a href={`#${id}`} className="flex items-center gap-2.5 rounded px-3 py-2.5 text-xs font-medium text-graphite-600 transition-colors hover:bg-white hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</a></li>)}</ul>
          </nav>
          <div className="min-w-0 space-y-6">
            {mayManage && <AdminTeamSettings team={team} currentAdminId={admin.id} />}
            <section id="account" aria-label="Your account" className="scroll-mt-28">
              <Card title="Your account" description="Your profile and sign-in security.">
                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-medium text-white">{admin.name.split(/\s+/).map(n => n[0]).slice(0,2).join("")}</span>
                  <div className="min-w-0"><p className="text-sm font-medium text-ink-900">{admin.name}</p><p className="mt-1 break-all text-xs text-graphite-600">{admin.email}</p><p className="mt-2 text-xs text-graphite-500">{adminRoleDetails[admin.role]?.label ?? admin.role}</p></div>
                </div>
                <details className="group mt-5 border-t border-paper-200 pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded py-1 text-sm font-medium text-ink-900 focus-visible:outline-2"><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-graphite-500" aria-hidden="true" />Change password</span><span aria-hidden="true" className="text-lg font-normal text-graphite-400 group-open:rotate-45">+</span></summary>
                  <div className="mt-5"><PasswordForm /></div>
                </details>
              </Card>
            </section>
            {mayConfigure && <>
              <section id="templates" aria-labelledby="templates-title" className="scroll-mt-28">
                <h2 id="templates-title" className="text-base font-medium text-ink-900">Templates & documents</h2>
                <p className="mb-4 mt-1 text-xs text-graphite-500">Keep messages and documents consistent across your team.</p>
                <div className="grid gap-3 sm:grid-cols-3">{[
                  { href: "/admin/settings/email-templates", title: "Email templates", description: "Candidate messages and reusable replies.", icon: Mail },
                  { href: "/admin/settings/offer-templates", title: "Letter templates", description: "Offer and promotion letter wording.", icon: FileText },
                  { href: "/admin/settings/invoice-settings", title: "Invoice settings", description: "Billing identity, payment terms and numbering.", icon: Receipt },
                ].map(({href,title,description,icon:Icon}) => <Link key={href} href={href} className="group rounded border border-paper-300 bg-white p-4 transition-colors hover:border-ink-500/40 focus-visible:outline-2 focus-visible:outline-offset-2"><div className="flex items-center justify-between"><Icon className="size-5 text-graphite-500" aria-hidden="true" /><ArrowUpRight className="size-4 text-graphite-400 group-hover:text-flame-600" aria-hidden="true" /></div><h3 className="mt-4 text-sm font-medium text-ink-900">{title}</h3><p className="mt-1.5 text-xs leading-5 text-graphite-500">{description}</p></Link>)}</div>
              </section>
              <section id="recruiting" aria-label="Recruiting defaults" className="scroll-mt-28 space-y-4">
                <Card title="Offer letter defaults" description="Pre-fill new letters. Changes apply to future drafts; issued letters stay unchanged.">
                  <WorkflowForm action={configureOfferDefaultsAction} label="Save letter defaults">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <WorkflowField name="authorizedRepName" label="Authorized representative" value={recruiting?.authorizedRepName ?? ""} />
                      <WorkflowField name="authorizedRepTitle" label="Representative title" value={recruiting?.authorizedRepTitle ?? ""} />
                      <div className="sm:col-span-2"><WorkflowField name="hrContactEmail" label="HR contact email" type="email" value={recruiting?.hrContactEmail ?? ""} /></div>
                      <WorkflowField name="defaultBenefitsSummary" label="Standard benefits" value={recruiting?.defaultBenefitsSummary ?? ""} multiline />
                      <WorkflowField name="defaultPtoSummary" label="Paid time off" value={recruiting?.defaultPtoSummary ?? ""} multiline />
                    </div>
                  </WorkflowForm>
                </Card>
                <Card title="Job approval" description="Choose whether jobs need approval before appearing on your careers page.">
                  <WorkflowForm action={configureRecruitingAction} label="Save approval preference">
                    <WorkflowField name="requireJobApproval" label="Before a job is published" value={recruiting?.requireJobApproval ? "1" : "0"} options={[{value:"0",label:"Allow direct publishing"},{value:"1",label:"Require approval"}]} />
                  </WorkflowForm>
                </Card>
              </section>
              <section id="integrations" aria-label="Integrations" className="scroll-mt-28">
                <Card title="Integrations" description="Configuration status. Delivery and connectivity should be verified in your deployment.">
                  <ul className="divide-y divide-paper-200">{integrations.map(i => <li key={i.name} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">{i.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1e7a4d]" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#7a5c00]" aria-hidden="true" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium text-ink-900">{i.name}</p><span className={`text-xs ${i.ok ? "text-[#1e7a4d]" : "text-[#7a5c00]"}`}>{i.ok ? "Configured" : "Setup needed"}</span></div><p className="mt-1 text-xs leading-5 text-graphite-500">{i.description}</p>{!i.ok && <p className="mt-2 text-xs leading-5 text-[#7a5c00]">{i.setup}</p>}</div></li>)}</ul>
                </Card>
              </section>
            </>}
          </div>
        </div>
      </PageBody>
    </>
  );
}
