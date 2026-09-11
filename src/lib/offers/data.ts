import "server-only";
import { and, desc, eq, gte, ilike, lte, or, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { offers, offerVersions, applications, jobs, admins } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { candidateScope } from "@/lib/ats/access";
import { positivePage } from "@/lib/ats/policy";
import { hashOfferToken } from "./tokens";

/**
 * Resolves a candidate-facing token to its offer + application, or null.
 * Never throws — the page renders one uniform "invalid or expired" message
 * either way, never distinguishing not-found from expired from withdrawn.
 * Lives here (not in the "use server" actions file) because a Next.js
 * server-actions file may only export async functions — this needs to be
 * importable from a plain server component too.
 */
export async function resolveOfferToken(token: string) {
  if (!token || token.length > 512) return null;
  const [row] = await db
    .select({ offer: offers, application: applications })
    .from(offers)
    .innerJoin(applications, eq(offers.applicationId, applications.id))
    .where(eq(offers.secureTokenHash, hashOfferToken(token)))
    .limit(1);
  return row ?? null;
}

/** The latest non-superseded offer for an application, with its current
 * version — or null if none exists. Meant to be embedded into an existing
 * Promise.all (e.g. candidateWorkspace) rather than fetched separately. */
export async function offerForApplication(applicationId: string) {
  const [row] = await db
    .select({ offer: offers, version: offerVersions })
    .from(offers)
    .leftJoin(offerVersions, eq(offers.currentVersionId, offerVersions.id))
    .where(eq(offers.applicationId, applicationId))
    .orderBy(desc(offers.createdAt))
    .limit(1);
  return row ?? null;
}

export type OfferListFilters = {
  status?: string;
  jobId?: string;
  recruiterId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
};

const offerStatusValues = [
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "VIEWED",
  "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN",
] as const;

export async function listOffers(f: OfferListFilters) {
  const admin = await requireAdmin();
  const page = positivePage(f.page);
  const pageSize = 25;

  const where = [candidateScope(admin)];
  if (f.status && (offerStatusValues as readonly string[]).includes(f.status)) {
    where.push(eq(offers.status, f.status as (typeof offerStatusValues)[number]));
  }
  if (f.jobId) where.push(eq(applications.jobId, f.jobId));
  if (f.recruiterId) where.push(eq(offers.createdBy, f.recruiterId));
  // Dates come in as calendar-day strings from a filter form; coerce to Date
  // then hand Drizzle's typed operators the ISO string, never a bare Date —
  // a raw sql`` template with a Date object fails to bind (see the fix
  // earlier this session to reports.ts/applications.ts for the same bug).
  if (f.from && !isNaN(Date.parse(f.from))) where.push(gte(offers.createdAt, new Date(f.from)));
  if (f.to && !isNaN(Date.parse(f.to))) {
    const end = new Date(f.to);
    end.setHours(23, 59, 59, 999);
    where.push(lte(offers.createdAt, end));
  }
  if (f.q?.trim()) {
    const term = `%${f.q.trim().slice(0, 200)}%`;
    where.push(or(
      ilike(applications.firstName, term),
      ilike(applications.lastName, term),
      ilike(applications.email, term),
      ilike(jobs.title, term),
    )!);
  }

  const clause = and(...where);
  const [rows, [{ n: total } = { n: 0 }]] = await Promise.all([
    db.select({ offer: offers, version: offerVersions, application: applications, jobTitle: jobs.title, creatorName: admins.name })
      .from(offers)
      .innerJoin(applications, eq(offers.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(offerVersions, eq(offers.currentVersionId, offerVersions.id))
      .leftJoin(admins, eq(offers.createdBy, admins.id))
      .where(clause)
      .orderBy(desc(offers.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)::int` }).from(offers)
      .innerJoin(applications, eq(offers.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(clause),
  ]);

  return { rows, total, page, pageSize };
}

/** Whether editing an offer would reset its approval — used by callers that
 * only need the count, not the rows (dashboard metrics, reminders). */
export async function offerDashboardMetrics() {
  const admin = await requireAdmin();
  const [row] = await db
    .select({
      pendingApproval: sql<number>`count(*) filter (where ${offers.status} = 'PENDING_APPROVAL')::int`,
      sent: sql<number>`count(*) filter (where ${offers.status} = 'SENT')::int`,
      awaitingResponse: sql<number>`count(*) filter (where ${offers.status} in ('SENT','VIEWED'))::int`,
      accepted: sql<number>`count(*) filter (where ${offers.status} = 'ACCEPTED')::int`,
      declined: sql<number>`count(*) filter (where ${offers.status} = 'DECLINED')::int`,
    })
    .from(offers)
    .innerJoin(applications, eq(offers.applicationId, applications.id))
    .where(candidateScope(admin));
  return row ?? { pendingApproval: 0, sent: 0, awaitingResponse: 0, accepted: 0, declined: 0 };
}

/** Offers whose current version expires within `days`, still awaiting a
 * candidate response. Used to surface an in-app reminder to recruiting
 * staff — never emailed to candidates. Uses typed date operators throughout,
 * never a raw sql`` template with a bare Date. */
export async function offersExpiringSoon(days = 3) {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86_400_000);
  return db
    .select({ offer: offers, version: offerVersions, application: applications, jobTitle: jobs.title })
    .from(offers)
    .innerJoin(offerVersions, eq(offers.currentVersionId, offerVersions.id))
    .innerJoin(applications, eq(offers.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(and(
      notInArray(offers.status, ["ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"]),
      or(eq(offers.status, "SENT"), eq(offers.status, "VIEWED")),
      gte(offerVersions.expirationDate, now),
      lte(offerVersions.expirationDate, horizon),
    ));
}

/** Flips any overdue SENT/VIEWED offer to EXPIRED. No cron exists in this
 * codebase; call opportunistically from pages that load offers. */
export async function sweepExpiredOffers() {
  const now = new Date();
  const overdue = await db
    .select({ id: offers.id, applicationId: offers.applicationId })
    .from(offers)
    .innerJoin(offerVersions, eq(offers.currentVersionId, offerVersions.id))
    .where(and(
      or(eq(offers.status, "SENT"), eq(offers.status, "VIEWED")),
      lte(offerVersions.expirationDate, now),
    ));
  if (!overdue.length) return;
  const { auditLogs } = await import("@/db/schema");
  await db.transaction(async tx => {
    for (const row of overdue) {
      await tx.update(offers).set({ status: "EXPIRED" }).where(eq(offers.id, row.id));
      await tx.insert(auditLogs).values({ action: "OFFER_EXPIRED", entityType: "offer", entityId: row.id, metadata: { applicationId: row.applicationId } });
    }
  });
}
