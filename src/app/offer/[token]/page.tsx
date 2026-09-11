import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offers, offerVersions, auditLogs } from "@/db/schema";
import { resolveOfferToken as resolveToken } from "@/lib/offers/data";
import { hasVerifiedOfferSession } from "@/lib/offers/candidate-session";
import { canCandidateAct } from "@/lib/offers/policy";
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

  const verified = await hasVerifiedOfferSession(row.offer.id, row.offer.secureTokenHash);
  if (!verified) return <OtpForm token={token} />;

  // First authenticated view of a SENT offer becomes VIEWED, and it's
  // recorded — this is a real, one-time transition, done here rather than
  // in a server action so it fires exactly once per genuine page load.
  if (row.offer.status === "SENT") {
    await db.update(offers).set({ status: "VIEWED", viewedAt: new Date() }).where(eq(offers.id, row.offer.id));
    await db.insert(auditLogs).values({
      adminId: null, action: "OFFER_VIEWED", entityType: "offer", entityId: row.offer.id,
      metadata: { applicationId: row.application.id, actor: "candidate" },
    });
    row.offer.status = "VIEWED";
  }

  if (!row.offer.currentVersionId) notFound();
  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, row.offer.currentVersionId));
  if (!version) notFound();

  const actionable = canCandidateAct(row.offer.status as "SENT" | "VIEWED");
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
            ["Start date", shortDate(version.startDate)],
            ["Offer expires", shortDate(version.expirationDate)],
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

      {actionable && (
        <>
          <AcceptForm token={token} />
          <DeclineForm token={token} />
        </>
      )}
    </div>
  );
}
