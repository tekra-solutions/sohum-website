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
    // A required variable with no value is still a hard error.
    expect(() => renderOfferTemplate("{{job_title}}", {})).toThrow();
    // Optional ones render as nothing instead: an hourly offer has no salary,
    // and prose that depends on one belongs inside a conditional block.
    expect(renderOfferTemplate("{{salary}}", {})).toBe("");
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

describe("offer security regressions", () => {
  it("escapes candidate variables and removes executable markup and external resources", () => {
    const html = renderOfferTemplate('<p>{{candidate_name}}</p><script>alert(1)</script><img src="http://169.254.169.254/latest/meta-data"><iframe src="file:///etc/passwd"></iframe><svg onload="alert(1)"></svg>', { candidate_name: '<img src=x onerror=alert(1)>' });
    expect(html).toContain("&lt;img");
    expect(html).not.toMatch(/<script|<img|<iframe|<svg|169\.254/);
  });
  it("treats the expiration date as the entire displayed UTC day", async () => {
    const { offerDeadline } = await import("@/lib/offers/policy");
    expect(offerDeadline(new Date("2026-10-20T00:00:00Z")).toISOString()).toBe("2026-10-20T23:59:59.999Z");
  });
  it("accepts empty optional form fields without inserting zero compensation", async () => {
    const { offerVersionInputSchema, declineSchema } = await import("@/lib/offers/validation");
    const values = offerVersionInputSchema.parse({ templateId: "", jobTitle: "Engineer", department: "Engineering",
      location: "Kansas City", employmentType: "FULL_TIME", remoteType: "HYBRID",
      startDate: "2099-11-01", expirationDate: "2099-10-01", annualSalaryCents: "165000", hourlyRateCents: "", bonusCents: "" });
    expect(values.annualSalaryCents).toBe(16500000);
    expect(values.hourlyRateCents).toBeUndefined();
    expect(values.bonusCents).toBeUndefined();
    expect(values.templateId).toBeUndefined();
    expect(declineSchema.safeParse({ reason: "", note: "" }).success).toBe(true);
    expect(offerVersionInputSchema.safeParse({ ...values, annualSalaryCents: "21474836.48" }).success).toBe(false);
  });
});

describe("electronic signature", () => {
  const consentText = "I consent to use an electronic signature.";
  const signedAt = new Date("2026-09-11T15:42:00Z");
  const version = {
    id: "11111111-1111-4111-8111-111111111111",
    offerId: "22222222-2222-4222-8222-222222222222",
    versionNumber: 2, jobTitle: "Principal Quality Engineer", department: "Engineering",
    location: "Kansas City, MO", employmentType: "FULL_TIME" as const, remoteType: "HYBRID" as const,
    hiringManagerName: "Alex Rivera", reportsTo: "Alex Rivera, VP Engineering",
    startDate: new Date("2026-10-05T00:00:00Z"), expirationDate: new Date("2026-09-25T00:00:00Z"),
    annualSalaryCents: 14500000, hourlyRateCents: null, bonusCents: null, signOnBonusCents: 500000,
    otherCompensation: null, benefitsSummary: "Medical, dental and vision.", ptoSummary: "20 days.",
    workLocation: "Overland Park, KS", additionalTerms: null,
    templateBodyHtml: "<p>We are pleased to offer you this position.</p>",
    templateTermsHtml: "<h3>Benefits</h3><p>Per the employee handbook.</p>",
    templateAcknowledgementsHtml: "<p>You acknowledge you have read these terms.</p>",
    renderedHtml: "", pdfStoragePath: null,
    createdBy: "33333333-3333-4333-8333-333333333333", createdAt: new Date("2026-09-01T00:00:00Z"),
  };
  const input = (overrides: Record<string, unknown> = {}) => ({
    version, candidateName: "Ada Lovelace", candidateEmail: "ada@example.com",
    candidateAddress: "120 Analytical Way", offerReference: "OFFER-2026-2222-V2",
    signature: {
      candidateLegalName: "Ada Lovelace", candidateEmail: "ada@example.com",
      signatureValue: "Ada Lovelace", signedAt, consentedAt: signedAt, consentText,
      verificationMethod: "EMAIL_OTP", offerVersionNumber: 2, offerId: version.offerId,
      documentHash: null,
    },
    ...overrides,
  });

  it("renders the signature, consent and acceptance record into the signed document", async () => {
    const { renderSignedOfferHtml } = await import("@/lib/offers/signed-document");
    const html = renderSignedOfferHtml(input() as never);
    expect(html).toContain("Electronic acceptance record");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain(consentText);
    expect(html).toContain("One-time code sent to the candidate&#39;s email on file");
    // The document must never carry a token or session value.
    expect(html).not.toMatch(/secureToken|tokenHash|sohum_offer_session/);
  });

  it("derives a content hash that is reproducible and changes when terms change", async () => {
    const { renderSignedOfferHtml, hashDocument } = await import("@/lib/offers/signed-document");
    const hash = (i: unknown) => hashDocument(Buffer.from(renderSignedOfferHtml(i as never), "utf8"));
    // Same frozen row + same signature => same hash, which is what makes the
    // value printed in the document verifiable after the fact.
    expect(hash(input())).toBe(hash(input()));
    // Altered compensation must not keep the signed document's hash.
    expect(hash(input({ version: { ...version, annualSalaryCents: 20000000 } }))).not.toBe(hash(input()));
  });

  it("never reuses a signed document path, so an accepted PDF cannot be overwritten", async () => {
    const { buildSignedOfferPdfPath } = await import("@/lib/offers/signed-document");
    const a = buildSignedOfferPdfPath(version.offerId, 2);
    const b = buildSignedOfferPdfPath(version.offerId, 2);
    expect(a).not.toBe(b);
    expect(a.startsWith(`offers/${version.offerId}/v2/`)).toBe(true);
  });

  it("requires consent and a signature matching the legal name", async () => {
    const { acceptSchema } = await import("@/lib/offers/validation");
    const base = { legalName: "Ada Lovelace", confirmed: "1", esignConsent: "1", signature: "Ada Lovelace" };
    expect(acceptSchema.safeParse(base).success).toBe(true);
    // Case and spacing differences are tolerated; a different name is not.
    expect(acceptSchema.safeParse({ ...base, signature: "  ada   lovelace " }).success).toBe(true);
    expect(acceptSchema.safeParse({ ...base, signature: "Someone Else" }).success).toBe(false);
    // Signing cannot proceed without explicit e-signature consent.
    expect(acceptSchema.safeParse({ ...base, esignConsent: "0" }).success).toBe(false);
    expect(acceptSchema.safeParse({ ...base, confirmed: "0" }).success).toBe(false);
  });
});

describe("automatic offer generation", () => {
  const full = {
    candidate_name: "Ada Lovelace", candidate_first_name: "Ada", candidate_email: "ada@example.com",
    candidate_address: "120 Analytical Way", job_title: "Principal Quality Engineer",
    department: "Engineering", location: "Overland Park, KS", employment_type: "full-time",
    work_arrangement: "hybrid", work_location: "Overland Park, KS", start_date: "October 5, 2026",
    salary: "$145,000", hourly_rate: "", pay_frequency: "semi-monthly", bonus: "$15,000",
    sign_on_bonus: "$5,000", other_compensation: "", benefits_summary: "Medical, dental and vision.",
    pto_summary: "20 days annually.", additional_terms: "", manager_name: "Alex Rivera",
    reports_to: "Alex Rivera, VP Engineering", company_name: "Sohum Systems",
    company_legal_name: "Sohum Systems, LLC", company_address: "9232 W 143rd Terrace",
    hr_contact_email: "hr@sohumsystems.com", authorized_rep_name: "Jordan Blake",
    authorized_rep_title: "Director of Talent", offer_date: "September 11, 2026",
    offer_expiration_date: "September 25, 2026", offer_reference: "OFFER-2026-ABCD-V1",
  };
  // The sparse case: hourly, no bonuses, no named manager, no configured extras.
  const minimal = {
    ...full, salary: "", hourly_rate: "$65", bonus: "", sign_on_bonus: "",
    benefits_summary: "", pto_summary: "", manager_name: "", reports_to: "",
    work_location: "", authorized_rep_name: "", authorized_rep_title: "", hr_contact_email: "",
  };

  it("ships a standard template that fills all three pages", async () => {
    const { defaultOfferTemplates } = await import("@/lib/offers/seed-templates");
    const standard = defaultOfferTemplates.find(t => t.name === "Sohum Systems Standard Offer");
    expect(standard).toBeDefined();
    expect(standard!.bodyHtml.length).toBeGreaterThan(500);
    expect(standard!.termsHtml.length).toBeGreaterThan(1000);
    expect(standard!.acknowledgementsHtml.length).toBeGreaterThan(300);
    // Page 2 must cover what the spec names.
    for (const topic of [/confidential/i, /polic/i, /contingen/i, /at will/i, /responsibilit/i]) {
      expect(standard!.termsHtml, String(topic)).toMatch(topic);
    }
  });

  it("renders every section with no unresolved variables, full or sparse", async () => {
    const { defaultOfferTemplates } = await import("@/lib/offers/seed-templates");
    const { renderOfferTemplate } = await import("@/lib/offers/variables");
    for (const template of defaultOfferTemplates) {
      for (const values of [full, minimal]) {
        for (const section of [template.bodyHtml, template.termsHtml, template.acknowledgementsHtml]) {
          const html = renderOfferTemplate(section, values);
          expect(html, template.name).not.toMatch(/{{|}}/);
        }
      }
    }
  });

  it("drops optional sections entirely rather than leaving empty prose", async () => {
    const { defaultOfferTemplates } = await import("@/lib/offers/seed-templates");
    const { renderOfferTemplate } = await import("@/lib/offers/variables");
    const standard = defaultOfferTemplates.find(t => t.name === "Sohum Systems Standard Offer")!;

    const withBonus = renderOfferTemplate(standard.bodyHtml, full);
    expect(withBonus).toContain("sign-on bonus");
    expect(withBonus).toContain("$5,000");

    const without = renderOfferTemplate(standard.bodyHtml, minimal);
    // No orphaned sentence, and no dangling currency symbol.
    expect(without).not.toContain("sign-on bonus");
    expect(without).not.toContain("performance bonus");
    // The hourly branch replaces the salary branch rather than both appearing.
    expect(without).toContain("hourly rate");
    expect(without).not.toContain("annual base salary");
  });

  it("requires exactly one compensation figure", async () => {
    const { offerVersionInputSchema } = await import("@/lib/offers/validation");
    const base = {
      jobTitle: "Engineer", department: "Engineering", location: "KC",
      employmentType: "FULL_TIME", remoteType: "HYBRID",
      startDate: "2099-11-01", expirationDate: "2099-10-01",
    };
    expect(offerVersionInputSchema.safeParse({ ...base, annualSalaryCents: "145000" }).success).toBe(true);
    expect(offerVersionInputSchema.safeParse({ ...base, hourlyRateCents: "65" }).success).toBe(true);
    // An offer with no pay figure would render an empty compensation section.
    expect(offerVersionInputSchema.safeParse(base).success).toBe(false);
    // Both at once is contradictory.
    expect(offerVersionInputSchema.safeParse({ ...base, annualSalaryCents: "145000", hourlyRateCents: "65" }).success).toBe(false);
  });

  it("always states position and compensation as structured summaries", async () => {
    const { renderOfferHtml } = await import("@/lib/offers/render-html");
    const common = {
      candidateName: "Ada Lovelace", candidateEmail: "ada@example.com",
      jobTitle: "Principal Quality Engineer", department: "Engineering", location: "KC",
      employmentType: "FULL_TIME" as const, remoteType: "HYBRID" as const,
      startDate: new Date("2026-10-05"), expirationDate: new Date("2026-09-25"),
      annualSalaryCents: 14500000,
    };
    // The summaries used to be suppressed whenever the prose happened to
    // mention the role or the salary — which the standard template always
    // does, so in practice every offer lost them and facts like department,
    // employment type and start date appeared nowhere as structured data.
    const rich = renderOfferHtml({ ...common, templateBodyHtml: "<p>the position of Engineer</p><p>Your annual base salary will be $145,000.</p>" });
    const sparse = renderOfferHtml({ ...common, templateBodyHtml: "<p>We are pleased to write to you.</p>" });
    for (const html of [rich, sparse]) {
      expect(html).toContain("Position summary");
      expect(html).toContain("Compensation summary");
      // The facts a candidate scans for, regardless of how the prose reads.
      expect(html).toContain("Engineering");
      expect(html).toContain("Principal Quality Engineer");
      expect(html).toContain("$145,000");
    }
  });

  it("never opens an issued offer with the template review warning", async () => {
    const { defaultOfferTemplates } = await import("@/lib/offers/seed-templates");
    // The warning belongs to the template in the admin editor, not to the
    // letter a candidate receives: it used to be the first line of every
    // bodyHtml, so every offer opened with "Sample content" above "Dear ...".
    for (const template of defaultOfferTemplates) {
      expect(template.bodyHtml).not.toContain("Sample content");
      expect(template.bodyHtml).not.toContain("⚠");
    }
  });

  it("brands every document with the Sohum Systems mark", async () => {
    const { renderOfferHtml } = await import("@/lib/offers/render-html");
    const html = renderOfferHtml({
      candidateName: "Ada Lovelace", candidateEmail: "ada@example.com",
      jobTitle: "Engineer", department: "Engineering", location: "KC",
      employmentType: "FULL_TIME", remoteType: "HYBRID",
      startDate: new Date("2026-10-05"), expirationDate: new Date("2026-09-25"),
      annualSalaryCents: 14500000, templateBodyHtml: "<p>Hello.</p>",
    });
    // The logo plumbing existed but no caller ever supplied a URI, so issued
    // documents went out unbranded. The header now defaults to the mark.
    expect(html).toContain('class="doc-logo"');
    expect(html).toContain("data:image/svg+xml");
    expect(html).toContain("SOHUM");
  });
});
