import { beforeAll, describe, expect, it, vi } from "vitest";
type SentEmail = { to: string; subject: string; text: string; html: string };
const state = vi.hoisted(() => ({ role: "SUPER_ADMIN", id: "10000000-0000-4000-8000-000000000001", sendOk: true, pdfOk: true, lastEmail: null as SentEmail | null }));
const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("@/lib/auth/session", () => ({ requireAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "t@sohum.invalid" }), getSessionAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "t@sohum.invalid" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("@/lib/email", () => ({ send: vi.fn(async (m: SentEmail) => { state.lastEmail = m; return { sent: state.sendOk }; }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => cookieJar.has(n) ? { value: cookieJar.get(n)! } : undefined, set: (n: string, v: string) => { cookieJar.set(n, v); }, delete: (n: string) => { cookieJar.delete(n); } }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@/lib/offers/pdf", () => ({ renderOfferPdf: vi.fn(async () => { if (!state.pdfOk) throw new Error("Test PDF failure"); return Buffer.from("%PDF-e2e"); }) }));
vi.mock("@/lib/storage/offers", () => ({ buildOfferPdfPath: (o: string, v: number) => `offers/${o}/v${v}.pdf`, uploadOfferPdf: vi.fn(async () => {}), downloadOfferPdf: vi.fn(async () => new Blob([Buffer.from("%PDF")])), isStorageConfigured: () => true }));


const form = (values: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, v); return f; };
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe.skipIf(!process.env.ATS_TEST_DATABASE_URL)("promotion signing and employment history (local only)", () => {
  beforeAll(() => {
    const url = new URL(process.env.ATS_TEST_DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.startsWith("/sohum_ats_test_")) throw new Error("Refusing non-test database");
    process.env.DATABASE_URL = url.href;
    process.env.AUTH_SECRET = "local-promotion-integration-secret";
  });

  it("draft -> approval -> delivery -> OTP -> signature -> PDF recovery -> effective employment change", async () => {
    const { db } = await import("@/db");
    const { employees, promotions, promotionVersions, promotionSignatures, employmentEvents, auditLogs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const staff = await import("@/lib/promotions/actions");
    const publicActions = await import("@/app/promotion/[token]/actions");
    const { saveEmployeeAction } = await import("@/lib/services/employee-actions");
    const identity = { firstName: "Grace", lastName: "Hopper", workEmail: "promotion-test@sohum.invalid", jobTitle: "Engineer", department: "Engineering", location: "Kansas City", employmentType: "FULL_TIME", status: "ACTIVE", startDate: day(-30) };
    await expect(saveEmployeeAction({}, form(identity))).rejects.toThrow("REDIRECT");
    const [employee] = await db.select().from(employees).where(eq(employees.workEmail, identity.workEmail));
    expect(await db.select().from(employmentEvents).where(eq(employmentEvents.employeeId, employee.id))).toHaveLength(1);
    const input = { employeeId: employee.id, jobTitle: "Principal Engineer", department: "Engineering", location: "Kansas City", employmentType: "FULL_TIME", effectiveDate: day(2), expirationDate: day(10), annualSalaryCents: "180000" };
    await expect(staff.createPromotionAction({}, form(input))).rejects.toThrow("REDIRECT");
    const [promotion] = await db.select().from(promotions).where(eq(promotions.employeeId, employee.id));
    const f = form({ promotionId: promotion.id });
    expect((await staff.createPromotionAction({}, form(input))).error).toContain("already");
    expect((await staff.sendPromotionAction({}, f)).error).toContain("approved");
    expect((await staff.submitPromotionForApprovalAction({}, f)).success).toBeDefined();
    state.role = "RECRUITER";
    await expect(staff.approvePromotionAction({}, f)).rejects.toThrow("NOT_FOUND");
    state.role = "SUPER_ADMIN";
    expect((await staff.approvePromotionAction({}, f)).success).toBeDefined();
    state.sendOk = false;
    expect((await staff.sendPromotionAction({}, f)).error).toContain("remains approved");
    expect((await db.select().from(promotions).where(eq(promotions.id, promotion.id)))[0].status).toBe("APPROVED");
    state.sendOk = true;
    expect((await staff.sendPromotionAction({}, f)).success).toBeDefined();
    const token = state.lastEmail!.text.match(/\/promotion\/([A-Za-z0-9_-]+)/)![1];
    expect((await staff.sendPromotionAction({}, f)).error).toBeDefined();
    expect((await saveEmployeeAction({}, form({ ...identity, id: employee.id, workEmail: "changed@sohum.invalid" }))).message).toContain("signing email");
    const signature = form({ token, legalName: "Grace Hopper", consent: "on" });
    expect((await publicActions.acceptPromotionAction({}, signature)).error).toBeDefined();
    state.sendOk = false;
    expect((await publicActions.requestPromotionOtpAction({}, form({ token }))).error).toContain("Could not send");
    state.sendOk = true;
    expect((await publicActions.requestPromotionOtpAction({}, form({ token }))).success).toBeDefined();
    const code = state.lastEmail!.text.match(/\b(\d{6})\b/)![1];
    expect((await publicActions.verifyPromotionOtpAction({}, form({ token, code }))).success).toBeDefined();
    state.pdfOk = false;
    expect((await publicActions.acceptPromotionAction({}, signature)).success).toBeDefined();
    expect((await publicActions.acceptPromotionAction({}, signature)).error).toBeDefined();
    const [signed] = await db.select().from(promotionSignatures).where(eq(promotionSignatures.promotionId, promotion.id));
    expect(signed.electronicConsent).toBe(true);
    expect(signed.signedPdfPath).toBeNull();
    state.pdfOk = true;
    const { ensureSignedDocument } = await import("@/lib/documents/signed-files");
    const path = await ensureSignedDocument("promotion", promotion.id);
    expect(path).toContain("signed");
    expect(await ensureSignedDocument("promotion", promotion.id)).toBe(path);
    await expect(db.update(promotionSignatures).set({ signerLegalName: "Tampered" }).where(eq(promotionSignatures.id, signed.id))).rejects.toThrow();
    await expect(db.update(promotionVersions).set({ jobTitle: "Tampered" }).where(eq(promotionVersions.id, promotion.currentVersionId!))).rejects.toThrow();
    expect((await staff.updatePromotionAction({}, form({ ...input, promotionId: promotion.id, jobTitle: "Changed" }))).error).toBeDefined();
    expect((await staff.applyPromotionAction({}, f)).error).toContain("has not arrived");
    expect((await db.select().from(employees).where(eq(employees.id, employee.id)))[0].jobTitle).toBe("Engineer");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + 3 * 86400000));
    try {
      expect((await staff.applyPromotionAction({}, f)).success).toBeDefined();
      expect((await staff.applyPromotionAction({}, f)).success).toBeDefined();
      const [updated] = await db.select().from(employees).where(eq(employees.id, employee.id));
      expect(updated.jobTitle).toBe("Principal Engineer");
      const history = await db.select().from(employmentEvents).where(eq(employmentEvents.promotionId, promotion.id));
      expect(history).toHaveLength(1);
      expect(history[0].annualSalaryCents).toBe(18000000);
      await expect(db.update(employmentEvents).set({ annualSalaryCents: 1 }).where(eq(employmentEvents.id, history[0].id))).rejects.toThrow();
      expect((await staff.withdrawPromotionAction({}, f)).error).toBeDefined();
      // A title-only change carries forward pay rather than erasing it.
      const next = { ...input, jobTitle: "Distinguished Engineer", annualSalaryCents: "", effectiveDate: day(2), expirationDate: day(10) };
      await expect(staff.createPromotionAction({}, form(next))).rejects.toThrow("REDIRECT");
      const rows = await db.select().from(promotions).where(eq(promotions.employeeId, employee.id));
      const pending = rows.find(p => p.id !== promotion.id)!;
      const [nextVersion] = await db.select().from(promotionVersions).where(eq(promotionVersions.id, pending.currentVersionId!));
      expect(nextVersion.annualSalaryCents).toBe(18000000);
      expect(nextVersion.previousAnnualSalaryCents).toBe(18000000);
      const nextForm = form({ promotionId: pending.id });
      await staff.submitPromotionForApprovalAction({}, nextForm);
      await staff.approvePromotionAction({}, nextForm);
      await staff.sendPromotionAction({}, nextForm);
      const withdrawnToken = state.lastEmail!.text.match(/\/promotion\/([A-Za-z0-9_-]+)/)![1];
      expect((await staff.withdrawPromotionAction({}, nextForm)).success).toBeDefined();
      expect((await publicActions.requestPromotionOtpAction({}, form({ token: withdrawnToken }))).error).toBeDefined();
    } finally { vi.useRealTimers(); }
    const actions = (await db.select().from(auditLogs).where(eq(auditLogs.entityId, promotion.id))).map(a => a.action);
    for (const action of ["PROMOTION_CREATED", "PROMOTION_APPROVED", "PROMOTION_SENT", "IDENTITY_VERIFIED", "PROMOTION_ACCEPTED", "PROMOTION_APPLIED"]) expect(actions).toContain(action);
  }, 30000);
});
