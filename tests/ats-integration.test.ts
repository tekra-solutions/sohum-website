import { beforeAll, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "SUPER_ADMIN", id: "10000000-0000-4000-8000-000000000001", sendOk: true }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "test@sohum.invalid" }), getSessionAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "test@sohum.invalid" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("@/lib/email", () => ({ send: vi.fn(async () => ({ sent: state.sendOk, reason: state.sendOk ? undefined : "send_failed" })) }));
const enabled = Boolean(process.env.ATS_TEST_DATABASE_URL);
const appId = "30000000-0000-4000-8000-000000000001";
function form(values: Record<string,string>) { const f = new FormData(); for (const [k,v] of Object.entries({ applicationId: appId, ...values })) f.set(k,v); return f; }
describe.skipIf(!enabled)("ATS database integration (local only)", () => {
  beforeAll(() => {
    const url = new URL(process.env.ATS_TEST_DATABASE_URL!);
    if (!["localhost","127.0.0.1"].includes(url.hostname) || !url.pathname.startsWith("/sohum_ats_test_")) throw new Error("Refusing non-test database");
    process.env.DATABASE_URL = url.href; process.env.AUTH_SECRET = "local-integration-test-secret-not-for-production";
  });
  it("preserves migrated stages, searches on the server and scopes recruiter access", async () => {
    const { listApplications, getApplicationDetail } = await import("@/lib/services/applications");
    const app = await getApplicationDetail(appId); expect(app?.status).toBe("SCREENING");
    expect(app?.events[0]?.toStatus).toBe("SCREENING");
    state.id = "10000000-0000-4000-8000-000000000002"; state.role = "RECRUITER";
    expect((await listApplications({ q:"Playwright" })).total).toBe(1);
    expect((await listApplications({ q:"Unassigned" })).total).toBe(0);
    await expect(getApplicationDetail("30000000-0000-4000-8000-000000000002")).rejects.toThrow("NOT_FOUND");
    const { GET } = await import("@/app/api/admin/applications/[id]/resume/route");
    expect((await GET(new Request("http://localhost/resume"), { params: Promise.resolve({ id:"30000000-0000-4000-8000-000000000002" }) })).status).toBe(404);
  });
  it("moves a candidate and writes the event and audit atomically", async () => {
    const { candidateAction } = await import("@/lib/ats/actions");
    expect((await candidateAction({},form({ kind:"status",status:"SHORTLISTED" }))).success).toBeDefined();
    const { db } = await import("@/db"); const { applications, applicationEvents, auditLogs } = await import("@/db/schema"); const { eq } = await import("drizzle-orm");
    expect((await db.select().from(applications).where(eq(applications.id,appId)))[0].status).toBe("SHORTLISTED");
    expect((await db.select().from(applicationEvents).where(eq(applicationEvents.applicationId,appId))).some(e => e.fromStatus === "SCREENING" && e.toStatus === "SHORTLISTED" && e.changedBy === state.id)).toBe(true);
    expect((await db.select().from(auditLogs).where(eq(auditLogs.entityId,appId))).some(e => e.action === "ADMIN_CHANGED_APPLICATION_STATUS")).toBe(true);
    expect((await candidateAction({},form({ kind:"status",status:"DELETED" }))).error).toBeDefined();
  });
  it("adds and edits private notes, but prevents another author from changing them", async () => {
    const { candidateAction } = await import("@/lib/ats/actions");
    const { db } = await import("@/db"); const { candidateNotes } = await import("@/db/schema"); const { eq } = await import("drizzle-orm");
    expect((await candidateAction({},form({ kind:"note",note:"Strong automation experience" }))).success).toBeDefined();
    const [note] = await db.select().from(candidateNotes).where(eq(candidateNotes.applicationId,appId));
    expect((await candidateAction({},form({ kind:"note",noteId:note.id,note:"Edited recruiting note" }))).success).toBeDefined();
    state.id = "10000000-0000-4000-8000-000000000003"; state.role = "HIRING_MANAGER";
    expect((await candidateAction({},form({ kind:"note",noteId:note.id,note:"Unauthorized overwrite" }))).error).toContain("own notes");
    await expect(candidateAction({},form({kind:"status",status:"HIRED"}))).rejects.toThrow("NOT_FOUND");
    state.id = "10000000-0000-4000-8000-000000000002"; state.role = "RECRUITER";
  });
  it("schedules, reschedules, completes and reviews an interview", async () => {
    const { candidateAction } = await import("@/lib/ats/actions"); const { upcomingInterviews } = await import("@/lib/ats/data");
    const values = { kind:"interview", type:"Technical",status:"Scheduled",startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),timezone:"America/Chicago",interviewers:"Test Manager",location:"Video",meetingUrl:"https://meet.example.com/test",notes:"Local fixture" };
    expect((await candidateAction({},form(values))).success).toBeDefined();
    const upcoming = await upcomingInterviews(); expect(upcoming.some(i => i.interview.applicationId === appId)).toBe(true); const interviewId = upcoming[0].interview.id;
    expect((await candidateAction({},form({...values,interviewId,status:"Rescheduled"}))).success).toBeDefined();
    expect((await candidateAction({},form({...values,interviewId,status:"Completed"}))).success).toBeDefined();
    state.id = "10000000-0000-4000-8000-000000000003"; state.role = "HIRING_MANAGER";
    expect((await candidateAction({},form({kind:"feedback",interviewId,rating:"5",technical:"5",communication:"4",teamFit:"4",recommendation:"Hire",comments:"Evidence-based evaluation"}))).success).toBeDefined();
    state.id = "10000000-0000-4000-8000-000000000002"; state.role = "RECRUITER";
  });
  it("tracks email success and failure, and refuses duplicate send requests", async () => {
    const { emailCandidateAction } = await import("@/lib/ats/actions");
    const first = form({subject:"Local verification",body:"Test body",templateName:"Custom",requestKey:crypto.randomUUID()});
    expect((await emailCandidateAction({},first)).success).toBe("Message sent.");
    expect((await emailCandidateAction({},first)).error).toContain("already");
    state.sendOk = false;
    expect((await emailCandidateAction({},form({subject:"Failure case",body:"Test",templateName:"Custom",requestKey:crypto.randomUUID()}))).error).toContain("failed");
  });
  it("bulk authorization is all-or-nothing and preserves candidate history on hire", async () => {
    const { candidateAction, bulkCandidateAction } = await import("@/lib/ats/actions");
    const bulk = form({kind:"status",status:"HIRED"}); bulk.append("ids",appId); bulk.append("ids","30000000-0000-4000-8000-000000000002");
    expect((await bulkCandidateAction({},bulk)).error).toContain("accessible");
    expect((await candidateAction({},form({kind:"status",status:"OFFER"}))).success).toBeDefined();
    expect((await candidateAction({},form({kind:"status",status:"HIRED"}))).success).toBeDefined();
    const { getApplicationDetail } = await import("@/lib/services/applications");
    const candidate = await getApplicationDetail(appId); expect(candidate?.status).toBe("HIRED"); expect(candidate?.events.length).toBeGreaterThan(2);
  });
  it("converts a hired candidate once and retains the application", async () => {
    state.id = "10000000-0000-4000-8000-000000000001"; state.role = "SUPER_ADMIN";
    const { saveEmployeeAction } = await import("@/lib/services/employee-actions");
    const input = form({sourceApplicationId:appId,firstName:"Jane",lastName:"Verification",workEmail:"jane.employee@sohum.invalid",personalEmail:"jane@sohum.invalid",phone:"",jobTitle:"Principal Quality Engineer",department:"Engineering",location:"Kansas City",employmentType:"FULL_TIME",status:"ACTIVE",managerId:"",startDate:"2026-09-12",endDate:"",notes:"Test conversion"});
    await expect(saveEmployeeAction({},input)).rejects.toThrow("REDIRECT");
    expect((await saveEmployeeAction({},input)).errors?.workEmail).toBeDefined();
    const { db } = await import("@/db"); const { applications, employees } = await import("@/db/schema"); const { eq } = await import("drizzle-orm");
    expect((await db.select().from(employees).where(eq(employees.sourceApplicationId,appId))).length).toBe(1);
    expect((await db.select().from(applications).where(eq(applications.id,appId))).length).toBe(1);
  });
  it("builds the recruiting report against a real connection (raw sql`` Date params must be stringified, or postgres.js fails to bind them)", async () => {
    state.role = "SUPER_ADMIN";
    const { recruitingReport } = await import("@/lib/ats/reports");
    const report = await recruitingReport(undefined, undefined, "90");
    expect(report.byStatus.length).toBeGreaterThan(0);
    expect(report.overTime.length).toBeGreaterThan(0);
  });
  it("filters applications by an end date without failing to bind the parameter", async () => {
    state.role = "SUPER_ADMIN";
    const { listApplications } = await import("@/lib/services/applications");
    const result = await listApplications({ to: new Date().toISOString().slice(0,10) });
    expect(result.total).toBeGreaterThan(0);
  });
});
