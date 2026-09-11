/**
 * Pure offer status-transition rules. Kept DB-free and unit-testable, the
 * same way ats/policy.ts keeps permits()/validateTemplate() free of the
 * database — the server actions in offers/actions.ts call these, they don't
 * re-derive the rules inline.
 */
import type { Offer } from "@/db/schema";

export const offerStatuses = [
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "VIEWED",
  "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN",
] as const;

export type OfferStatus = (typeof offerStatuses)[number];

/** Statuses from which the offer can no longer be changed at all. */
const terminal: readonly OfferStatus[] = ["ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"];

export function isTerminalOfferStatus(status: OfferStatus) {
  return terminal.includes(status);
}

/** Any non-terminal offer can be edited; the consequence differs by status
 * (see offerEditConsequence) but editing itself is never blocked short of a
 * terminal state. */
export function canEditOffer(status: OfferStatus) {
  return !isTerminalOfferStatus(status);
}

/** What an edit does to the offer's status/token, depending on where it
 * started. Editing always creates a new version (never mutates one in
 * place); this only describes the side effects on the offer row itself. */
export function offerEditConsequence(status: OfferStatus): { nextStatus: OfferStatus; rotateToken: boolean } {
  if (status === "DRAFT") return { nextStatus: "DRAFT", rotateToken: false };
  // PENDING_APPROVAL, APPROVED: an edit invalidates whatever approval intent
  // existed and must be resubmitted — this is the literal versioning trigger.
  // SENT, VIEWED: same, plus the previously distributed link must die.
  return { nextStatus: "DRAFT", rotateToken: status === "SENT" || status === "VIEWED" };
}

export function canSubmitForApproval(status: OfferStatus) {
  return status === "DRAFT";
}

export function canApprove(status: OfferStatus) {
  return status === "PENDING_APPROVAL";
}

export function canRejectOrRequestChanges(status: OfferStatus) {
  return status === "PENDING_APPROVAL";
}

export function canSend(status: OfferStatus) {
  return status === "APPROVED";
}

export function canWithdraw(status: OfferStatus) {
  return !isTerminalOfferStatus(status);
}

/** A candidate may view/act on an offer only once it has actually been sent. */
export function canCandidateAct(status: OfferStatus) {
  return status === "SENT" || status === "VIEWED";
}

export function offerHasActiveLifecycle(status: Offer["status"]) {
  return !isTerminalOfferStatus(status as OfferStatus);
}
