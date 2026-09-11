/**
 * Application stage transition rules — the single authority for what stage
 * a candidate may move to, and from where.
 *
 * Previously every write site (`candidateAction`, `bulkCandidateAction`, the
 * pipeline board's drag-and-drop, the candidate-facing offer acceptance)
 * validated only that the *target* was a member of `stages`. That accepted
 * NEW -> HIRED directly, allowed a HIRED candidate with an employee record to
 * be moved back to REJECTED, and allowed contradictory pairs such as
 * "application NEW / offer SENT". These are pure functions so the rules can
 * be unit-tested without a database and reused by both the server actions and
 * the UI, rather than living only in a component.
 */
import { stages } from "./policy";

export type Stage = (typeof stages)[number];

/**
 * Forward progression through the funnel, plus the moves recruiters
 * legitimately need: rejecting from any active stage, and stepping back a
 * stage when someone was advanced by mistake.
 *
 * HIRED is deliberately terminal here — it is reached only through the offer
 * acceptance flow or an explicit, audited override (see `canTransition`'s
 * `allowDirectHire`), never by a casual drag on the pipeline board.
 */
const forward: Record<Stage, readonly Stage[]> = {
  NEW: ["SCREENING", "SHORTLISTED", "REJECTED"],
  SCREENING: ["SHORTLISTED", "INTERVIEW", "REJECTED", "NEW"],
  SHORTLISTED: ["INTERVIEW", "OFFER", "REJECTED", "SCREENING"],
  INTERVIEW: ["OFFER", "REJECTED", "SHORTLISTED"],
  OFFER: ["HIRED", "REJECTED", "INTERVIEW"],
  HIRED: [],
  REJECTED: ["NEW", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER"],
};

export type TransitionContext = {
  /** True once an employee record exists for this application. */
  hasEmployee?: boolean;
  /**
   * Set when the move to HIRED originates from a candidate accepting their
   * offer, which is the normal path into HIRED.
   */
  viaOfferAcceptance?: boolean;
  /**
   * Permits an authorised admin to record a hire that happened outside the
   * system (an offer made verbally, a rehire). Still audited like any other
   * status change — it bypasses the offer requirement, not the audit trail.
   */
  allowDirectHire?: boolean;
};

export type TransitionResult = { ok: true } | { ok: false; reason: string };

export function canTransition(from: Stage, to: Stage, context: TransitionContext = {}): TransitionResult {
  if (from === to) return { ok: true };

  // An application that produced an employee is the end of the line. Moving
  // it would orphan the employee record, which is RESTRICT-protected in the
  // schema and would leave the two views of the same person disagreeing.
  if (context.hasEmployee) {
    return { ok: false, reason: "This candidate has been converted to an employee and can no longer change stage." };
  }

  if (to === "HIRED" && !context.viaOfferAcceptance && !context.allowDirectHire) {
    return {
      ok: false,
      reason: "A candidate becomes Hired when they accept their offer. Send an offer, or use Record hire on the candidate page if this hire happened outside the system.",
    };
  }

  if (!forward[from].includes(to) && to !== "HIRED") {
    return { ok: false, reason: `A candidate cannot move from ${label(from)} to ${label(to)}.` };
  }

  // Reaching HIRED still requires having got as far as OFFER, whichever route
  // is taken — this is what stops "application NEW / offer SENT"-style
  // contradictions and silent funnel skipping.
  if (to === "HIRED" && from !== "OFFER") {
    return { ok: false, reason: "A candidate must reach the Offer stage before being marked Hired." };
  }

  return { ok: true };
}

/** Stages a candidate may move to from here, for building a <select>. */
export function allowedTransitions(from: Stage, context: TransitionContext = {}): Stage[] {
  return stages.filter(to => to !== from && canTransition(from, to, context).ok);
}

/** True when an offer may be created for an application at this stage. */
export function canCreateOffer(stage: Stage) {
  return stage === "OFFER";
}

function label(stage: Stage) {
  return stage.charAt(0) + stage.slice(1).toLowerCase();
}
