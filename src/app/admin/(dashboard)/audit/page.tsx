import Link from "next/link";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { admins, auditLogs } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { positivePage } from "@/lib/ats/policy";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, DataTable, EmptyState, Filter, PageBody, Pager, Toolbar, td, tr } from "@/components/admin/ui";
import { control } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

const PER_PAGE = 50;

/** Entity types that have a screen worth linking to. */
const entityHref: Record<string, (id: string) => string> = {
  application: id => `/admin/applications/${id}`,
  offer: id => `/admin/offers/${id}`,
  invoice: id => `/admin/invoices/${id}`,
  employee: id => `/admin/employees/${id}`,
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; user?: string; page?: string }>;
}) {
  await requirePermission("audit");
  const sp = await searchParams;
  const page = positivePage(sp.page);

  const where = and(
    sp.action ? ilike(auditLogs.action, `%${sp.action.slice(0, 80)}%`) : undefined,
    sp.entity ? eq(auditLogs.entityType, sp.entity.slice(0, 60)) : undefined,
    sp.user ? ilike(admins.name, `%${sp.user.slice(0, 160)}%`) : undefined,
  );

  const [rows, totals] = await Promise.all([
    db.select({ event: auditLogs, name: admins.name })
      .from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id))
      .where(where).orderBy(desc(auditLogs.createdAt))
      .limit(PER_PAGE).offset((page - 1) * PER_PAGE),
    db.select({ n: count() }).from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id)).where(where),
  ]);

  const total = totals[0]?.n ?? 0;
  const filtered = Boolean(sp.action || sp.entity || sp.user);
  const href = (p: number) =>
    `/admin/audit?${new URLSearchParams({ action: sp.action ?? "", entity: sp.entity ?? "", user: sp.user ?? "", page: String(p) })}`;

  return (
    <>
      <AdminHeader title="Audit log" description={`${total.toLocaleString()} recorded event${total === 1 ? "" : "s"}.`} />
      <PageBody>
        <Toolbar>
          <Filter label="Action"><input name="action" defaultValue={sp.action} placeholder="e.g. offer sent" className={control} /></Filter>
          <Filter label="Entity"><input name="entity" defaultValue={sp.entity} placeholder="e.g. application" className={control} /></Filter>
          <Filter label="User"><input name="user" defaultValue={sp.user} placeholder="Name" className={control} /></Filter>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No matching events" : "No activity recorded yet"}
            description={filtered
              ? "Try a broader search, or clear the filters to see all recorded activity."
              : "Administrator actions are recorded here as they happen."}
            action={filtered ? <Link href="/admin/audit" className="text-[0.8125rem] font-medium text-ink-900 underline underline-offset-4">Clear filters</Link> : undefined}
          />
        ) : (
          <DataTable headers={["Date", "User", "Action", "Entity"]} minWidth="40rem">
            {rows.map(({ event: e, name }) => (
              <tr key={e.id} className={tr}>
                <td className={`${td} whitespace-nowrap text-graphite-600`}>{formatDateTime(e.createdAt)}</td>
                <td className={`${td} text-ink-900`}>{name ?? "System"}</td>
                <td className={`${td} first-letter:uppercase`}>{e.action.replaceAll("_", " ").toLowerCase()}</td>
                <td className={td}>
                  {e.entityId && entityHref[e.entityType] ? (
                    <Link href={entityHref[e.entityType](e.entityId)} className="capitalize underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                      {e.entityType}
                    </Link>
                  ) : (
                    <span className="capitalize text-graphite-500">{e.entityType || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        <Pager page={page} pageCount={Math.ceil(total / PER_PAGE)} href={href} />
      </PageBody>
    </>
  );
}
