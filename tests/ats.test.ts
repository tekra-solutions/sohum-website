import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applicationStatusLabel, jobStatusLabel } from "@/lib/format";
import { csvCell, escapeHtml, permits, positivePage, renderTemplate, stages, validateTemplate } from "@/lib/ats/policy";
import { feedbackSchema, interviewSchema, emailTemplateSchema } from "@/lib/ats/validation";
import { jobStatuses } from "@/lib/validation/schemas";
import { canTransition, allowedTransitions, canCreateOffer } from "@/lib/ats/transitions";
import { defaultEmailTemplates } from "@/lib/ats/templates";
describe("ATS authorization policy", () => {
  it("preserves admin access and restricts recruiter and manager privileges", () => {
    for (const role of ["ADMIN", "SUPER_ADMIN", "RECRUITING_ADMIN"]) expect(permits(role,"manage")).toBe(true);
    for (const role of ["RECRUITER", "HIRING_MANAGER", "anonymous", ""]) {
      for (const permission of ["manage", "employees", "reports", "settings", "audit"] as const) expect(permits(role,permission)).toBe(false);
    }
    expect(permits("HIRING_MANAGER", "feedback")).toBe(true);
    expect(permits("HIRING_MANAGER", "candidates")).toBe(false);
    expect(permits("RECRUITER", "candidates")).toBe(true);
    expect(permits("RECRUITING_ADMIN", "settings")).toBe(false);
  });
  it("exposes all seven stages", () => expect(stages).toEqual(["NEW", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]));
});
describe("email safety", () => {
  it("renders every default template with approved variables", () => {
    const values = { candidate_first_name: "Jane", candidate_last_name: "Doe", job_title: "Engineer", company_name: "Sohum Systems", interview_date: "Sep 12", interview_time: "10 AM CDT" };
    for (const template of defaultEmailTemplates) {
      expect(validateTemplate(template.subject+template.body)).toBe(true);
      expect(renderTemplate(template.body,values)).not.toContain("{{");
    }
  });
  it("rejects unknown, malformed and missing template variables", () => {
    expect(validateTemplate("{{password}}" )).toBe(false);
    expect(validateTemplate("{{candidate_first_name}")).toBe(false);
    expect(() => renderTemplate("{{interview_date}}", {})).toThrow();
    expect(emailTemplateSchema.safeParse({ name:"test",subject:"Hello\r\nBcc: attacker",body:"Message",isActive:true }).success).toBe(false);
  });
  it("escapes candidate and recruiter markup", () => expect(escapeHtml('<script>"x" & \'y\'</script>')).toBe("&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;"));
});
describe("interviews and feedback", () => {
  const valid = { type:"Technical", status:"Scheduled", startsAt:"2026-09-12T10:00:00-05:00", endsAt:"2026-09-12T11:00:00-05:00", timezone:"America/Chicago", interviewers:"Recruiter", meetingUrl:"https://meet.example.com/session" };
  it("validates timezone-aware chronological interviews", () => {
    expect(interviewSchema.safeParse(valid).success).toBe(true);
    expect(interviewSchema.safeParse({...valid, endsAt:valid.startsAt}).success).toBe(false);
    expect(interviewSchema.safeParse({...valid, startsAt:"bad"}).success).toBe(false);
    expect(interviewSchema.safeParse({...valid, timezone:"not-a-zone"}).success).toBe(false);
    expect(interviewSchema.safeParse({...valid, meetingUrl:"javascript:alert(1)"}).success).toBe(false);
  });
  it("rejects out-of-range and incomplete feedback", () => {
    const feedback = { interviewId:"11111111-1111-4111-8111-111111111111", rating:5, technical:4, communication:3, teamFit:4, recommendation:"Hire" };
    expect(feedbackSchema.safeParse(feedback).success).toBe(true);
    expect(feedbackSchema.safeParse({...feedback,rating:6}).success).toBe(false);
    expect(feedbackSchema.safeParse({...feedback,technical:0}).success).toBe(false);
  });
});
describe("export and pagination", () => {
  it("prevents spreadsheet formula injection while preserving CSV quoting", () => {
    for (const formula of ['=SUM(A1)', '+1', '-1', '@evil', ' \t=1']) expect(csvCell(formula)).toMatch(/^"'/);
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe('""');
  });
  it("bounds malformed pages", () => {
    expect(positivePage("NaN")).toBe(1); expect(positivePage(-1)).toBe(1); expect(positivePage(Infinity)).toBe(1); expect(positivePage("2")).toBe(2);
  });
});
describe("status presentation", () => {
  // These guard the drift that left approval-workflow and pipeline statuses
  // rendering as an unstyled grey fallback.
  const toneSource = readFileSync(new URL("../src/components/admin/ui.tsx", import.meta.url), "utf8");
  const tones = toneSource.slice(toneSource.indexOf("const statusTones"), toneSource.indexOf("export function StatusPill"));
  it("gives every application stage a label and a distinct tone", () => {
    for (const stage of stages) {
      expect(applicationStatusLabel[stage], `label for ${stage}`).toBeTruthy();
      expect(tones, `tone for ${stage}`).toContain(`${stage}:`);
    }
  });
  it("gives every job status a label and a tone, including the approval states", () => {
    for (const status of jobStatuses) {
      expect(jobStatusLabel[status], `label for ${status}`).toBeTruthy();
      expect(tones, `tone for ${status}`).toContain(`${status}:`);
    }
  });
  it("offers every job status in the admin jobs filter", () => {
    const page = readFileSync(new URL("../src/app/admin/(dashboard)/jobs/page.tsx", import.meta.url), "utf8");
    const filters = page.slice(page.indexOf("const statusFilters"), page.indexOf("] as const;") + 1);
    for (const status of jobStatuses) expect(filters, `filter for ${status}`).toContain(`"${status}"`);
  });
});

describe("application stage transitions", () => {
  // These guard the funnel-skipping and contradictory-state bugs: before the
  // central rules existed, every write site accepted any stage from any stage.
  it("refuses to skip the funnel into HIRED", () => {
    for (const from of ["NEW", "SCREENING", "SHORTLISTED", "INTERVIEW"] as const) {
      expect(canTransition(from, "HIRED").ok, `${from} -> HIRED`).toBe(false);
    }
    expect(canTransition("OFFER", "HIRED").ok).toBe(false);
  });
  it("allows HIRED only via offer acceptance or an explicit audited override", () => {
    expect(canTransition("OFFER", "HIRED", { viaOfferAcceptance: true }).ok).toBe(true);
    expect(canTransition("OFFER", "HIRED", { allowDirectHire: true }).ok).toBe(true);
    // Even an override cannot skip the funnel — OFFER must have been reached.
    expect(canTransition("NEW", "HIRED", { allowDirectHire: true }).ok).toBe(false);
    expect(canTransition("SCREENING", "HIRED", { viaOfferAcceptance: true }).ok).toBe(false);
  });
  it("locks an application once it has become an employee", () => {
    for (const to of stages) {
      if (to === "HIRED") continue;
      expect(canTransition("HIRED", to, { hasEmployee: true }).ok, `HIRED -> ${to}`).toBe(false);
    }
    const blocked = canTransition("HIRED", "REJECTED", { hasEmployee: true });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toContain("employee");
  });
  it("permits forward progression, rejection from any active stage, and one step back", () => {
    expect(canTransition("NEW", "SCREENING").ok).toBe(true);
    expect(canTransition("SHORTLISTED", "INTERVIEW").ok).toBe(true);
    expect(canTransition("INTERVIEW", "OFFER").ok).toBe(true);
    for (const from of ["NEW", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER"] as const) {
      expect(canTransition(from, "REJECTED").ok, `${from} -> REJECTED`).toBe(true);
    }
    expect(canTransition("INTERVIEW", "SHORTLISTED").ok).toBe(true);
    // A rejected candidate can be reconsidered for the same role.
    expect(canTransition("REJECTED", "INTERVIEW").ok).toBe(true);
  });
  it("refuses to jump more than one stage forward", () => {
    expect(canTransition("NEW", "INTERVIEW").ok).toBe(false);
    expect(canTransition("NEW", "OFFER").ok).toBe(false);
    expect(canTransition("SCREENING", "OFFER").ok).toBe(false);
  });
  it("treats a no-op move as allowed so idempotent saves do not error", () => {
    for (const s of stages) expect(canTransition(s, s).ok).toBe(true);
  });
  it("only offers legal moves to the UI, and never the current stage", () => {
    for (const from of stages) {
      const moves = allowedTransitions(from);
      expect(moves).not.toContain(from);
      for (const to of moves) expect(canTransition(from, to).ok, `${from} -> ${to}`).toBe(true);
    }
    expect(allowedTransitions("HIRED", { hasEmployee: true })).toEqual([]);
  });
  it("gates offer creation to the OFFER stage only", () => {
    expect(canCreateOffer("OFFER")).toBe(true);
    for (const s of stages) if (s !== "OFFER") expect(canCreateOffer(s)).toBe(false);
  });
});
