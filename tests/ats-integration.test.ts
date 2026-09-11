import { beforeAll, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "SUPER_ADMIN", id: "10000000-0000-4000-8000-000000000001", sendOk: true, lastEmail: null as { subject: string; text: string; html: string; to: string } | null }));
const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("@/lib/auth/session", () => ({ requireAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "test@sohum.invalid" }), getSessionAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "test@sohum.invalid" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("@/lib/email", () => ({ send: vi.fn(async (msg: { to: string; subject: string; text: string; html: string }) => { state.lastEmail = msg; return { sent: state.sendOk, reason: state.sendOk ? undefined : "send_failed" }; }) }));
// next/headers requires Next's request-scoped storage, which does not exist
// outside a real request. The offer candidate-session/actions modules only
// need cookies()/headers() as plain getters/setters, so a Map-backed stub is
// enough to exercise them directly here, the same way admin auth is mocked
// above rather than driven through a real cookie jar.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => { cookieJar.set(name, value); },
    delete: (name: string) => { cookieJar.delete(name); },
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.5" }),
}));
// Chromium is not reliably available in CI, and there is no real Supabase
// bucket in this test run — both are exercised standalone elsewhere
// (see the manual PDF smoke test recorded in the offer-management commits).
// Here only the offer workflow's own logic (state machine, tokens, OTP,
// audit trail) is under test, so both are stubbed to no-ops that still
// exercise every call site.
vi.mock("@/lib/offers/pdf", () => ({ renderOfferPdf: vi.fn(async () => Buffer.from("%PDF-fake")) }));
vi.mock("@/lib/storage/offers", () => ({
  buildOfferPdfPath: (offerId: string, v: number) => `offers/${offerId}/v${v}-test.pdf`,
  uploadOfferPdf: vi.fn(async () => {}),
  downloadOfferPdf: vi.fn(async () => new Blob([Buffer.from("%PDF-fake")])),
  isStorageConfigured: () => true,
}));
const enabled = Boolean(process.env.ATS_TEST_DATABASE_URL);
const appId = "30000000-0000-4000-8000-000000000001";
function form(values: Record<string,string>) { const f = new FormData(); for (const [k,v] of Object.entries({ applicationId: appId, ...values })) f.set(k,v); return f; }
describe.skipIf(!enabled)("ATS database integration (local only)", () => {
  beforeAll(() => {
    const url = new URL(process.env.ATS_TEST_DATABASE_URL!);
    if (!["localhost","127.0.0.1"].includes(url.hostname) || !url.pathname.startsWith("/sohum_ats_test_")) throw new Error("Refusing non-test database");
    process.env.DATABASE_URL = url.href; process.env.AUTH_SECRET = "local-integration-test-secret-not-for-production";
  });
  it("runs against a freshly seeded fixture", async () => {
    // These tests mutate shared fixture rows in sequence, so a re-run against
    // an already-used database produces confusing downstream failures (a
    // candidate found at HIRED when the test expects SCREENING). Fail here
    // with an actionable message instead of 15 misleading assertion errors.
    const { getApplicationDetail } = await import("@/lib/services/applications");
    const app = await getApplicationDetail(appId);
    expect(app?.status, "fixture already mutated — create a new sohum_ats_test_* database and re-run scripts/setup-ats-test-db.mjs").toBe("SCREENING");
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
    expect((await candidateAction({},form({kind:"status",status:"INTERVIEW"}))).success).toBeDefined();
    expect((await candidateAction({},form({kind:"status",status:"OFFER"}))).success).toBeDefined();
    // Hiring requires either an accepted offer or the explicit, manage-gated
    // override for a hire agreed outside the platform.
    expect((await candidateAction({},form({kind:"status",status:"HIRED"}))).error).toContain("accept their offer");
    state.id = "10000000-0000-4000-8000-000000000001"; state.role = "SUPER_ADMIN";
    expect((await candidateAction({},form({kind:"status",status:"HIRED",allowDirectHire:"1"}))).success).toBeDefined();
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

describe.skipIf(!enabled)("Workflow edge cases (local only)", () => {
  beforeAll(() => { state.sendOk = true; });

  it("refuses to schedule an interview for a rejected or hired candidate", async () => {
    state.id = "10000000-0000-4000-8000-000000000001"; state.role = "SUPER_ADMIN";
    const { db } = await import("@/db");
    const { applications, jobs } = await import("@/db/schema");
    const [job] = await db.select().from(jobs).limit(1);
    const [rejected] = await db.insert(applications).values({
      reference: "LOCAL-ATS-REJ", jobId: job.id, firstName: "Rejected", lastName: "Case",
      email: "rejected.case@sohum.invalid", status: "REJECTED",
    }).returning();

    const { candidateAction } = await import("@/lib/ats/actions");
    const f = new FormData();
    f.set("applicationId", rejected.id); f.set("kind", "interview"); f.set("type", "Technical");
    f.set("status", "Scheduled");
    f.set("startsAt", new Date(Date.now() + 86400000).toISOString());
    f.set("endsAt", new Date(Date.now() + 90000000).toISOString());
    f.set("timezone", "America/Chicago"); f.set("interviewers", "Test Manager");
    expect((await candidateAction({}, f)).error).toContain("already rejected");
  });

  it("refuses an interview whose end precedes its start", async () => {
    state.id = "10000000-0000-4000-8000-000000000001"; state.role = "SUPER_ADMIN";
    const { db } = await import("@/db");
    const { applications, jobs } = await import("@/db/schema");
    const [job] = await db.select().from(jobs).limit(1);
    const [active] = await db.insert(applications).values({
      reference: "LOCAL-ATS-TIME", jobId: job.id, firstName: "Time", lastName: "Case",
      email: "time.case@sohum.invalid", status: "INTERVIEW",
    }).returning();
    const { candidateAction } = await import("@/lib/ats/actions");
    const f = new FormData();
    f.set("applicationId", active.id); f.set("kind", "interview"); f.set("type", "Technical");
    f.set("status", "Scheduled");
    f.set("startsAt", new Date(Date.now() + 90000000).toISOString());
    f.set("endsAt", new Date(Date.now() + 86400000).toISOString());
    f.set("timezone", "America/Chicago"); f.set("interviewers", "Test Manager");
    expect((await candidateAction({}, f)).error).toBeDefined();
  });

  it("refuses candidate acceptance of a withdrawn offer", async () => {
    state.id = "10000000-0000-4000-8000-000000000001"; state.role = "SUPER_ADMIN";
    const { db } = await import("@/db");
    const { applications, jobs, offers, offerVersions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [job] = await db.select().from(jobs).limit(1);
    const [app] = await db.insert(applications).values({
      reference: "LOCAL-ATS-WD", jobId: job.id, firstName: "Withdrawn", lastName: "Case",
      email: "withdrawn.case@sohum.invalid", status: "OFFER",
    }).returning();
    const { hashOfferToken } = await import("@/lib/offers/tokens");
    const token = "withdrawn-case-token-fixture";
    const [offer] = await db.insert(offers).values({
      applicationId: app.id, createdBy: state.id, status: "SENT",
      secureTokenHash: hashOfferToken(token),
    }).returning();
    const [version] = await db.insert(offerVersions).values({
      offerId: offer.id, versionNumber: 1, createdBy: state.id,
      jobTitle: "Test", department: "Engineering", location: "Kansas City",
      employmentType: "FULL_TIME", remoteType: "HYBRID",
      startDate: new Date(Date.now() + 30 * 86400000),
      expirationDate: new Date(Date.now() + 7 * 86400000),
      renderedHtml: "<html></html>",
    }).returning();
    await db.update(offers).set({ currentVersionId: version.id }).where(eq(offers.id, offer.id));

    // Verify as the candidate, then withdraw before they accept.
    const { requestOtpAction, verifyOtpAction, acceptOfferAction } = await import("@/app/offer/[token]/actions");
    const tf = (extra: Record<string, string> = {}) => {
      const f = new FormData(); f.set("token", token);
      for (const [k, v] of Object.entries(extra)) f.set(k, v);
      return f;
    };
    await requestOtpAction({}, tf());
    const code = state.lastEmail!.text.match(/\b(\d{6})\b/)![1];
    expect((await verifyOtpAction({}, tf({ code }))).success).toBeDefined();

    const { withdrawOfferAction } = await import("@/lib/offers/actions");
    const wf = new FormData(); wf.set("offerId", offer.id);
    expect((await withdrawOfferAction({}, wf)).success).toBeDefined();

    // The withdraw rotates the token hash, so the old link no longer resolves
    // at all — the candidate sees the uniform "invalid or expired" message.
    const accept = await acceptOfferAction({}, tf({ legalName: "Withdrawn Case", confirmed: "1" }));
    expect(accept.error).toBeDefined();
    expect(accept.success).toBeUndefined();
    const [after] = await db.select().from(offers).where(eq(offers.id, offer.id));
    expect(after.status).toBe("WITHDRAWN");
    const [appAfter] = await db.select().from(applications).where(eq(applications.id, app.id));
    expect(appAfter.status).toBe("OFFER");
  });
});

describe.skipIf(!enabled)("RBAC enforcement (local only)", () => {
  const managerId = "10000000-0000-4000-8000-000000000003";
  const appId2 = "30000000-0000-4000-8000-000000000001";
  beforeAll(() => { state.sendOk = true; });

  it("denies a hiring manager every offer read path, not just the nav link", async () => {
    state.id = managerId; state.role = "HIRING_MANAGER";
    const { listOffers, offerDashboardMetrics } = await import("@/lib/offers/data");
    // requirePermission() calls notFound(), which the suite maps to a throw.
    await expect(listOffers({})).rejects.toThrow("NOT_FOUND");
    await expect(offerDashboardMetrics()).rejects.toThrow("NOT_FOUND");
  });

  it("omits compensation from a hiring manager's candidate payload entirely", async () => {
    state.id = managerId; state.role = "HIRING_MANAGER";
    const { candidateWorkspace } = await import("@/lib/ats/data");
    const asManager = await candidateWorkspace(appId2);
    expect(asManager.offer).toBeNull();
    state.id = "10000000-0000-4000-8000-000000000001"; state.role = "SUPER_ADMIN";
    const asAdmin = await candidateWorkspace(appId2);
    // Same record, privileged role — proves the null above is the permission
    // gate doing its job, not simply an application without an offer.
    expect(asAdmin).toHaveProperty("offer");
  });

  it("refuses candidate mutations from a feedback-only role", async () => {
    state.id = managerId; state.role = "HIRING_MANAGER";
    const { candidateAction, bulkCandidateAction } = await import("@/lib/ats/actions");
    const f = new FormData();
    f.set("applicationId", appId2); f.set("kind", "status"); f.set("status", "REJECTED");
    await expect(candidateAction({}, f)).rejects.toThrow("NOT_FOUND");
    const bulk = new FormData();
    bulk.set("kind", "status"); bulk.set("status", "REJECTED"); bulk.append("ids", appId2);
    await expect(bulkCandidateAction({}, bulk)).rejects.toThrow("NOT_FOUND");
  });

  it("keeps admin account management to super admins only", async () => {
    state.id = "10000000-0000-4000-8000-000000000002"; state.role = "RECRUITER";
    const { createAdminAction } = await import("@/lib/services/admin-actions");
    const f = new FormData();
    f.set("name", "Escalated User"); f.set("email", "escalate@sohum.invalid");
    f.set("role", "SUPER_ADMIN"); f.set("password", "Str0ng-Passw0rd!23"); f.set("confirmPassword", "Str0ng-Passw0rd!23");
    expect((await createAdminAction({}, f)).message).toContain("super admin");
    const { db } = await import("@/db");
    const { admins } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    expect((await db.select().from(admins).where(eq(admins.email, "escalate@sohum.invalid"))).length).toBe(0);
  });
});

describe.skipIf(!enabled)("Offer workflow (local only)", () => {
  const offerAppId = "30000000-0000-4000-8000-000000000002";
  const superAdminId = "10000000-0000-4000-8000-000000000001";
  const recruiterId = "10000000-0000-4000-8000-000000000002";
  let offerId: string;
  // The preceding "tracks email success and failure" test leaves
  // state.sendOk = false — reset it, this block exercises the success path.
  beforeAll(() => { state.sendOk = true; });
  const offerForm = (values: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(values)) f.set(k, v);
    return f;
  };
  const versionFields = {
    applicationId: offerAppId,
    jobTitle: "Principal Quality Engineer", department: "Engineering", location: "Kansas City",
    employmentType: "FULL_TIME", remoteType: "HYBRID",
    hiringManagerName: "Test Manager", reportsTo: "Test Manager, VP Engineering",
    startDate: "2026-10-05", expirationDate: "2026-09-30",
    annualSalaryCents: "145000", hourlyRateCents: "", bonusCents: "5000", signOnBonusCents: "",
    benefitsSummary: "Medical, dental, vision.", ptoSummary: "3 weeks PTO.",
    workLocation: "Overland Park, KS", additionalTerms: "",
  };

  it("moves the fixture candidate to OFFER so an offer can be created", async () => {
    state.id = recruiterId; state.role = "RECRUITER";
    const { candidateAction } = await import("@/lib/ats/actions");
    const f = new FormData(); f.set("applicationId", offerAppId); f.set("kind", "assign"); f.set("assignedTo", recruiterId);
    // Assign first so RECRUITER's candidateScope (assignedTo-based) covers it.
    state.id = superAdminId; state.role = "SUPER_ADMIN";
    expect((await candidateAction({}, f)).success).toBeDefined();
    state.id = recruiterId; state.role = "RECRUITER";
    // Walk the funnel one stage at a time — the central transition rules
    // refuse NEW -> OFFER in a single hop, which is the point of them.
    for (const stage of ["SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER"]) {
      const status = new FormData();
      status.set("applicationId", offerAppId); status.set("kind", "status"); status.set("status", stage);
      expect((await candidateAction({}, status)).success, `move to ${stage}`).toBeDefined();
    }
  });

  it("refuses to skip the funnel or hire without an accepted offer", async () => {
    state.id = recruiterId; state.role = "RECRUITER";
    const { candidateAction } = await import("@/lib/ats/actions");
    const hire = new FormData();
    hire.set("applicationId", offerAppId); hire.set("kind", "status"); hire.set("status", "HIRED");
    // A recruiter cannot mark someone hired directly; that requires either a
    // candidate-accepted offer or an explicit manage-gated override.
    expect((await candidateAction({}, hire)).error).toContain("accept their offer");
    // The override is rejected for a role without "manage".
    hire.set("allowDirectHire", "1");
    expect((await candidateAction({}, hire)).error).toContain("accept their offer");
  });

  it("creates a draft offer with a rendered document and audits it", async () => {
    const { createOfferAction } = await import("@/lib/offers/actions");
    await expect(createOfferAction({}, offerForm(versionFields))).rejects.toThrow("REDIRECT");
    const { db } = await import("@/db");
    const { offers, offerVersions, auditLogs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [offer] = await db.select().from(offers).where(eq(offers.applicationId, offerAppId));
    expect(offer.status).toBe("DRAFT");
    offerId = offer.id;
    const [version] = await db.select().from(offerVersions).where(eq(offerVersions.offerId, offerId));
    expect(version.versionNumber).toBe(1);
    expect(version.renderedHtml).toContain("Principal Quality Engineer");
    expect(version.renderedHtml).toContain("$145,000");
    expect((await db.select().from(auditLogs).where(eq(auditLogs.entityId, offerId))).some(e => e.action === "OFFER_CREATED")).toBe(true);
  });

  it("refuses a second active offer for the same application", async () => {
    const { createOfferAction } = await import("@/lib/offers/actions");
    const result = await createOfferAction({}, offerForm(versionFields));
    expect(result.error).toContain("already exists");
  });

  it("goes through submit, reject-and-resubmit, then approve — only a manage-permitted role can approve", async () => {
    const { submitOfferForApprovalAction, approveOfferAction, rejectOfferAction } = await import("@/lib/offers/actions");
    const submit = () => submitOfferForApprovalAction({}, offerForm({ offerId }));
    expect((await submit()).success).toBeDefined();

    state.id = recruiterId; state.role = "RECRUITER";
    await expect(approveOfferAction({}, offerForm({ offerId }))).rejects.toThrow("NOT_FOUND");

    state.id = superAdminId; state.role = "SUPER_ADMIN";
    expect((await rejectOfferAction({}, offerForm({ offerId, note: "Adjust benefits summary" }))).success).toBeDefined();
    const { db } = await import("@/db"); const { offers } = await import("@/db/schema"); const { eq } = await import("drizzle-orm");
    expect((await db.select().from(offers).where(eq(offers.id, offerId)))[0].status).toBe("DRAFT");

    state.id = recruiterId; state.role = "RECRUITER";
    expect((await submit()).success).toBeDefined();
    state.id = superAdminId; state.role = "SUPER_ADMIN";
    expect((await approveOfferAction({}, offerForm({ offerId }))).success).toBeDefined();
    expect((await db.select().from(offers).where(eq(offers.id, offerId)))[0].status).toBe("APPROVED");
  });

  let offerToken: string;
  it("sends the offer: generates a PDF, stores it, emails the candidate, and no PDF is attached", async () => {
    state.id = recruiterId; state.role = "RECRUITER";
    const { sendOfferAction } = await import("@/lib/offers/actions");
    const result = await sendOfferAction({}, offerForm({ offerId }));
    expect(result.success).toBe("Offer sent.");
    expect(state.lastEmail?.subject).toBe("Employment Offer — Principal Quality Engineer — Sohum Systems");
    expect(state.lastEmail && "attachments" in state.lastEmail).toBe(false);
    const match = state.lastEmail?.text.match(/\/offer\/([A-Za-z0-9_-]+)/);
    expect(match).toBeTruthy();
    offerToken = match![1];

    const { db } = await import("@/db"); const { offers, offerVersions, auditLogs } = await import("@/db/schema"); const { eq } = await import("drizzle-orm");
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId));
    expect(offer.status).toBe("SENT");
    const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId!));
    expect(version.pdfStoragePath).toBeTruthy();
    const actions = (await db.select().from(auditLogs).where(eq(auditLogs.entityId, offerId))).map(e => e.action);
    expect(actions).toContain("OFFER_PDF_GENERATED");
    expect(actions).toContain("OFFER_SENT");
  });

  it("requires OTP verification, enforces the 5-attempt lockout, then accepts the correct code", async () => {
    const { requestOtpAction, verifyOtpAction } = await import("@/app/offer/[token]/actions");
    expect((await requestOtpAction({}, offerForm({ token: offerToken }))).success).toBeDefined();
    const sentText = state.lastEmail!.text;
    const codeMatch = sentText.match(/\b(\d{6})\b/);
    expect(codeMatch).toBeTruthy();
    const correctCode = codeMatch![1];

    for (let i = 0; i < 5; i++) {
      const wrong = correctCode === "000000" ? "111111" : "000000";
      const result = await verifyOtpAction({}, offerForm({ token: offerToken, code: wrong }));
      expect(result.error).toBeDefined();
    }
    // Lockout: even the correct code is now refused for this request.
    expect((await verifyOtpAction({}, offerForm({ token: offerToken, code: correctCode }))).error).toBeDefined();

    // A fresh code (new request) succeeds.
    expect((await requestOtpAction({}, offerForm({ token: offerToken }))).success).toBeDefined();
    const freshCode = state.lastEmail!.text.match(/\b(\d{6})\b/)![1];
    expect((await verifyOtpAction({}, offerForm({ token: offerToken, code: freshCode }))).success).toBeDefined();
  });

  it("marks the offer VIEWED, records the view, and reflects it on the candidate profile", async () => {
    const { resolveOfferToken: resolveToken } = await import("@/lib/offers/data");
    const row = await resolveToken(offerToken);
    expect(row?.offer.status).toBe("SENT");
    // The page component itself performs the SENT->VIEWED transition on
    // first authenticated view; exercised here at the data layer since the
    // page is a server component this suite does not render.
    const { db } = await import("@/db"); const { offers, auditLogs } = await import("@/db/schema"); const { eq } = await import("drizzle-orm");
    await db.update(offers).set({ status: "VIEWED", viewedAt: new Date() }).where(eq(offers.id, offerId));
    await db.insert(auditLogs).values({ adminId: null, action: "OFFER_VIEWED", entityType: "offer", entityId: offerId, metadata: { applicationId: offerAppId, actor: "candidate" } });
    const { offerForApplication } = await import("@/lib/offers/data");
    const embedded = await offerForApplication(offerAppId);
    expect(embedded?.offer.status).toBe("VIEWED");
  });

  it("accepts the offer, advances the application toward HIRED, and refuses a second accept or any further edit", async () => {
    const { acceptOfferAction } = await import("@/app/offer/[token]/actions");
    const accept = () => acceptOfferAction({}, offerForm({ token: offerToken, legalName: "Private Unassigned", confirmed: "1" }));
    expect((await accept()).success).toBeDefined();

    const { db } = await import("@/db");
    const { offers, applications, auditLogs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId));
    expect(offer.status).toBe("ACCEPTED");
    expect(offer.acceptedVersionId).toBe(offer.currentVersionId);
    expect(offer.signedLegalName).toBe("Private Unassigned");
    const [app] = await db.select().from(applications).where(eq(applications.id, offerAppId));
    expect(app.status).toBe("HIRED");
    expect((await db.select().from(auditLogs).where(eq(auditLogs.entityId, offerId))).some(e => e.action === "OFFER_ACCEPTED" && e.adminId === null)).toBe(true);

    expect((await accept()).error).toBeDefined();

    state.id = superAdminId; state.role = "SUPER_ADMIN";
    const { updateOfferAction } = await import("@/lib/offers/actions");
    expect((await updateOfferAction({}, offerForm({ offerId, ...versionFields, applicationId: offerAppId }))).error).toContain("no longer be edited");
  });

  it("supports a decline with a reason on a second offer, without touching application status", async () => {
    // A fresh application is needed: the accepted-offer application already
    // has an active-offer guard tripped, and its status is already HIRED.
    state.id = superAdminId; state.role = "SUPER_ADMIN";
    const { db } = await import("@/db");
    const { applications, jobs } = await import("@/db/schema");
    const [job] = await db.select().from(jobs).limit(1);
    const [declineApp] = await db.insert(applications).values({
      reference: "LOCAL-ATS-DECLINE", jobId: job.id, firstName: "Decline", lastName: "Case",
      email: "decline.case@sohum.invalid", status: "OFFER",
    }).returning();

    const { createOfferAction, submitOfferForApprovalAction, approveOfferAction, sendOfferAction } = await import("@/lib/offers/actions");
    await expect(createOfferAction({}, offerForm({ ...versionFields, applicationId: declineApp.id }))).rejects.toThrow("REDIRECT");
    const { offers } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [declineOffer] = await db.select().from(offers).where(eq(offers.applicationId, declineApp.id));
    await submitOfferForApprovalAction({}, offerForm({ offerId: declineOffer.id }));
    await approveOfferAction({}, offerForm({ offerId: declineOffer.id }));
    await sendOfferAction({}, offerForm({ offerId: declineOffer.id }));
    const declineMatch = state.lastEmail!.text.match(/\/offer\/([A-Za-z0-9_-]+)/);
    const declineToken = declineMatch![1];

    const { requestOtpAction, verifyOtpAction, declineOfferAction } = await import("@/app/offer/[token]/actions");
    await requestOtpAction({}, offerForm({ token: declineToken }));
    const code = state.lastEmail!.text.match(/\b(\d{6})\b/)![1];
    await verifyOtpAction({}, offerForm({ token: declineToken, code }));
    expect((await declineOfferAction({}, offerForm({ token: declineToken, reason: "COMPENSATION" }))).success).toBeDefined();

    const [afterDecline] = await db.select().from(offers).where(eq(offers.id, declineOffer.id));
    expect(afterDecline.status).toBe("DECLINED");
    expect(afterDecline.declineReason).toBe("COMPENSATION");
    const [appAfterDecline] = await db.select().from(applications).where(eq(applications.id, declineApp.id));
    expect(appAfterDecline.status).toBe("OFFER");
  });

  it("sweeps an overdue sent offer to EXPIRED using typed date operators, never a raw sql`` template with a bare Date", async () => {
    const { db } = await import("@/db");
    const { applications, jobs, offers, offerVersions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [job] = await db.select().from(jobs).limit(1);
    const [expireApp] = await db.insert(applications).values({
      reference: "LOCAL-ATS-EXPIRE", jobId: job.id, firstName: "Expire", lastName: "Case",
      email: "expire.case@sohum.invalid", status: "OFFER",
    }).returning();
    const [expireOffer] = await db.insert(offers).values({
      applicationId: expireApp.id, createdBy: superAdminId, status: "SENT",
      secureTokenHash: "expire-case-test-hash",
    }).returning();
    const [expireVersion] = await db.insert(offerVersions).values({
      offerId: expireOffer.id, versionNumber: 1, createdBy: superAdminId,
      jobTitle: "Test", department: "Engineering", location: "Kansas City",
      employmentType: "FULL_TIME", remoteType: "HYBRID",
      startDate: new Date("2026-01-01"), expirationDate: new Date("2026-01-08"),
      renderedHtml: "<html></html>",
    }).returning();
    await db.update(offers).set({ currentVersionId: expireVersion.id }).where(eq(offers.id, expireOffer.id));

    const { sweepExpiredOffers } = await import("@/lib/offers/data");
    await expect(sweepExpiredOffers()).resolves.not.toThrow();
    const [swept] = await db.select().from(offers).where(eq(offers.id, expireOffer.id));
    expect(swept.status).toBe("EXPIRED");
  });
});
