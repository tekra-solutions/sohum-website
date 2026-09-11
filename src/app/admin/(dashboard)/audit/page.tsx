import Link from "next/link";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { admins, auditLogs } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { positivePage } from "@/lib/ats/policy";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, adminButtonSecondary } from "@/components/admin/ui";
import { control } from "@/components/admin/form";
export const dynamic = "force-dynamic";
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string; user?: string; page?: string }> }) {
  await requirePermission("audit"); const sp = await searchParams; const page = positivePage(sp.page);
  const where = and(sp.action ? ilike(auditLogs.action, `%${sp.action.slice(0,80)}%`) : undefined, sp.entity ? eq(auditLogs.entityType, sp.entity.slice(0,60)) : undefined, sp.user ? ilike(admins.name, `%${sp.user.slice(0,160)}%`) : undefined);
  const [rows, totals] = await Promise.all([db.select({ event: auditLogs, name: admins.name }).from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id)).where(where).orderBy(desc(auditLogs.createdAt)).limit(50).offset((page-1)*50), db.select({ n: count() }).from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id)).where(where)]);
  const href = (p: number) => `/admin/audit?${new URLSearchParams({ action: sp.action ?? "", entity: sp.entity ?? "", user: sp.user ?? "", page: String(p) })}`;
  return <><AdminHeader title="Audit log" description={`${totals[0]?.n ?? 0} recorded events.`} /><div className="space-y-5 p-5 sm:p-8"><form className="flex flex-wrap items-end gap-3">{["action","entity","user"].map(name => <label key={name} className="text-xs capitalize">{name}<input name={name} defaultValue={sp[name as "action"]} className={control} /></label>)}<button className={adminButtonSecondary}>Filter</button></form><div className="overflow-x-auto rounded-[4px] border border-paper-300 bg-white"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr>{["Date", "User", "Action", "Entity"].map(h => <th key={h} className="border-b border-paper-300 p-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(({ event: e, name }) => <tr key={e.id} className="border-b border-paper-200"><td className="p-3">{formatDateTime(e.createdAt)}</td><td className="p-3">{name ?? "System"}</td><td className="p-3">{e.action.replaceAll("_"," ")}</td><td className="p-3">{e.entityType === "application" && e.entityId ? <Link href={`/admin/applications/${e.entityId}`} className="underline">Application</Link> : e.entityType}</td></tr>)}</tbody></table></div><nav className="flex gap-3" aria-label="Audit pagination">{page > 1 && <Link className={adminButtonSecondary} href={href(page-1)}>Previous</Link>}{page*50 < (totals[0]?.n ?? 0) && <Link className={adminButtonSecondary} href={href(page+1)}>Next</Link>}</nav></div></>;
}
