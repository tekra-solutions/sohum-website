import { beforeAll, describe, expect, it, vi } from "vitest";
type SentEmail = { to: string; subject: string; text: string; html: string };
const state = vi.hoisted(() => ({ role: "SUPER_ADMIN", id: "10000000-0000-4000-8000-000000000001", sendOk: true, lastEmail: null as SentEmail | null }));
const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("@/lib/auth/session", () => ({ requireAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "t@sohum.invalid" }), getSessionAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "t@sohum.invalid" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("@/lib/email", () => ({ send: vi.fn(async (m: SentEmail) => { state.lastEmail = m; return { sent: state.sendOk }; }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => cookieJar.has(n) ? { value: cookieJar.get(n)! } : undefined, set: (n: string, v: string) => { cookieJar.set(n, v); }, delete: (n: string) => { cookieJar.delete(n); } }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@/lib/offers/pdf", () => ({ renderOfferPdf: vi.fn(async () => Buffer.from("%PDF-e2e")) }));
vi.mock("@/lib/storage/offers", () => ({ buildOfferPdfPath: (o: string, v: number) => `offers/${o}/v${v}.pdf`, uploadOfferPdf: vi.fn(async () => {}), downloadOfferPdf: vi.fn(async () => new Blob([Buffer.from("%PDF")])), isStorageConfigured: () => true }));

const enabled = Boolean(process.env.ATS_TEST_DATABASE_URL);
const SUPER = "10000000-0000-4000-8000-000000000001";
const REC = "10000000-0000-4000-8000-000000000002";

describe.skipIf(!enabled)("full recruiting funnel end to end (local only)", () => {
  beforeAll(() => { process.env.DATABASE_URL = process.env.ATS_TEST_DATABASE_URL!; process.env.AUTH_SECRET = "e2e-secret-not-for-production"; });

  it("walks job -> apply -> funnel -> offer -> accept -> hired -> employee with a full audit trail", async () => {
    const { db } = await import("@/db");
    const { applications, jobs, offers, auditLogs, employees, applicationEvents } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // 1-5. A published job already exists in the fixture.
    const [job] = await db.select().from(jobs).limit(1);
    expect(job.status).toBe("PUBLISHED");

    // 6. Public application arrives at NEW.
    const [app] = await db.insert(applications).values({
      reference: "E2E-1", jobId: job.id, firstName: "Ada", lastName: "Lovelace",
      email: "ada@sohum.invalid", status: "NEW",
    }).returning();

    const { candidateAction } = await import("@/lib/ats/actions");
    const f = (v: Record<string, string>) => { const d = new FormData(); d.set("applicationId", app.id); for (const [k, x] of Object.entries(v)) d.set(k, x); return d; };

    // 8. Assign to a recruiter.
    state.id = SUPER; state.role = "SUPER_ADMIN";
    expect((await candidateAction({}, f({ kind: "assign", assignedTo: REC }))).success).toBeDefined();

    // 10. Note.
    expect((await candidateAction({}, f({ kind: "note", note: "Strong systems background" }))).success).toBeDefined();

    // 11-12, 17. Walk the funnel one stage at a time.
    for (const s of ["SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER"]) {
      expect((await candidateAction({}, f({ kind: "status", status: s }))).success, s).toBeDefined();
    }

    // 13. Interview.
    expect((await candidateAction({}, f({
      kind: "interview", type: "Technical", status: "Scheduled",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 90000000).toISOString(),
      timezone: "America/Chicago", interviewers: "Test Manager",
    }))).success).toBeDefined();

    // 18. Offer.
    const { createOfferAction, submitOfferForApprovalAction, approveOfferAction, sendOfferAction } = await import("@/lib/offers/actions");
    const of = (v: Record<string, string>) => { const d = new FormData(); for (const [k, x] of Object.entries(v)) d.set(k, x); return d; };
    await expect(createOfferAction({}, of({
      applicationId: app.id, jobTitle: "Principal Engineer", department: "Engineering",
      location: "Kansas City", employmentType: "FULL_TIME", remoteType: "HYBRID",
      startDate: "2026-11-02", expirationDate: "2026-10-20",
      annualSalaryCents: "165000",
    }))).rejects.toThrow("REDIRECT");
    const [offer] = await db.select().from(offers).where(eq(offers.applicationId, app.id));
    expect(offer.status).toBe("DRAFT");

    // 19-20. Approval, and a recruiter may not self-approve.
    expect((await submitOfferForApprovalAction({}, of({ offerId: offer.id }))).success).toBeDefined();
    state.id = REC; state.role = "RECRUITER";
    await expect(approveOfferAction({}, of({ offerId: offer.id }))).rejects.toThrow("NOT_FOUND");
    state.id = SUPER; state.role = "SUPER_ADMIN";
    expect((await approveOfferAction({}, of({ offerId: offer.id }))).success).toBeDefined();

    // 21-22. PDF + send.
    expect((await sendOfferAction({}, of({ offerId: offer.id }))).success).toBe("Offer sent.");
    const token = state.lastEmail!.text.match(/\/offer\/([A-Za-z0-9_-]+)/)![1];

    // 23-24. Candidate verifies and accepts.
    const { requestOtpAction, verifyOtpAction, acceptOfferAction } = await import("@/app/offer/[token]/actions");
    const tf = (v: Record<string, string> = {}) => { const d = new FormData(); d.set("token", token); for (const [k, x] of Object.entries(v)) d.set(k, x); return d; };
    await requestOtpAction({}, tf());
    const code = state.lastEmail!.text.match(/\b(\d{6})\b/)![1];
    expect((await verifyOtpAction({}, tf({ code }))).success).toBeDefined();
    expect((await acceptOfferAction({}, tf({ legalName: "Ada Lovelace", confirmed: "1" }))).success).toBeDefined();

    // 25-26. Immutable + hired.
    const [accepted] = await db.select().from(offers).where(eq(offers.id, offer.id));
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.acceptedVersionId).toBe(accepted.currentVersionId);
    const [hired] = await db.select().from(applications).where(eq(applications.id, app.id));
    expect(hired.status).toBe("HIRED");

    // 27. Employee.
    const { saveEmployeeAction } = await import("@/lib/services/employee-actions");
    await expect(saveEmployeeAction({}, of({
      sourceApplicationId: app.id, firstName: "Ada", lastName: "Lovelace",
      workEmail: "ada.lovelace@sohumsystems.com", personalEmail: "ada@sohum.invalid", phone: "",
      jobTitle: "Principal Engineer", department: "Engineering", location: "Kansas City",
      employmentType: "FULL_TIME", status: "ACTIVE", managerId: "", startDate: "2026-11-02", endDate: "", notes: "",
    }))).rejects.toThrow("REDIRECT");
    expect((await db.select().from(employees).where(eq(employees.sourceApplicationId, app.id))).length).toBe(1);

    // Stage is now locked behind the employee record.
    expect((await candidateAction({}, f({ kind: "status", status: "REJECTED" }))).error).toContain("employee");

    // 28. Audit trail covers the whole journey.
    const offerAudit = (await db.select().from(auditLogs).where(eq(auditLogs.entityId, offer.id))).map(a => a.action);
    for (const a of ["OFFER_CREATED", "OFFER_SUBMITTED_FOR_APPROVAL", "OFFER_APPROVED", "OFFER_PDF_GENERATED", "OFFER_SENT", "OFFER_ACCEPTED"]) {
      expect(offerAudit, a).toContain(a);
    }
    const events = await db.select().from(applicationEvents).where(eq(applicationEvents.applicationId, app.id));
    expect(events.map(e => e.toStatus)).toEqual(expect.arrayContaining(["SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED"]));
  });
});
