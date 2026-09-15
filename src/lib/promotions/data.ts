import "server-only";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  promotions, promotionVersions, promotionSignatures, employmentEvents,
  employees, admins,
} from "@/db/schema";
import { employeeCompensation } from "@/lib/services/employees";
import { hashOfferToken } from "@/lib/offers/tokens";

/**
 * Resolves an employee's secure promotion link.
 *
 * Mirrors offers/data.ts's resolveOfferToken: the raw token is never stored,
 * only its hash, and a link is refused unless the promotion is in a state the
 * employee may act on and its expiry has not passed.
 */
export async function resolvePromotionToken(token: string) {
  if (!token || token.length > 512) return null;
  const [row] = await db
    .select({ promotion: promotions, employee: employees })
    .from(promotions)
    .innerJoin(employees, eq(promotions.employeeId, employees.id))
    .where(eq(promotions.secureTokenHash, hashOfferToken(token)))
    .limit(1);
  if (!row) return null;
  // ACCEPTED and DECLINED remain reachable so the employee can re-open the
  // letter they signed, exactly as the offer flow allows.
  if (!["SENT", "VIEWED", "ACCEPTED", "DECLINED", "EFFECTIVE"].includes(row.promotion.status)) return null;
  if (!row.promotion.tokenExpiresAt || row.promotion.tokenExpiresAt <= new Date()) return null;
  return row;
}

/** A promotion with its current version and signature, for the admin screen. */
export async function promotionDetail(promotionId: string) {
  if (!z.uuid().safeParse(promotionId).success) return null;
  const [row] = await db
    .select({ promotion: promotions, employee: employees })
    .from(promotions)
    .innerJoin(employees, eq(promotions.employeeId, employees.id))
    .where(eq(promotions.id, promotionId))
    .limit(1);
  if (!row) return null;

  const [version] = row.promotion.currentVersionId
    ? await db.select().from(promotionVersions).where(eq(promotionVersions.id, row.promotion.currentVersionId))
    : [];
  const versions = await db.select().from(promotionVersions)
    .where(eq(promotionVersions.promotionId, promotionId))
    .orderBy(desc(promotionVersions.versionNumber));
  const [signature] = await db.select().from(promotionSignatures)
    .where(eq(promotionSignatures.promotionId, promotionId));
  const [creator] = row.promotion.createdBy
    ? await db.select({ name: admins.name }).from(admins).where(eq(admins.id, row.promotion.createdBy))
    : [];

  return { ...row, version, versions, signature, creatorName: creator?.name ?? null };
}

/** The promotion currently in flight for an employee, if any. */
export async function activePromotionFor(employeeId: string) {
  const rows = await db.select({ promotion: promotions, version: promotionVersions })
    .from(promotions)
    .leftJoin(promotionVersions, eq(promotionVersions.id, promotions.currentVersionId))
    .where(eq(promotions.employeeId, employeeId))
    .orderBy(desc(promotions.createdAt));
  return rows.find(r => !["DECLINED", "WITHDRAWN", "EXPIRED", "EFFECTIVE"].includes(r.promotion.status)) ?? null;
}

/**
 * The employee's employment history, newest first.
 *
 * Reads only from employment_events, which is append-only, so an employee's
 * previous titles and compensation survive every later change.
 */
export async function employmentHistory(employeeId: string) {
  return db.select({ event: employmentEvents, promotion: promotions })
    .from(employmentEvents)
    .leftJoin(promotions, eq(employmentEvents.promotionId, promotions.id))
    .where(eq(employmentEvents.employeeId, employeeId))
    .orderBy(desc(employmentEvents.effectiveDate), desc(employmentEvents.createdAt));
}

/** Every promotion for an employee, including terminal ones. */
export async function promotionsForEmployee(employeeId: string) {
  return db.select({ promotion: promotions, version: promotionVersions })
    .from(promotions)
    .leftJoin(promotionVersions, eq(promotionVersions.id, promotions.currentVersionId))
    .where(eq(promotions.employeeId, employeeId))
    .orderBy(desc(promotions.createdAt));
}

/** Compensation as last set by an applied promotion, for pre-filling the form. */
export async function currentCompensation(employeeId: string) {
  return employeeCompensation(employeeId);
}
