import { beforeAll, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "SUPER_ADMIN", id: "10000000-0000-4000-8000-000000000001" }));
vi.mock("@/lib/auth/session", () => ({
  requireAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "t@sohum.invalid" }),
  getSessionAdmin: async () => ({ id: state.id, role: state.role, name: "Test", email: "t@sohum.invalid" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: () => { throw new Error("REDIRECT"); },
}));

const enabled = Boolean(process.env.ATS_TEST_DATABASE_URL);
const SUPER = "10000000-0000-4000-8000-000000000001";
const RECRUITER = "10000000-0000-4000-8000-000000000002";

const fd = (values: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v)) v.forEach(x => f.append(k, x));
    else f.set(k, v);
  }
  return f;
};

describe.skipIf(!enabled)("invoice workflow (local only)", () => {
  let clientId = "";
  let invoiceId = "";

  beforeAll(() => {
    const url = new URL(process.env.ATS_TEST_DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.startsWith("/sohum_ats_test_")) {
      throw new Error("Refusing non-test database");
    }
    process.env.DATABASE_URL = url.href;
    process.env.AUTH_SECRET = "local-integration-test-secret-not-for-production";
    state.id = SUPER; state.role = "SUPER_ADMIN";
  });

  it("creates a client", async () => {
    const { saveClientAction } = await import("@/lib/invoices/actions");
    expect((await saveClientAction({}, fd({
      companyName: "Department of Transportation",
      contactName: "Procurement Office", email: "ap@dot.example.gov",
      billingAddress: "1200 New Jersey Ave SE\nWashington, DC 20590",
      agency: "DOT",
    }))).success).toBeDefined();
    const { db } = await import("@/db");
    const { clients } = await import("@/db/schema");
    const [row] = await db.select().from(clients);
    expect(row.companyName).toBe("Department of Transportation");
    clientId = row.id;
  });

  it("creates an invoice with three line items and server-derived totals", async () => {
    const { saveInvoiceAction } = await import("@/lib/invoices/actions");
    await expect(saveInvoiceAction({}, fd({
      clientId,
      invoiceDate: "2026-09-01", dueDate: "2026-10-01",
      poNumber: "PO-99812", contractNumber: "GS-35F-0119Y", taskOrder: "TO-004",
      paymentTerms: "Net 30",
      taxRateBasisPoints: "0",
      // 40h @ $175.50 = $7,020 | 10h @ $200 = $2,000 | 2.5h @ $120 = $300
      itemDescription: ["Senior engineering", "Architecture review", "Documentation"],
      itemQuantity: ["40", "10", "2.5"],
      itemRate: ["175.50", "200", "120"],
    }))).rejects.toThrow("REDIRECT");

    const { db } = await import("@/db");
    const { invoices, invoiceItems } = await import("@/db/schema");
    const [invoice] = await db.select().from(invoices);
    invoiceId = invoice.id;
    expect(invoice.status).toBe("DRAFT");
    expect(invoice.invoiceNumber).toMatch(/^SOH-\d{4}-0001$/);
    // Totals must be derived server-side, exact to the cent.
    expect(invoice.subtotalCents).toBe(932000);
    expect(invoice.totalCents).toBe(932000);
    expect(invoice.balanceDueCents).toBe(932000);
    expect(invoice.amountPaidCents).toBe(0);
    // Billing details are snapshotted, not merely referenced.
    expect(invoice.billingSnapshot?.companyName).toBe("Department of Transportation");
    const items = await db.select().from(invoiceItems).where((await import("drizzle-orm")).eq(invoiceItems.invoiceId, invoiceId));
    expect(items).toHaveLength(3);
    expect(items.find(i => i.description === "Senior engineering")!.amountCents).toBe(702000);
  });

  it("ignores totals supplied by the browser and recomputes from line items", async () => {
    const { saveInvoiceAction } = await import("@/lib/invoices/actions");
    await expect(saveInvoiceAction({}, fd({
      clientId, invoiceDate: "2026-09-02", dueDate: "2026-10-02", taxRateBasisPoints: "0",
      itemDescription: ["Consulting"], itemQuantity: ["1"], itemRate: ["100"],
      // Hostile input: these must be ignored entirely.
      subtotalCents: "1", totalCents: "1", balanceDueCents: "1", amountPaidCents: "999999",
    }))).rejects.toThrow("REDIRECT");
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const [latest] = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(1);
    expect(latest.totalCents).toBe(10000);
    expect(latest.amountPaidCents).toBe(0);
    expect(latest.balanceDueCents).toBe(10000);
  });

  it("allocates unique, sequential invoice numbers under concurrency", async () => {
    const { saveInvoiceAction } = await import("@/lib/invoices/actions");
    const make = () => saveInvoiceAction({}, fd({
      clientId, invoiceDate: "2026-09-03", dueDate: "2026-10-03", taxRateBasisPoints: "0",
      itemDescription: ["Concurrent"], itemQuantity: ["1"], itemRate: ["10"],
    })).catch(() => undefined); // each redirects
    await Promise.all([make(), make(), make(), make(), make()]);
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const rows = await db.select({ n: invoices.invoiceNumber }).from(invoices);
    const numbers = rows.map(r => r.n);
    expect(new Set(numbers).size, `duplicate invoice numbers: ${numbers.join(", ")}`).toBe(numbers.length);
  });

  it("refuses a payment on a draft, then accepts partial and final payments", async () => {
    const { recordPaymentAction } = await import("@/lib/invoices/actions");
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // Draft cannot take money.
    expect((await recordPaymentAction({}, fd({
      invoiceId, amountCents: "100", paidOn: "2026-09-05", method: "ACH",
    }))).error).toContain("Send the invoice");

    // Mark it sent so payments are allowed.
    await db.update(invoices).set({ status: "SENT", sentAt: new Date() }).where(eq(invoices.id, invoiceId));

    // Overpayment is refused outright.
    expect((await recordPaymentAction({}, fd({
      invoiceId, amountCents: "99999", paidOn: "2026-09-05", method: "ACH",
    }))).error).toContain("exceeds the outstanding balance");

    // $4,000 of $9,320.
    expect((await recordPaymentAction({}, fd({
      invoiceId, amountCents: "4000", paidOn: "2026-09-05", method: "ACH", reference: "ABC123",
    }))).success).toBeDefined();
    let [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(inv.status).toBe("PARTIALLY_PAID");
    expect(inv.amountPaidCents).toBe(400000);
    expect(inv.balanceDueCents).toBe(532000);

    // Exact remaining balance clears it.
    expect((await recordPaymentAction({}, fd({
      invoiceId, amountCents: "5320", paidOn: "2026-09-10", method: "WIRE", reference: "XYZ987",
    }))).success).toBeDefined();
    [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    expect(inv.status).toBe("PAID");
    expect(inv.balanceDueCents).toBe(0);
    expect(inv.paidAt).not.toBeNull();

    // A paid invoice takes no more money.
    expect((await recordPaymentAction({}, fd({
      invoiceId, amountCents: "1", paidOn: "2026-09-11", method: "ACH",
    }))).error).toContain("already paid");
  });

  it("keeps a full payment history with who recorded each one", async () => {
    const { getInvoiceDetail } = await import("@/lib/invoices/data");
    const detail = await getInvoiceDetail(invoiceId);
    expect(detail!.payments).toHaveLength(2);
    expect(detail!.payments.map(p => p.payment.amountCents)).toEqual([400000, 532000]);
    expect(detail!.payments[0].payment.reference).toBe("ABC123");
    expect(detail!.payments[0].recorderName).toBeTruthy();
  });

  it("duplicates a paid invoice as a fresh draft with a new number and no payments", async () => {
    const { duplicateInvoiceAction } = await import("@/lib/invoices/actions");
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const [source] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

    await expect(duplicateInvoiceAction({}, fd({ invoiceId }))).rejects.toThrow("REDIRECT");
    const [copy] = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(1);

    expect(copy.id).not.toBe(source.id);
    expect(copy.invoiceNumber).not.toBe(source.invoiceNumber);
    expect(copy.status).toBe("DRAFT");
    expect(copy.amountPaidCents).toBe(0);
    expect(copy.balanceDueCents).toBe(copy.totalCents);
    expect(copy.sentAt).toBeNull();
    expect(copy.secureTokenHash).toBeNull();
    // Terms and line items carry over.
    expect(copy.totalCents).toBe(source.totalCents);
    expect(copy.poNumber).toBe(source.poNumber);
  });

  it("voids an invoice with a reason and blocks further payment", async () => {
    const { saveInvoiceAction, voidInvoiceAction, recordPaymentAction } = await import("@/lib/invoices/actions");
    const { db } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");

    await expect(saveInvoiceAction({}, fd({
      clientId, invoiceDate: "2026-09-04", dueDate: "2026-10-04", taxRateBasisPoints: "0",
      itemDescription: ["To be voided"], itemQuantity: ["1"], itemRate: ["500"],
    }))).rejects.toThrow("REDIRECT");
    const [target] = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(1);
    await db.update(invoices).set({ status: "SENT" }).where(eq(invoices.id, target.id));

    expect((await voidInvoiceAction({}, fd({ invoiceId: target.id }))).error).toBeDefined(); // reason required
    expect((await voidInvoiceAction({}, fd({ invoiceId: target.id, reason: "Issued to the wrong agency" }))).success).toBeDefined();

    const [voided] = await db.select().from(invoices).where(eq(invoices.id, target.id));
    expect(voided.status).toBe("VOID");
    expect(voided.voidReason).toBe("Issued to the wrong agency");
    expect(voided.voidedBy).toBe(SUPER);
    expect(voided.secureTokenHash).toBeNull(); // client link revoked
    expect((await recordPaymentAction({}, fd({
      invoiceId: target.id, amountCents: "10", paidOn: "2026-09-12", method: "ACH",
    }))).error).toContain("void");
  });

  it("records a complete audit trail for the money events", async () => {
    const { db } = await import("@/db");
    const { auditLogs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const actions = (await db.select().from(auditLogs).where(eq(auditLogs.entityId, invoiceId))).map(a => a.action);
    for (const expected of ["INVOICE_CREATED", "PAYMENT_RECORDED"]) {
      expect(actions, expected).toContain(expected);
    }
    const [payment] = await db.select().from(auditLogs).where(eq(auditLogs.action, "PAYMENT_RECORDED"));
    // Financial audit entries carry before/after values.
    expect(payment.metadata).toMatchObject({ previousBalanceCents: expect.any(Number), newBalanceCents: expect.any(Number) });
  });

  it("denies every invoice path to a role without the permission", async () => {
    state.id = RECRUITER; state.role = "RECRUITER";
    const { listInvoices, invoiceDashboard, getInvoiceDetail } = await import("@/lib/invoices/data");
    const { saveInvoiceAction, recordPaymentAction } = await import("@/lib/invoices/actions");
    await expect(listInvoices({})).rejects.toThrow("NOT_FOUND");
    await expect(invoiceDashboard()).rejects.toThrow("NOT_FOUND");
    await expect(getInvoiceDetail(invoiceId)).rejects.toThrow("NOT_FOUND");
    await expect(saveInvoiceAction({}, fd({
      clientId, invoiceDate: "2026-09-05", dueDate: "2026-10-05", taxRateBasisPoints: "0",
      itemDescription: ["x"], itemQuantity: ["1"], itemRate: ["1"],
    }))).rejects.toThrow("NOT_FOUND");
    await expect(recordPaymentAction({}, fd({
      invoiceId, amountCents: "1", paidOn: "2026-09-05", method: "ACH",
    }))).rejects.toThrow("NOT_FOUND");
    state.id = SUPER; state.role = "SUPER_ADMIN";
  });
});
