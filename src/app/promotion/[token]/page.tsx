import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { promotionVersions, auditLogs } from "@/db/schema";
import { resolvePromotionToken } from "@/lib/promotions/data";
import { hasVerifiedPromotionSession } from "@/lib/promotions/employee-session";
import {
  canEmployeeAct, promotionDeadline, promotionReferenceFor, ESIGN_CONSENT_TEXT,
  type PromotionStatus,
} from "@/lib/promotions/policy";
import { formatCurrency, shortDate, calendarDate } from "@/lib/format";
import { PromotionOtpForm } from "@/components/promotion/PromotionOtpForm";
import { PromotionAcceptForm } from "@/components/promotion/PromotionAcceptForm";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your promotion letter" };

export default async function EmployeePromotionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await resolvePromotionToken(token);
  // Identical response whatever the reason the link does not resolve, so a
  // guess reveals nothing about which case it is.
  if (!row) notFound();

  // Record that the link was opened, once, before any verification.
  {
    const [seen] = await db.select({ id: auditLogs.id }).from(auditLogs)
      .where(and(
        eq(auditLogs.entityType, "promotion"),
        eq(auditLogs.entityId, row.promotion.id),
        eq(auditLogs.action, "PROMOTION_LINK_OPENED"),
      )).limit(1);
    if (!seen) {
      await db.insert(auditLogs).values({
        adminId: null, action: "PROMOTION_LINK_OPENED",
        entityType: "promotion", entityId: row.promotion.id,
        metadata: { employeeId: row.employee.id, actor: "employee" },
      });
    }
  }

  const verified = await hasVerifiedPromotionSession(row.promotion.id, row.promotion.secureTokenHash);
  if (!verified) return <PromotionOtpForm token={token} />;

  if (!row.promotion.currentVersionId) notFound();
  const [version] = await db.select().from(promotionVersions)
    .where(eq(promotionVersions.id, row.promotion.acceptedVersionId ?? row.promotion.currentVersionId));
  if (!version) notFound();

  const status = row.promotion.status as PromotionStatus;
  const expired = promotionDeadline(version.expirationDate) <= new Date();
  const actionable = !expired && canEmployeeAct(status);
  const accepted = status === "ACCEPTED" || status === "EFFECTIVE";
  const declined = status === "DECLINED";

  const compensation = version.annualSalaryCents != null
    ? `${formatCurrency(version.annualSalaryCents)} / year`
    : version.hourlyRateCents != null
      ? `${formatCurrency(version.hourlyRateCents)} / hour`
      : null;

  return (
    <div className="space-y-5">
      {accepted && (
        <div className="rounded-[4px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-4">
          <p className={`${t.body} font-medium text-[#14603b]`}>
            You signed this letter on {shortDate(row.promotion.signedAt ?? new Date())}.
          </p>
          <p className={`mt-1 ${t.hint} text-[#14603b]`}>
            {status === "EFFECTIVE"
              ? "Your record has been updated."
              : `Your new terms take effect on ${calendarDate(version.effectiveDate)}.`}
          </p>
        </div>
      )}
      {declined && (
        <div className="rounded-[4px] border border-paper-300 bg-white p-4">
          <p className={`${t.body} text-ink-900`}>You declined this promotion. Your HR team has been notified.</p>
        </div>
      )}
      {expired && !accepted && !declined && (
        <div className="rounded-[4px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.08] p-4">
          <p className={`${t.body} text-[#7a5c00]`}>
            The signing deadline for this letter has passed. Please contact your HR team.
          </p>
        </div>
      )}

      {/* The letter itself, served exactly as it was frozen. An iframe keeps
          the document's own print styling intact rather than reflowing it into
          the surrounding page. */}
      <div className="overflow-hidden rounded-[4px] border border-paper-300 bg-white">
        <iframe
          title="Your promotion letter"
          srcDoc={version.renderedHtml}
          className="h-[36rem] w-full border-0"
        />
      </div>

      {actionable && (
        <PromotionAcceptForm
          token={token}
          consentText={ESIGN_CONSENT_TEXT}
          summary={{
            jobTitle: version.jobTitle,
            effectiveDate: calendarDate(version.effectiveDate),
            compensation,
            versionLabel: promotionReferenceFor(row.promotion, version),
          }}
        />
      )}
    </div>
  );
}
