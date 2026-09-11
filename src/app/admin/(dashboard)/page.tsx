import { RecruitingActivity } from "@/components/admin/RecruitingActivity";
import Link from "next/link";
import { ArrowRight, Briefcase, Plus, Users } from "lucide-react";
import { AdminHeader, EmptyState, StatCard, StatusPill, adminButton, adminButtonSecondary } from "@/components/admin/ui";
import { dashboardStats, recentApplications } from "@/lib/services/applications";
import { applicationStatusLabel, relativeTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Dashboard" />
        <div className="p-5 sm:p-8">
          <EmptyState
            title="Database not configured"
            description="Set DATABASE_URL and run the migration to start managing jobs and applications. See docs/DEPLOYMENT.md."
          />
        </div>
      </>
    );
  }

  const [stats, recent] = await Promise.all([dashboardStats(), recentApplications(6)]);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Recruiting activity across open positions."
        action={
          <>
            <Link href="/admin/jobs/new" className={adminButton}>
              <Plus className="size-3.5" aria-hidden="true" />
              Create job
            </Link>
            <Link href="/admin/applications" className={adminButtonSecondary}>
              View applications
            </Link>
          </>
        }
      />

      <div className="space-y-7 p-5 sm:p-6 lg:p-8">
        {/* ---- Counters ---- */}
        <section aria-labelledby="overview">
          <h2 id="overview" className="sr-only">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <StatCard label="Open jobs" value={stats.publishedJobs} href="/admin/jobs?status=PUBLISHED" />
            <StatCard label="Applications" value={stats.totalApplications} href="/admin/applications" />
            <StatCard label="New" value={stats.newApplications} href="/admin/applications?status=NEW" tone="accent" />
            <StatCard label="Screening" value={stats.reviewing} href="/admin/applications?status=SCREENING" />
            <StatCard label="Interview" value={stats.interview} href="/admin/applications?status=INTERVIEW" />
            <StatCard label="Offers" value={stats.offer} href="/admin/applications?status=OFFER" />
            <StatCard label="Hired" value={stats.hired} href="/admin/applications?status=HIRED" />
          </div>
        </section>

        <RecruitingActivity />

        {/* ---- Recent applications ---- */}
        <section aria-labelledby="recent">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="recent" className="text-[0.9375rem] font-medium text-ink-900">
              Recent applications
            </h2>
            <Link
              href="/admin/applications"
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
            >
              View all
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4">
            {recent.length === 0 ? (
              <EmptyState
                title="No applications yet"
                description="Applications appear here as soon as candidates apply to a published position."
                action={
                  <Link href="/admin/jobs" className={adminButtonSecondary}>
                    <Briefcase className="size-3.5" aria-hidden="true" />
                    Manage jobs
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300">
                {recent.map((r) => (
                  <li key={r.id} className="bg-white">
                    <Link
                      href={`/admin/applications/${r.id}`}
                      className="group/row flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-paper-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[0.8125rem] font-medium text-ink-900">
                          {r.firstName} {r.lastName}
                        </p>
                        <p className="mt-0.5 truncate text-[0.75rem] text-graphite-600">
                          {r.jobTitle}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="text-[0.75rem] text-graphite-500">
                          {relativeTime(r.createdAt)}
                        </span>
                        <StatusPill status={r.status} label={applicationStatusLabel[r.status]} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---- Quick actions ---- */}
        <section aria-labelledby="actions">
          <h2 id="actions" className="text-[0.9375rem] font-medium text-ink-900">
            Quick actions
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { href: "/admin/jobs/new", Icon: Plus, title: "Create a job", body: "Draft a new position and publish when ready." },
              { href: "/admin/jobs", Icon: Briefcase, title: "Manage jobs", body: `${stats.publishedJobs} published · ${stats.draftJobs} draft` },
              { href: "/admin/applications", Icon: Users, title: "Review applications", body: `${stats.newApplications} new to triage` },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group/qa rounded-[4px] border border-paper-300 bg-white p-4 transition-[border-color,box-shadow] duration-300 hover:border-ink-500/30 hover:shadow-[var(--shadow-lift)]"
              >
                <a.Icon className="size-4.5 text-ink-500" strokeWidth={1.5} aria-hidden="true" />
                <p className="mt-2.5 text-[0.8125rem] font-medium text-ink-900">{a.title}</p>
                <p className="mt-0.5 text-[0.75rem] text-graphite-600">{a.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
