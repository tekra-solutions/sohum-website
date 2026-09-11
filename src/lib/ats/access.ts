import "server-only";
import { cache } from "react";
import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { applications, jobs, jobAssignments } from "@/db/schema";
import { requireAdmin, type SessionAdmin } from "@/lib/auth/session";
import { permits, unrestricted, type Permission } from "./policy";
export async function requirePermission(permission: Permission) {
  const admin = await requireAdmin();
  if (!permits(admin.role, permission)) notFound();
  return admin;
}
export function candidateScope(admin: SessionAdmin) {
  if (unrestricted(admin.role)) return sql`true`;
  if (admin.role === "RECRUITER") return eq(applications.assignedTo, admin.id);
  return sql`exists (select 1 from ${jobAssignments} where ${jobAssignments.jobId} = ${applications.jobId} and ${jobAssignments.adminId} = ${admin.id})`;
}
export function jobScope(admin: SessionAdmin) {
  if (unrestricted(admin.role)) return sql`true`;
  return sql`exists (select 1 from ${jobAssignments} where ${jobAssignments.jobId} = ${jobs.id} and ${jobAssignments.adminId} = ${admin.id})`;
}
/**
 * Deduplicated per request: the page, its nested server components and
 * candidateWorkspace() each call requireApplication() for the same id, which
 * previously meant three identical scoped round trips to a pooled remote
 * database. Keyed by admin id and role as well as the application id, so a
 * different viewer never reuses another viewer's scope decision.
 */
const loadAccessibleApplication = cache(async (id: string, adminId: string, role: string) => {
  const [row] = await db.select().from(applications)
    .where(and(eq(applications.id, id), candidateScope({ id: adminId, role } as SessionAdmin)))
    .limit(1);
  return row ?? null;
});

export async function accessibleApplication(id: string, admin: SessionAdmin) {
  if (!z.uuid().safeParse(id).success) return null;
  return loadAccessibleApplication(id, admin.id, admin.role);
}
export async function requireApplication(id: string, permission?: Permission) {
  const admin = permission ? await requirePermission(permission) : await requireAdmin();
  const app = await accessibleApplication(id, admin);
  if (!app) notFound();
  return { admin, app };
}
