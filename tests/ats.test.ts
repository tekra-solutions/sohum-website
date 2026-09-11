import { describe, expect, it } from "vitest";
import { csvCell, escapeHtml, permits, positivePage, renderTemplate, stages, validateTemplate } from "@/lib/ats/policy";
import { feedbackSchema, interviewSchema, emailTemplateSchema } from "@/lib/ats/validation";
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
