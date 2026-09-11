import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { offerVersions, auditLogs, admins, offerTemplates } from "@/db/schema";
import { requireOffer } from "@/lib/offers/access";
import { permits } from "@/lib/ats/policy";
import { canApprove, canEditOffer, canSend, canSubmitForApproval, canWithdraw, type OfferStatus } from "@/lib/offers/policy";
import { approveOfferAction, rejectOfferAction, requestOfferChangesAction, sendOfferAction, submitOfferForApprovalAction, withdrawOfferAction } from "@/lib/offers/actions";
import { AdminHeader, StatusPill } from "@/components/admin/ui";
import { WorkflowForm, WorkflowField } from "@/components/admin/WorkflowForm";
import { t, btnSecondary } from "@/components/admin/form";
import { offerStatusLabel, formatCurrency, formatDateTime, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offer" };

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin, offer, application } = await requireOffer(id, "offers");

  const [version, activity, templates] = await Promise.all([
    offer.currentVersionId
      ? db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId)).then(r => r[0])
      : undefined,
    db.select({ event: auditLogs, author: admins.name })
      .from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id))
      .where(and(eq(auditLogs.entityType, "offer"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt)).limit(100),
    db.select({ id: offerTemplates.id, name: offerTemplates.name }).from(offerTemplates).where(eq(offerTemplates.isActive, true)),
  ]);
  if (!version) notFound();

  const versions = await db.select().from(offerVersions).where(eq(offerVersions.offerId, id)).orderBy(desc(offerVersions.versionNumber));

  const status = offer.status as OfferStatus;
  const canManage = permits(admin.role, "manage");
  const canEdit = canEditOffer(status) && permits(admin.role, "candidates");

  return (
    <>
      <AdminHeader
        title={`${application.firstName} ${application.lastName} — Offer`}
        description={version.jobTitle}
        action={<StatusPill status={status} label={offerStatusLabel[status]} />}
      />
      <div className="space-y-5 p-5 sm:p-6 lg:p-8">
        <Link href={`/admin/applications/${application.id}`} className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Candidate profile
        </Link>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-[4px] border border-paper-300 bg-white p-5">
            <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Offer summary</h2>
            <dl className="mt-3 space-y-2.5">
              {[
                ["Candidate", `${application.firstName} ${application.lastName}`],
                ["Position", version.jobTitle],
                ["Salary", version.annualSalaryCents != null ? formatCurrency(version.annualSalaryCents) : version.hourlyRateCents != null ? `${formatCurrency(version.hourlyRateCents)}/hr` : "—"],
                ["Start date", shortDate(version.startDate)],
                ["Created by", admin.id === offer.createdBy ? "You" : "Recruiting team"],
                ["Created", formatDateTime(offer.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-paper-200 pb-2 last:border-0">
                  <dt className={`${t.hint} text-graphite-500`}>{k}</dt>
                  <dd className={`${t.body} text-ink-900`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href={`/admin/offers/${id}/preview`} className={btnSecondary} target="_blank">
                Preview offer <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
              {canEdit && (
                <Link href={`/admin/offers/${id}/edit`} className={btnSecondary}>Edit offer</Link>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-[4px] border border-paper-300 bg-white p-5">
            <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Workflow</h2>

            {canSubmitForApproval(status) && permits(admin.role, "candidates") && (
              <WorkflowForm action={submitOfferForApprovalAction} label="Submit for approval">
                <input type="hidden" name="offerId" value={id} />
              </WorkflowForm>
            )}

            {canApprove(status) && canManage && (
              <div className="space-y-3">
                <WorkflowForm action={approveOfferAction} label="Approve offer">
                  <input type="hidden" name="offerId" value={id} />
                </WorkflowForm>
                <WorkflowForm action={requestOfferChangesAction} label="Request changes">
                  <input type="hidden" name="offerId" value={id} />
                  <WorkflowField name="note" label="What needs to change?" multiline required />
                </WorkflowForm>
                <WorkflowForm action={rejectOfferAction} label="Reject">
                  <input type="hidden" name="offerId" value={id} />
                  <input type="hidden" name="note" value="Rejected." />
                </WorkflowForm>
              </div>
            )}

            {canSend(status) && permits(admin.role, "candidates") && (
              <WorkflowForm action={sendOfferAction} label="Send offer to candidate">
                <input type="hidden" name="offerId" value={id} />
                <p className={`${t.hint} text-graphite-500`}>
                  Generates the PDF and emails a secure link to {application.email}.
                </p>
              </WorkflowForm>
            )}

            {canWithdraw(status) && canManage && (
              <WorkflowForm action={withdrawOfferAction} label="Withdraw offer">
                <input type="hidden" name="offerId" value={id} />
                <p className={`${t.hint} text-graphite-500`}>Immediately invalidates the candidate&rsquo;s link.</p>
              </WorkflowForm>
            )}

            {!canSubmitForApproval(status) && !canApprove(status) && !canSend(status) && !canWithdraw(status) && (
              <p className={`${t.body} text-graphite-500`}>No workflow actions available for this offer.</p>
            )}
          </section>
        </div>

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Version history</h2>
          <ul className="mt-3 divide-y divide-paper-200">
            {versions.map(v => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className={`${t.body} text-ink-900`}>
                  Version {v.versionNumber}
                  {offer.acceptedVersionId === v.id && <span className="ml-2 text-[#1e7a4d]">· Accepted (frozen)</span>}
                </span>
                <span className={`${t.hint} text-graphite-500`}>{formatDateTime(v.createdAt)}{v.pdfStoragePath ? " · PDF generated" : ""}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Activity</h2>
          <ol className="mt-3 space-y-3">
            {activity.map(({ event: e, author }) => (
              <li key={e.id} className="border-l-2 border-paper-300 pl-3">
                <p className={`${t.body} font-medium text-ink-900`}>{e.action.replace(/^OFFER_/, "").replaceAll("_", " ").toLowerCase()}</p>
                <p className={`mt-0.5 ${t.hint} text-graphite-500`}>{author ?? "Candidate"} · {formatDateTime(e.createdAt)}</p>
              </li>
            ))}
            {!activity.length && <li className={`${t.body} text-graphite-500`}>No activity yet.</li>}
          </ol>
        </section>

        {templates.length === 0 && (
          <p className={`${t.hint} text-graphite-500`}>
            No offer letter templates exist yet. <Link href="/admin/settings/offer-templates" className="underline">Create one</Link>.
          </p>
        )}
      </div>
    </>
  );
}
