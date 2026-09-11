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

/** Expiration is a calendar date; the entire displayed UTC date is valid. */
export function offerDeadline(date: Date): Date {
  const deadline = new Date(date);
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline;
}

/**
 * The consent a candidate affirms before signing electronically. Stored
 * verbatim with each signature so the record shows exactly what was agreed
 * to even if this wording is later revised.
 *
 * This is configurable company/legal language, not a legal guarantee: that
 * the system supports electronic signatures does not by itself make a given
 * offer process compliant. Company counsel should review this text and the
 * offer templates before use.
 */
export const ESIGN_CONSENT_TEXT =
  "I consent to use an electronic signature and acknowledge that my electronic signature is intended to have the same effect as my handwritten signature.";

/**
 * Human-readable reference printed on the document and in its page footer.
 *
 * Derived from data the offer already has rather than a new sequence column:
 * the creation year plus the first segment of the offer's UUID, which is
 * unique in practice and stable for the life of the offer. It identifies a
 * document in correspondence; it is not a secret and carries no token.
 */
export function offerReferenceFor(
  offer: { id: string; createdAt: Date | null },
  version?: { versionNumber: number } | null,
) {
  const year = (offer.createdAt ?? new Date()).getUTCFullYear();
  const short = offer.id.split("-")[0]?.toUpperCase() ?? "";
  const base = `OFFER-${year}-${short}`;
  return version ? `${base}-V${version.versionNumber}` : base;
}
