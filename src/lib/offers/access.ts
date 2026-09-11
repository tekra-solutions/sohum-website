import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { offers, applications } from "@/db/schema";
import { candidateScope } from "@/lib/ats/access";
import { requirePermission } from "@/lib/ats/access";
import { requireAdmin, type SessionAdmin } from "@/lib/auth/session";
import type { Permission } from "@/lib/ats/policy";

/**
 * An offer inherits its parent application's visibility exactly — there is
 * no separate offer-scoping rule. Joins to applications and applies the
 * existing candidateScope() against that joined row.
 */
export async function accessibleOffer(offerId: string, admin: SessionAdmin) {
  if (!z.uuid().safeParse(offerId).success) return null;
  const [row] = await db
    .select({ offer: offers, application: applications })
    .from(offers)
    .innerJoin(applications, eq(offers.applicationId, applications.id))
    .where(and(eq(offers.id, offerId), candidateScope(admin)))
    .limit(1);
  return row ?? null;
}

export async function requireOffer(offerId: string, permission?: Permission) {
  const admin = permission ? await requirePermission(permission) : await requireAdmin();
  const row = await accessibleOffer(offerId, admin);
  if (!row) notFound();
  return { admin, offer: row.offer, application: row.application };
}
