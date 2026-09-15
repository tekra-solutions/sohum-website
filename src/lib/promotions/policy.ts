/**
 * Pure promotion status-transition rules.
 *
 * Deliberately parallel to offers/policy.ts: a promotion is the same kind of
 * document (draft, approve, send, sign) and its rules should not surprise
 * anyone who knows the offer flow. The one real difference is the tail —
 * an accepted offer is finished, whereas an accepted promotion still has to
 * reach its effective date before it changes anything.
 *
 * DB-free and unit-testable; the server actions call these rather than
 * re-deriving the rules inline.
 */
import { offerDeadline, ESIGN_CONSENT_TEXT } from "@/lib/offers/policy";

export const promotionStatuses = [
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "VIEWED",
  "ACCEPTED", "DECLINED", "WITHDRAWN", "EXPIRED", "EFFECTIVE",
] as const;

export type PromotionStatus = (typeof promotionStatuses)[number];

/**
 * Statuses from which the promotion can no longer be changed.
 *
 * ACCEPTED is terminal for *editing* even though the promotion is not yet
 * applied: the employee has signed that exact document, so its terms are
 * fixed. Changing them means withdrawing and issuing a new promotion.
 */
const terminal: readonly PromotionStatus[] = [
  "ACCEPTED", "DECLINED", "WITHDRAWN", "EXPIRED", "EFFECTIVE",
];

export function isTerminalPromotionStatus(status: PromotionStatus) {
  return terminal.includes(status);
}

export function canEditPromotion(status: PromotionStatus) {
  return !isTerminalPromotionStatus(status);
}

/** What an edit does to the promotion row. Editing always inserts a new
 *  version; this describes only the side effects on the parent row. */
export function promotionEditConsequence(status: PromotionStatus): { nextStatus: PromotionStatus; rotateToken: boolean } {
  if (status === "DRAFT") return { nextStatus: "DRAFT", rotateToken: false };
  // Any edit past DRAFT invalidates the approval that was given, and once the
  // letter has been sent the distributed link must die with it.
  return { nextStatus: "DRAFT", rotateToken: status === "SENT" || status === "VIEWED" };
}

export function canSubmitForApproval(status: PromotionStatus) {
  return status === "DRAFT";
}

export function canApprove(status: PromotionStatus) {
  return status === "PENDING_APPROVAL";
}

export function canSend(status: PromotionStatus) {
  return status === "APPROVED";
}

/**
 * Withdrawal is allowed right up to the moment the change is applied —
 * including after the employee has signed, since a signed promotion that has
 * not yet taken effect can still be called off. It is not allowed once
 * EFFECTIVE: at that point the employee record has already changed and the
 * correction is a new promotion, not an undo.
 */
export function canWithdraw(status: PromotionStatus) {
  return status !== "EFFECTIVE" && status !== "DECLINED"
    && status !== "WITHDRAWN" && status !== "EXPIRED";
}

/** The employee may view and sign only once the letter has actually been sent. */
export function canEmployeeAct(status: PromotionStatus) {
  return status === "SENT" || status === "VIEWED";
}

/**
 * Whether an accepted promotion is due to be applied to the employee record.
 *
 * Signing does not change anything by itself — a promotion dated 1 October
 * signed in August stays ACCEPTED until October. This is the single predicate
 * that decides when the employee row is allowed to move.
 */
export function isDueToApply(
  status: PromotionStatus,
  effectiveDate: Date,
  now: Date = new Date(),
) {
  return status === "ACCEPTED" && effectiveDate.getTime() <= now.getTime();
}

/** Expiration is a calendar date; the whole displayed UTC date is valid. */
export const promotionDeadline = offerDeadline;

/** The same consent the offer flow captures — one wording for both documents. */
export { ESIGN_CONSENT_TEXT };

/**
 * Human-readable reference printed on the document and its footer. Same shape
 * as offerReferenceFor(), with its own prefix so the two are never confused.
 */
export function promotionReferenceFor(
  promotion: { id: string; createdAt: Date | null },
  version?: { versionNumber: number } | null,
) {
  const year = (promotion.createdAt ?? new Date()).getUTCFullYear();
  const short = promotion.id.split("-")[0]?.toUpperCase() ?? "";
  const base = `PROM-${year}-${short}`;
  return version ? `${base}-V${version.versionNumber}` : base;
}

/** Which fields a promotion actually changes. A promotion must change at
 *  least one, or it is a letter that says nothing. */
export function describeChanges(v: {
  previousJobTitle: string; jobTitle: string;
  previousDepartment: string; department: string;
  previousEmploymentType?: string; employmentType?: string;
  previousLocation?: string | null; location?: string | null;
  previousManagerName?: string | null; managerName?: string | null;
  previousAnnualSalaryCents?: number | null; annualSalaryCents?: number | null;
  previousHourlyRateCents?: number | null; hourlyRateCents?: number | null;
}) {
  const changed: string[] = [];
  if (v.previousEmploymentType !== v.employmentType) changed.push("employment type");
  if (v.jobTitle !== v.previousJobTitle) changed.push("title");
  if (v.department !== v.previousDepartment) changed.push("department");
  if ((v.location ?? "") !== (v.previousLocation ?? "")) changed.push("location");
  if ((v.managerName ?? "") !== (v.previousManagerName ?? "")) changed.push("manager");
  if ((v.annualSalaryCents ?? null) !== (v.previousAnnualSalaryCents ?? null)) changed.push("salary");
  if ((v.hourlyRateCents ?? null) !== (v.previousHourlyRateCents ?? null)) changed.push("hourly rate");
  return changed;
}
