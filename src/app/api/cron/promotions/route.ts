import { timingSafeEqual } from "node:crypto";
import { applyDuePromotions } from "@/lib/promotions/apply";
import { audit } from "@/lib/audit";

/**
 * Scheduled job: apply accepted promotions whose effective date has arrived.
 *
 * A promotion is signed in advance and takes effect on a future date, so
 * something has to notice when that date passes. This endpoint is that
 * something. It is the same call an admin makes with the "Apply" button, so
 * the two paths cannot diverge.
 *
 * Authorisation
 * -------------
 * This route mutates employee records, so it is never open. It requires
 * CRON_SECRET as a bearer token, compared in constant time, and refuses to run
 * at all if the secret is unset — a missing secret fails closed rather than
 * leaving the endpoint public. Vercel Cron sends this header automatically
 * when CRON_SECRET is set on the project.
 *
 * The work itself is idempotent (see applyDuePromotions), so a retry, an
 * overlapping invocation or a manual curl during an incident are all safe.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!presented) return false;

  // Constant-time comparison; the length guard is required because
  // timingSafeEqual throws on a length mismatch.
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    // Deliberately identical whether the secret is unset, missing or wrong —
    // the response reveals nothing about which.
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    // adminId is null: no human took this action, and the audit row says so.
    const result = await applyDuePromotions(null);

    if (result.applied > 0 || result.failures.length > 0) {
      await audit({
        adminId: null,
        action: "PROMOTION_APPLIED",
        entityType: "cron",
        metadata: {
          job: "apply-due-promotions",
          considered: result.considered,
          applied: result.applied,
          failed: result.failures.length,
          ...(result.failures.length ? { failures: result.failures } : {}),
        },
      });
    }

    if (result.failures.length) {
      // Surface failures to monitoring; successful changes are idempotent on retry.
      console.error("[cron] promotions with unapplied changes", result.failures);
    }

    return Response.json({
      ok: result.failures.length === 0,
      ...result,
      durationMs: Date.now() - startedAt,
    }, { status: result.failures.length ? 503 : 200 });
  } catch (error) {
    // A failure before any promotion was examined — a database outage, say.
    // This one is worth a 500 so the platform records the run as failed.
    console.error("[cron] apply-due-promotions failed", error);
    return Response.json({ ok: false, error: "Job failed" }, { status: 500 });
  }
}
