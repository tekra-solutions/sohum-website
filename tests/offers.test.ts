import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateOfferToken, hashOfferToken, generateOtp, hashOtp } from "@/lib/offers/tokens";
import { offerTemplateVariables, validateOfferTemplate, renderOfferTemplate } from "@/lib/offers/variables";
import {
  offerStatuses, canEditOffer, offerEditConsequence, canSubmitForApproval,
  canApprove, canRejectOrRequestChanges, canSend, canWithdraw, canCandidateAct,
} from "@/lib/offers/policy";

describe("offer tokens", () => {
  it("generates long, URL-safe, non-repeating tokens", () => {
    const a = generateOfferToken();
    const b = generateOfferToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("hashes tokens deterministically without ever reproducing the input", () => {
    const token = generateOfferToken();
    const hash1 = hashOfferToken(token);
    const hash2 = hashOfferToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toContain(token);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOfferToken(generateOfferToken())).not.toBe(hash1);
  });
  it("generates six-digit zero-padded OTP codes within range", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(0);
      expect(Number(code)).toBeLessThan(1_000_000);
    }
  });
  it("hashes OTP codes deterministically and distinctly", () => {
    expect(hashOtp("000000")).toBe(hashOtp("000000"));
    expect(hashOtp("000000")).not.toBe(hashOtp("000001"));
    expect(hashOtp("123456")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("offer template variables", () => {
  it("renders every variable in the allowlist", () => {
    const values = Object.fromEntries(offerTemplateVariables.map(v => [v, `[${v}]`]));
    const text = offerTemplateVariables.map(v => `{{${v}}}`).join(" ");
    expect(validateOfferTemplate(text)).toBe(true);
    const rendered = renderOfferTemplate(text, values);
    expect(rendered).not.toContain("{{");
    for (const v of offerTemplateVariables) expect(rendered).toContain(`[${v}]`);
  });
  it("rejects unknown or malformed variables, and refuses to render a missing value", () => {
    expect(validateOfferTemplate("{{salary_negotiated_secretly}}")).toBe(false);
    expect(validateOfferTemplate("{{job_title}")).toBe(false);
    expect(() => renderOfferTemplate("{{salary}}", {})).toThrow();
  });
  it("does not accept the email-template variable set as a substitute", () => {
    // candidate_last_name/interview_date/interview_time are ats/policy.ts
    // variables, not offer variables — the two systems must stay independent.
    expect(validateOfferTemplate("{{candidate_last_name}}")).toBe(false);
    expect(validateOfferTemplate("{{interview_date}}")).toBe(false);
  });
});

describe("offer status transitions", () => {
  it("allows editing from every non-terminal status only", () => {
    for (const status of offerStatuses) {
      const terminal = ["ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"].includes(status);
      expect(canEditOffer(status)).toBe(!terminal);
    }
  });
  it("reverts to DRAFT on edit from any editable non-draft status, rotating the token only once sent", () => {
    expect(offerEditConsequence("DRAFT")).toEqual({ nextStatus: "DRAFT", rotateToken: false });
    expect(offerEditConsequence("PENDING_APPROVAL")).toEqual({ nextStatus: "DRAFT", rotateToken: false });
    expect(offerEditConsequence("APPROVED")).toEqual({ nextStatus: "DRAFT", rotateToken: false });
    expect(offerEditConsequence("SENT")).toEqual({ nextStatus: "DRAFT", rotateToken: true });
    expect(offerEditConsequence("VIEWED")).toEqual({ nextStatus: "DRAFT", rotateToken: true });
  });
  it("gates submit/approve/reject/send to their exact single source status", () => {
    expect(canSubmitForApproval("DRAFT")).toBe(true);
    expect(canSubmitForApproval("APPROVED")).toBe(false);
    expect(canApprove("PENDING_APPROVAL")).toBe(true);
    expect(canApprove("DRAFT")).toBe(false);
    expect(canRejectOrRequestChanges("PENDING_APPROVAL")).toBe(true);
    expect(canRejectOrRequestChanges("APPROVED")).toBe(false);
    expect(canSend("APPROVED")).toBe(true);
    expect(canSend("PENDING_APPROVAL")).toBe(false);
  });
  it("allows withdrawal from any non-terminal status and candidate action only once sent", () => {
    expect(canWithdraw("DRAFT")).toBe(true);
    expect(canWithdraw("ACCEPTED")).toBe(false);
    expect(canCandidateAct("SENT")).toBe(true);
    expect(canCandidateAct("VIEWED")).toBe(true);
    expect(canCandidateAct("DRAFT")).toBe(false);
    expect(canCandidateAct("APPROVED")).toBe(false);
  });
});

describe("offer status presentation", () => {
  // Guards the exact bug class found and fixed earlier this session: a
  // status silently rendering as an unstyled grey fallback because
  // statusTones/offerStatusLabel weren't updated for a new enum value.
  const toneSource = readFileSync(new URL("../src/components/admin/ui.tsx", import.meta.url), "utf8");
  const tones = toneSource.slice(toneSource.indexOf("const statusTones"), toneSource.indexOf("export function StatusPill"));
  const formatSource = readFileSync(new URL("../src/lib/format.ts", import.meta.url), "utf8");

  it("gives every offer status a tone", () => {
    for (const status of offerStatuses) expect(tones, `tone for ${status}`).toContain(`${status}:`);
  });
  it("gives every offer status a label", () => {
    expect(formatSource).toContain("offerStatusLabel");
    const labelSection = formatSource.slice(formatSource.indexOf("offerStatusLabel"));
    for (const status of offerStatuses) expect(labelSection, `label for ${status}`).toContain(`${status}:`);
  });
});
