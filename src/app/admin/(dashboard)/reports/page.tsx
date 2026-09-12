import { recruitingReport } from "@/lib/ats/reports";
import { stages } from "@/lib/ats/policy";
import { applicationStatusLabel } from "@/lib/format";
import { AdminHeader, Card, Filter, PageBody, StatCard, Toolbar, adminButtonSecondary } from "@/components/admin/ui";
import { control, t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

/**
 * A time series, drawn as columns against a shared baseline.
 *
 * This was previously rendered with the same horizontal bars as the
 * categorical breakdowns, where every day scaled to its own row — on a steady
 * stream of one application a day that produced eight identical full-width
 * bars, which reads as "flat at maximum" rather than "one per day". Columns
 * against a common maximum show the actual shape.
 */
function TimeSeries({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  if (!rows.length) return <p className={`${t.body} text-graphite-500`}>No data in this period.</p>;
  return (
    <div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`Applications per day: ${rows.map(r => `${r.label}, ${r.value}`).join("; ")}`}>
        {rows.map(row => (
          <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[0.625rem] tabular-nums text-graphite-500">{row.value || ""}</span>
            <div
              className="w-full rounded-t-[2px] bg-ink-700"
              style={{ height: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-paper-200 pt-2 text-[0.625rem] text-graphite-500">
        <span>{rows[0]?.label}</span>
        <span>{rows[rows.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/**
 * Horizontal bars. Values are scaled to the largest row so the shape of the
 * distribution is readable; the number is always present for the exact value.
 */
function ReportBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  if (!rows.length) return <p className={`${t.body} text-graphite-500`}>No data in this period.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map(row => (
        <div key={row.label}>
          <div className="flex justify-between gap-4 text-[0.75rem]">
            <span className="truncate text-graphite-700">{applicationStatusLabel[row.label] ?? row.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink-900">{row.value}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-paper-100">
            <div className="h-1.5 rounded-full bg-ink-700" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const r = await recruitingReport(sp.from, sp.to, sp.range);
  const query = new URLSearchParams({
    from: r.start.toISOString().slice(0, 10),
    to: r.end.toISOString().slice(0, 10),
  });

  const funnel = [
    { label: "Job views", value: r.views },
    { label: "Applications", value: r.byStatus.reduce((n, s) => n + s.value, 0) },
    ...stages
      .filter(s => !["NEW", "REJECTED"].includes(s))
      .map(s => ({ label: s, value: r.reached.find(v => v.label === s)?.value ?? 0 })),
  ];

  return (
    <>
      <AdminHeader title="Reports" description="Applications, hiring progress and source performance." />
      <PageBody>
        <Toolbar action="Apply">
          <Filter label="Period">
            <select name="range" defaultValue={sp.range ?? "30"} className={control}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="year">This year</option>
            </select>
          </Filter>
          <Filter label="From">
            <input name="from" type="date" defaultValue={sp.from} className={control} />
          </Filter>
          <Filter label="To">
            <input name="to" type="date" defaultValue={sp.to} className={control} />
          </Filter>
        </Toolbar>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Job views" value={r.views} />
          <StatCard label="Applications" value={r.byStatus.reduce((n, s) => n + s.value, 0)} />
          <StatCard label="Avg. days to interview" value={r.timing?.interview?.toFixed(1) ?? "—"} />
          <StatCard label="Avg. days to hire" value={r.timing?.hire?.toFixed(1) ?? "—"} />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card title="Hiring funnel" description="Candidates reaching each stage, including those who have since moved on">
            <ReportBars rows={funnel} />
          </Card>
          <Card title="Current stage" description="Where active candidates sit today">
            <ReportBars rows={r.byStatus} />
          </Card>
          <Card title="Source" description="Where applications came from">
            <ReportBars rows={r.bySource} />
          </Card>
          <Card title="By position">
            <ReportBars rows={r.byJob} />
          </Card>
          <Card title="Applications over time" description="UTC days" className="xl:col-span-2">
            <TimeSeries rows={r.overTime} />
          </Card>
        </div>

        {/* Export is a deliberate, occasional action — it belongs at the end of
            the report a user has just framed with the filters above, not as a
            row of buttons competing with the page title. */}
        <Card title="Export" description="Comma-separated values for the period selected above">
          <div className="flex flex-wrap gap-2">
            {["applications", "candidates", "jobs", "interviews"].map(type => (
              <a key={type} href={`/api/admin/export?type=${type}&${query}`} className={adminButtonSecondary}>
                {type[0].toUpperCase() + type.slice(1)}
              </a>
            ))}
          </div>
        </Card>

        <p className={`${t.hint} text-graphite-500`}>
          Times use the first recorded stage entry for applications submitted in this period. Stage
          reach counts historical entries, not just the current stage. Job views count visits
          recorded since tracking was enabled.
        </p>
      </PageBody>
    </>
  );
}
