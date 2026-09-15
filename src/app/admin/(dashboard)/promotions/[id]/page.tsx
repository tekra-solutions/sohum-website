import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { auditLogs, admins } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { permits } from "@/lib/ats/policy";
import { promotionDetail } from "@/lib/promotions/data";
import {
  canApprove, canEditPromotion, canSend, canSubmitForApproval, canWithdraw,
  isDueToApply, promotionReferenceFor, describeChanges, type PromotionStatus,
} from "@/lib/promotions/policy";
import {
  approvePromotionAction, rejectPromotionAction, sendPromotionAction,
  submitPromotionForApprovalAction, withdrawPromotionAction, applyPromotionAction,
} from "@/lib/promotions/actions";
import { AdminHeader, Card, PageBody, StatusPill } from "@/components/admin/ui";
import { WorkflowForm, WorkflowField } from "@/components/admin/WorkflowForm";
import { t, btnSecondary } from "@/components/admin/form";
import {
  promotionEventLabel, promotionStatusLabel, formatCurrency, formatDateTime, calendarDate,
} from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotion" };

const money = (cents?: number | null) => (cents == null ? "—" : formatCurrency(cents));

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-paper-200 py-2 last:border-0">
      <dt className={`${t.hint} text-graphite-500`}>{label}</dt>
      <dd className={`text-right ${t.body} text-ink-900`}>{children}</dd>
    </div>
  );
}

/** One current → new line in the change summary. */
function Change({ label, from, to }: { label: string; from: string; to: string }) {
  if (from === to) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-paper-200 py-2 last:border-0">
      <span className={`${t.hint} w-28 shrink-0 text-graphite-500`}>{label}</span>
      <span className={`${t.body} text-graphite-500 line-through`}>{from}</span>
      <span aria-hidden="true" className="text-graphite-400">→</span>
      <span className={`${t.body} font-medium text-ink-900`}>{to}</span>
    </div>
  );
}

export default async function PromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("employees");
  const { id } = await params;

  const detail = await promotionDetail(id);
  if (!detail?.version) notFound();

  const { promotion, employee, version, versions, signature } = detail;
  const status = promotion.status as PromotionStatus;
  const canManage = permits(admin.role, "manage");
  const reference = promotionReferenceFor(promotion, version);
  const changes = describeChanges(version);
  const dueNow = isDueToApply(status, version.effectiveDate);

  const activity = await db
    .select({ event: auditLogs, author: admins.name })
    .from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id))
    .where(and(eq(auditLogs.entityType, "promotion"), eq(auditLogs.entityId, id)))
    .orderBy(desc(auditLogs.createdAt)).limit(100);

  const pay = (annual?: number | null, hourly?: number | null) =>
    annual != null ? money(annual) : hourly != null ? `${money(hourly)}/hr` : "—";

  return (
    <>
      <AdminHeader
        title={`${employee.firstName} ${employee.lastName} — Promotion`}
        description={`${version.jobTitle} · ${reference}`}
        action={<StatusPill status={status === "EFFECTIVE" ? "HIRED" : status} label={promotionStatusLabel[status] ?? status} />}
      />
      <PageBody>
        <Link href={`/admin/employees/${employee.id}`} className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Employee profile
        </Link>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card title="What changes" description={changes.length ? `Changing: ${changes.join(", ")}` : undefined}>
            <div>
              <Change label="Title" from={version.previousJobTitle} to={version.jobTitle} />
              <Change label="Department" from={version.previousDepartment} to={version.department} />
              <Change label="Reports to" from={version.previousManagerName ?? "—"} to={version.managerName ?? "—"} />
              <Change label="Location" from={version.previousLocation ?? "—"} to={version.location ?? "—"} />
              <Change
                label="Compensation"
                from={pay(version.previousAnnualSalaryCents, version.previousHourlyRateCents)}
                to={pay(version.annualSalaryCents, version.hourlyRateCents)}
              />
            </div>
            <dl className="mt-4 border-t border-paper-200 pt-3">
              <Row label="Effective date">{calendarDate(version.effectiveDate)}</Row>
              <Row label="Sign by">{calendarDate(version.expirationDate)}</Row>
              {version.bonusCents != null && <Row label="Bonus">{money(version.bonusCents)}</Row>}
              <Row label="Created by">{detail.creatorName ?? "—"}</Row>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/admin/promotions/${id}/preview`} target="_blank" className={btnSecondary}>
                Preview letter <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
              {canEditPromotion(status) && (
                <Link href={`/admin/promotions/${id}/edit`} className={btnSecondary}>Edit</Link>
              )}
            </div>
          </Card>

          <Card title="Workflow" description="What can happen to this promotion next">
            <div className="space-y-4">
              {canSubmitForApproval(status) && (
                <WorkflowForm action={submitPromotionForApprovalAction} label="Submit for approval">
                  <input type="hidden" name="promotionId" value={id} />
                </WorkflowForm>
              )}

              {canApprove(status) && canManage && (
                <div className="space-y-3">
                  <WorkflowForm action={approvePromotionAction} label="Approve">
                    <input type="hidden" name="promotionId" value={id} />
                  </WorkflowForm>
                  <WorkflowForm action={rejectPromotionAction} label="Request changes">
                    <input type="hidden" name="promotionId" value={id} />
                    <WorkflowField name="note" label="What needs to change?" multiline required />
                  </WorkflowForm>
                </div>
              )}

              {canSend(status) && (
                <WorkflowForm
                  action={sendPromotionAction}
                  label="Send to employee"
                  confirm={{
                    message: `This emails a secure link to ${employee.workEmail}. The employee verifies their identity, reviews the letter and signs it. Nothing on their record changes until the effective date.`,
                    confirmLabel: "Send now",
                  }}
                >
                  <input type="hidden" name="promotionId" value={id} />
                </WorkflowForm>
              )}

              {status === "ACCEPTED" && (
                <div className="rounded-[3px] border border-paper-200 bg-paper-50 p-3">
                  <p className={`${t.body} text-ink-900`}>
                    Signed by {promotion.signedLegalName} on {formatDateTime(promotion.signedAt!)}.
                  </p>
                  <p className={`mt-1 ${t.hint} text-graphite-600`}>
                    {dueNow
                      ? "The effective date has arrived. Apply it to update the employee record."
                      : `The employee record updates on ${calendarDate(version.effectiveDate)}.`}
                  </p>
                  {dueNow && (
                    <div className="mt-3">
                      <WorkflowForm action={applyPromotionAction} label="Apply to employee record">
                        <input type="hidden" name="promotionId" value={id} />
                      </WorkflowForm>
                    </div>
                  )}
                </div>
              )}

              {status === "EFFECTIVE" && (
                <p className={`${t.body} text-graphite-600`}>
                  Applied on {formatDateTime(promotion.appliedAt ?? version.effectiveDate)}. The
                  employee record and their employment history have been updated.
                </p>
              )}

              {status === "DECLINED" && (
                <p className={`${t.body} text-graphite-600`}>
                  Declined by the employee on {formatDateTime(promotion.declinedAt!)}.
                  {promotion.declineReason ? ` Reason: ${promotion.declineReason}` : ""}
                </p>
              )}

              {canWithdraw(status) && canManage && (
                <details className="border-t border-paper-200 pt-4">
                  <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Withdraw this promotion</summary>
                  <div className="mt-3">
                    <WorkflowForm
                      action={withdrawPromotionAction}
                      label="Withdraw"
                      confirm={{
                        message: "Withdrawing invalidates the employee's link and cancels the promotion. The employee record is not changed. This cannot be undone — you would create a new promotion instead.",
                        tone: "danger",
                      }}
                    >
                      <input type="hidden" name="promotionId" value={id} />
                    </WorkflowForm>
                  </div>
                </details>
              )}
            </div>
          </Card>
        </div>

        {signature && (
          <section className="rounded-[4px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.05] p-5">
            <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Electronic signature</h2>
            <dl className="mt-4 space-y-2">
              {[
                ["Signed by", signature.signerLegalName],
                ["Email", signature.signerEmail],
                ["Signed at", formatDateTime(signature.signedAt)],
                ["Consented at", formatDateTime(signature.consentedAt)],
                ["Identity verified by", signature.verificationMethod === "EMAIL_OTP" ? "One-time code emailed to the employee" : signature.verificationMethod],
                signature.documentHash ? ["Document hash (SHA-256)", signature.documentHash] : null,
              ].filter((r): r is [string, string] => r !== null).map(([k, v]) => (
                <div key={k} className="flex flex-wrap justify-between gap-2 border-b border-[#1e7a4d]/15 pb-2 last:border-0">
                  <dt className={`${t.hint} text-graphite-600`}>{k}</dt>
                  <dd className={`${t.body} break-all font-medium text-ink-900`}>{v}</dd>
                </div>
              ))}
            </dl>
            {signature ? (
              <a href={`/admin/promotions/${id}/signed`} target="_blank" rel="noopener noreferrer" className={`mt-4 ${btnSecondary}`}>
                View signed letter (PDF) <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : (
              <p className={`mt-3 ${t.hint} text-graphite-600`}>
                The signed PDF has not been stored yet. The acceptance above is still valid and the
                document can be regenerated from the accepted version.
              </p>
            )}
          </section>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card title="Version history">
            <ul className="divide-y divide-paper-200">
              {versions.map(v => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <span className={`${t.body} text-ink-900`}>
                    Version {v.versionNumber}
                    {promotion.acceptedVersionId === v.id && <span className="ml-2 text-[#1e7a4d]">· Signed (frozen)</span>}
                  </span>
                  <span className={`${t.hint} text-graphite-500`}>
                    <a href={`/admin/promotions/${id}/preview?version=${v.id}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      {formatDateTime(v.createdAt)}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Activity">
            <ol className="space-y-3">
              {activity.map(({ event: e, author }) => (
                <li key={e.id} className="border-l-2 border-paper-300 pl-3">
                  <p className={`${t.body} font-medium text-ink-900`}>
                    {promotionEventLabel[e.action] ?? e.action.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className={`mt-0.5 ${t.hint} text-graphite-500`}>
                    {author ?? "Employee"} · {formatDateTime(e.createdAt)}
                  </p>
                </li>
              ))}
              {!activity.length && <li className={`${t.body} text-graphite-500`}>No activity yet.</li>}
            </ol>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
