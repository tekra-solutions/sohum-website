import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { offers, offerVersions, auditLogs } from "@/db/schema";
import { resolveOfferToken as resolveToken } from "@/lib/offers/data";
import { hasVerifiedOfferSession } from "@/lib/offers/candidate-session";
import { canCandidateAct, offerDeadline, offerReferenceFor, ESIGN_CONSENT_TEXT } from "@/lib/offers/policy";
import { formatCurrency, shortDate } from "@/lib/format";
import { OtpForm } from "@/components/offer/OtpForm";
import { AcceptForm } from "@/components/offer/AcceptForm";
import { DeclineForm } from "@/components/offer/DeclineForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your offer" };

export default async function CandidateOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await resolveToken(token);
  // Identical copy regardless of why the link doesn't resolve — not-found,
  // withdrawn, and expired are all indistinguishable to the caller so a
  // guess reveals nothing about which case it is.
  if (!row) notFound();

  // The link resolved: record that it was opened, before any verification.
  // Written once per offer — a refresh or a second visit is not a new event,
  // and repeating it would flood the audit trail.
  {
    const [seen] = await db.select({ id: auditLogs.id }).from(auditLogs)
      .where(and(eq(auditLogs.entityType, "offer"), eq(auditLogs.entityId, row.offer.id), eq(auditLogs.action, "OFFER_LINK_OPENED")))
      .limit(1);
    if (!seen) {
      await db.insert(auditLogs).values({
        adminId: null, action: "OFFER_LINK_OPENED", entityType: "offer", entityId: row.offer.id,
        metadata: { applicationId: row.application.id, actor: "candidate" },
      });
    }
  }

  const verified = await hasVerifiedOfferSession(row.offer.id, row.offer.secureTokenHash);
  if (!verified) return <OtpForm token={token} />;

  // First authenticated view of a SENT offer becomes VIEWED, and it's
  // recorded — this is a real, one-time transition, done here rather than
  // in a server action so it fires exactly once per genuine page load.
  if (row.offer.status === "SENT") {
    await db.transaction(async tx => {
      const changed = await tx.update(offers).set({ status: "VIEWED", viewedAt: new Date(), updatedAt: new Date() }).where(and(eq(offers.id, row.offer.id), eq(offers.status, "SENT"), eq(offers.secureTokenHash, row.offer.secureTokenHash))).returning({ id: offers.id });
      if (changed.length) await tx.insert(auditLogs).values({ action: "OFFER_VIEWED", entityType: "offer", entityId: row.offer.id, metadata: { applicationId: row.application.id, actor: "candidate" } });
    });
  }

  if (!row.offer.currentVersionId) notFound();
  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, row.offer.currentVersionId));
  if (!version) notFound();

  const expired = offerDeadline(version.expirationDate) <= new Date();
  const actionable = !expired && !row.application.archivedAt && row.application.status === "OFFER" && canCandidateAct(row.offer.status as "SENT" | "VIEWED");
  const accepted = row.offer.status === "ACCEPTED";
  const declined = row.offer.status === "DECLINED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.25rem] font-medium text-ink-900">
          Your offer: {version.jobTitle}
        </h1>
        <p className="mt-1 text-[0.8125rem] text-graphite-600">
          {row.application.firstName}, we&rsquo;re pleased to share the details of your offer below.
        </p>
      </div>

      <div className="rounded-[4px] border border-paper-300 bg-white p-5">
        <dl className="space-y-2.5">
          {[
            ["Position", version.jobTitle],
            ["Department", version.department],
            ["Location", version.location],
            version.annualSalaryCents != null ? ["Annual salary", formatCurrency(version.annualSalaryCents)] : null,
            version.hourlyRateCents != null ? ["Hourly rate", `${formatCurrency(version.hourlyRateCents)}/hr`] : null,
            ["Start date", version.startDate.toLocaleDateString("en-US", { timeZone: "UTC" })],
            ["Offer expires", version.expirationDate.toLocaleDateString("en-US", { timeZone: "UTC" })],
          ].filter((row): row is [string, string] => row !== null).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-paper-200 pb-2 last:border-0">
              <dt className="text-[0.6875rem] text-graphite-500">{k}</dt>
              <dd className="text-[0.8125rem] font-medium text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
        <a
          href={`/offer/${token}/pdf`}
          target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-ink-900 underline underline-offset-4"
        >
          View full offer letter (PDF)
        </a>
      </div>

      {accepted && (
        <div className="rounded-[4px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-5">
          <p className="text-[0.8125rem] font-medium text-[#14603b]">You accepted this offer on {shortDate(row.offer.acceptedAt!)}.</p>
        </div>
      )}
      {declined && (
        <div className="rounded-[4px] border border-paper-300 bg-paper-50 p-5">
          <p className="text-[0.8125rem] text-graphite-700">You declined this offer.</p>
        </div>
      )}

      {expired && !accepted && !declined && <p role="status" className="text-sm text-graphite-700">This offer has expired. Contact your recruiter for next steps.</p>}
      {actionable && (
        <>
          <AcceptForm
            token={token}
            consentText={ESIGN_CONSENT_TEXT}
            summary={{
              jobTitle: version.jobTitle,
              startDate: version.startDate.toLocaleDateString("en-US", { timeZone: "UTC" }),
              compensation:
                version.annualSalaryCents != null
                  ? `${formatCurrency(version.annualSalaryCents)} annually`
                  : version.hourlyRateCents != null
                    ? `${formatCurrency(version.hourlyRateCents)}/hr`
                    : null,
              versionLabel: offerReferenceFor(row.offer, version),
            }}
          />
          <DeclineForm token={token} />
        </>
      )}
    </div>
  );
}
