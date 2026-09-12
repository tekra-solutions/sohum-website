import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import {
  AdminHeader, EmptyState, PageBody, SectionHeading, StatCard, StatusPill,
  adminButton,
} from "@/components/admin/ui";
import { NeedsAttention, UpcomingInterviews } from "@/components/admin/RecruitingActivity";
import { dashboardStats, recentApplications } from "@/lib/services/applications";
import { offerDashboardMetrics } from "@/lib/offers/data";
import { applicationStatusLabel, relativeTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";
import { permits } from "@/lib/ats/policy";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await requireAdmin();

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Dashboard" />
        <PageBody>
          <EmptyState
            title="Database not configured"
            description="Set DATABASE_URL and run the migration to start managing jobs and applications. See docs/DEPLOYMENT.md."
          />
        </PageBody>
      </>
    );
  }

  // Offer metrics carry compensation signal, so they are only loaded for
  // roles holding the "offers" permission — a hiring manager sees the rest
  // of the dashboard without them.
  const canSeeOffers = permits(admin.role, "offers");
  const [stats, recent, offerMetrics] = await Promise.all([
    dashboardStats(),
    recentApplications(6),
    canSeeOffers ? offerDashboardMetrics() : Promise.resolve(null),
  ]);

  // One row of counters, not two. The previous dashboard showed every pipeline
  // stage (7 cards) plus every offer state (5 more) — twelve numbers competing
  // for attention when only a handful drive a decision. The stage-by-stage
  // breakdown lives on Pipeline, which is built to show exactly that; the
  // per-state offer counts live on Offers behind its status filter.
  const counters = [
    { label: "Open jobs", value: stats.publishedJobs, href: "/admin/jobs?status=PUBLISHED" },
    { label: "New applications", value: stats.newApplications, href: "/admin/applications?status=NEW", tone: "accent" as const },
    { label: "In interview", value: stats.interview, href: "/admin/applications?status=INTERVIEW" },
    ...(offerMetrics
      ? [{ label: "Offers out", value: offerMetrics.sent + offerMetrics.awaitingResponse, href: "/admin/offers?status=AWAITING_RESPONSE" }]
      : []),
    { label: "Hired", value: stats.hired, href: "/admin/applications?status=HIRED" },
  ];

  return (
    <>
      <AdminHeader
        title={`Good to see you, ${admin.name.split(" ")[0]}`}
        description="Everything that needs you today, across open positions."
        action={
          <Link href="/admin/jobs/new" className={adminButton}>
            <Plus className="size-3.5" aria-hidden="true" />
            Create job
          </Link>
        }
      />

      <PageBody>
        <section aria-labelledby="overview">
          <h2 id="overview" className="sr-only">Overview</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {counters.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} href={c.href} tone={c.tone} />
            ))}
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <NeedsAttention />
          <UpcomingInterviews />
        </div>

        <section aria-labelledby="recent">
          <SectionHeading
            title="Recent applications"
            action={
              <Link
                href="/admin/applications"
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
              >
                View all
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Applications appear here as soon as candidates apply to a published position."
              action={<Link href="/admin/jobs/new" className={adminButton}><Plus className="size-3.5" aria-hidden="true" />Create job</Link>}
            />
          ) : (
            <ul className="grid gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300">
              {recent.map((r) => (
                <li key={r.id} className="bg-white">
                  <Link
                    href={`/admin/applications/${r.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-paper-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium text-ink-900">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-[0.75rem] text-graphite-600">{r.jobTitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="text-[0.75rem] text-graphite-500">{relativeTime(r.createdAt)}</span>
                      <StatusPill status={r.status} label={applicationStatusLabel[r.status]} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
}
