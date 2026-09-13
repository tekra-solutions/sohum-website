/**
 * Promotion lifecycle rules.
 *
 * The database guarantees (one active promotion per employee, one signature
 * per promotion, one history row per promotion) are covered by the integration
 * suite; these are the pure decisions those guarantees rest on.
 */
import { describe, expect, it } from "vitest";
import {
  promotionStatuses, isTerminalPromotionStatus, canEditPromotion,
  promotionEditConsequence, canSubmitForApproval, canApprove, canSend,
  canWithdraw, canEmployeeAct, isDueToApply, promotionReferenceFor,
  describeChanges, type PromotionStatus,
} from "@/lib/promotions/policy";

const base = {
  previousJobTitle: "Backend Java Developer", jobTitle: "Backend Java Developer",
  previousDepartment: "Engineering", department: "Engineering",
  previousLocation: "Overland Park, KS", location: "Overland Park, KS",
  previousManagerName: "Dana Whitfield", managerName: "Dana Whitfield",
  previousAnnualSalaryCents: 12000000, annualSalaryCents: 12000000,
  previousHourlyRateCents: null, hourlyRateCents: null,
};

describe("promotion lifecycle", () => {
  it("only lets an employee act on a letter that was actually sent", () => {
    for (const status of promotionStatuses) {
      expect(canEmployeeAct(status), status).toBe(status === "SENT" || status === "VIEWED");
    }
  });

  it("treats a signed promotion as closed to editing", () => {
    // The employee signed that exact document; changing it means withdrawing
    // and issuing a new one, not editing under them.
    expect(canEditPromotion("ACCEPTED")).toBe(false);
    expect(isTerminalPromotionStatus("ACCEPTED")).toBe(true);
    expect(canEditPromotion("DRAFT")).toBe(true);
    expect(canEditPromotion("SENT")).toBe(true);
  });

  it("kills a distributed link when a sent letter is edited", () => {
    expect(promotionEditConsequence("SENT")).toEqual({ nextStatus: "DRAFT", rotateToken: true });
    expect(promotionEditConsequence("VIEWED")).toEqual({ nextStatus: "DRAFT", rotateToken: true });
    // An approval given before the edit no longer applies.
    expect(promotionEditConsequence("APPROVED")).toEqual({ nextStatus: "DRAFT", rotateToken: false });
    expect(promotionEditConsequence("DRAFT")).toEqual({ nextStatus: "DRAFT", rotateToken: false });
  });

  it("gates each workflow step on exactly one status", () => {
    for (const status of promotionStatuses) {
      expect(canSubmitForApproval(status), status).toBe(status === "DRAFT");
      expect(canApprove(status), status).toBe(status === "PENDING_APPROVAL");
      expect(canSend(status), status).toBe(status === "APPROVED");
    }
  });

  it("allows withdrawal until the change has been applied", () => {
    // Including after signing: a signed promotion that has not taken effect
    // can still be called off.
    expect(canWithdraw("ACCEPTED")).toBe(true);
    expect(canWithdraw("SENT")).toBe(true);
    // Not after: the employee record has already moved, so the correction is
    // a new promotion rather than an undo.
    expect(canWithdraw("EFFECTIVE")).toBe(false);
    expect(canWithdraw("DECLINED")).toBe(false);
  });
});

describe("effective dating", () => {
  const future = new Date("2030-01-01T00:00:00Z");
  const past = new Date("2020-01-01T00:00:00Z");

  it("does not apply a future-dated promotion just because it was signed", () => {
    // This is the rule that stops signing from mutating the employee record.
    expect(isDueToApply("ACCEPTED", future, new Date("2026-01-01T00:00:00Z"))).toBe(false);
  });

  it("applies an accepted promotion once its date arrives", () => {
    expect(isDueToApply("ACCEPTED", past, new Date("2026-01-01T00:00:00Z"))).toBe(true);
    // The boundary itself counts as due.
    expect(isDueToApply("ACCEPTED", past, past)).toBe(true);
  });

  it("never applies a promotion that was not accepted", () => {
    for (const status of promotionStatuses) {
      if (status === "ACCEPTED") continue;
      expect(isDueToApply(status as PromotionStatus, past), status).toBe(false);
    }
  });
});

describe("change detection", () => {
  it("refuses a promotion where nothing moved", () => {
    expect(describeChanges(base)).toEqual([]);
  });

  it("detects a title-only change", () => {
    expect(describeChanges({ ...base, jobTitle: "Senior Backend Java Developer" }))
      .toEqual(["title"]);
  });

  it("detects a compensation-only change", () => {
    expect(describeChanges({ ...base, annualSalaryCents: 13500000 })).toEqual(["salary"]);
  });

  it("detects department and manager moves", () => {
    expect(describeChanges({ ...base, department: "Platform", managerName: "Helena Vogt" }))
      .toEqual(["department", "manager"]);
  });

  it("detects a title and salary promotion together", () => {
    expect(describeChanges({
      ...base, jobTitle: "Senior Backend Java Developer", annualSalaryCents: 13500000,
    })).toEqual(["title", "salary"]);
  });
});

describe("promotion reference", () => {
  it("is stable, versioned and distinct from an offer reference", () => {
    const promotion = { id: "9f2c41ab-77d3-4e58-86c1-b4a2f9e8d70c", createdAt: new Date("2026-03-04T00:00:00Z") };
    expect(promotionReferenceFor(promotion)).toBe("PROM-2026-9F2C41AB");
    expect(promotionReferenceFor(promotion, { versionNumber: 2 })).toBe("PROM-2026-9F2C41AB-V2");
  });
});
