import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, invoicePayments, clients, admins, invoiceSettings } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { positivePage } from "@/lib/ats/policy";
import { invoiceStatuses } from "./policy";

export type InvoiceFilters = {
  q?: string; status?: string; clientId?: string;
  from?: string; to?: string; dueFrom?: string; dueTo?: string;
  page?: number;
};

export async function listInvoices(f: InvoiceFilters) {
  await requirePermission("invoices");
  const page = positivePage(f.page);
  const pageSize = 25;

  const where = [];
  if (f.status && (invoiceStatuses as readonly string[]).includes(f.status)) {
    where.push(eq(invoices.status, f.status as (typeof invoiceStatuses)[number]));
  }
  if (f.clientId) where.push(eq(invoices.clientId, f.clientId));
  // Typed operators throughout — never a raw sql`` template with a bare Date.
  if (f.from && !isNaN(Date.parse(f.from))) where.push(gte(invoices.invoiceDate, new Date(f.from)));
  if (f.to && !isNaN(Date.parse(f.to))) {
    const end = new Date(f.to); end.setUTCHours(23, 59, 59, 999);
    where.push(lte(invoices.invoiceDate, end));
  }
  if (f.dueFrom && !isNaN(Date.parse(f.dueFrom))) where.push(gte(invoices.dueDate, new Date(f.dueFrom)));
  if (f.dueTo && !isNaN(Date.parse(f.dueTo))) {
    const end = new Date(f.dueTo); end.setUTCHours(23, 59, 59, 999);
    where.push(lte(invoices.dueDate, end));
  }
  if (f.q?.trim()) {
    const term = `%${f.q.trim().slice(0, 200)}%`;
    where.push(or(
      ilike(invoices.invoiceNumber, term),
      ilike(clients.companyName, term),
      ilike(clients.email, term),
      sql`${invoices.billingSnapshot}->>'companyName' ilike ${term}`,
    )!);
  }
  const clause = where.length ? and(...where) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db.select({ invoice: invoices, clientName: clients.companyName, creatorName: admins.name })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(admins, eq(invoices.createdBy, admins.id))
      .where(clause)
      .orderBy(desc(invoices.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ n: count() }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).where(clause),
  ]);
  const total = totalRow?.n ?? 0;
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getInvoiceDetail(id: string) {
  await requirePermission("invoices");
  const [row] = await db.select({ invoice: invoices, clientName: clients.companyName, creatorName: admins.name })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(admins, eq(invoices.createdBy, admins.id))
    .where(eq(invoices.id, id)).limit(1);
  if (!row) return null;
  const [items, payments] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.position)),
    db.select({ payment: invoicePayments, recorderName: admins.name })
      .from(invoicePayments)
      .leftJoin(admins, eq(invoicePayments.recordedBy, admins.id))
      .where(eq(invoicePayments.invoiceId, id))
      .orderBy(asc(invoicePayments.paidOn)),
  ]);
  return { ...row, items, payments };
}

export async function listClients() {
  await requirePermission("invoices");
  return db.select().from(clients).where(eq(clients.isActive, true)).orderBy(asc(clients.companyName));
}

/** Settings for display. Falls back to defaults when the row is absent so a
 *  fresh install renders rather than erroring. */
export async function getInvoiceSettings() {
  const [row] = await db.select().from(invoiceSettings).where(eq(invoiceSettings.id, 1)).limit(1);
  return row ?? {
    id: 1, invoicePrefix: "SOH", nextSequence: 1, sequenceYear: new Date().getUTCFullYear(),
    defaultPaymentTerms: "Net 30", defaultNotes: null, paymentInstructions: null,
    defaultCurrency: "USD", defaultTaxRateBasisPoints: 0,
    legalName: null, billingAddress: null, billingEmail: null, billingPhone: null, taxId: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
}

/**
 * Invoice dashboard figures. Overdue is computed from the date and balance
 * rather than the stored status, so an invoice becomes overdue on its own
 * without anything having to touch the row.
 */
export async function invoiceDashboard() {
  await requirePermission("invoices");
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1); startOfMonth.setUTCHours(0, 0, 0, 0);

  const [summary] = await db.select({
    outstandingCents: sql<number>`coalesce(sum(${invoices.balanceDueCents}) filter (where ${invoices.status} not in ('DRAFT','VOID','PAID')), 0)::bigint`,
    overdueCents: sql<number>`coalesce(sum(${invoices.balanceDueCents}) filter (where ${invoices.status} not in ('DRAFT','VOID','PAID') and ${invoices.dueDate} < now() and ${invoices.balanceDueCents} > 0), 0)::bigint`,
    draftCount: sql<number>`count(*) filter (where ${invoices.status} = 'DRAFT')::int`,
    overdueCount: sql<number>`count(*) filter (where ${invoices.status} not in ('DRAFT','VOID','PAID') and ${invoices.dueDate} < now() and ${invoices.balanceDueCents} > 0)::int`,
  }).from(invoices);

  const [paid] = await db.select({
    paidThisMonthCents: sql<number>`coalesce(sum(${invoicePayments.amountCents}), 0)::bigint`,
  }).from(invoicePayments).where(gte(invoicePayments.paidOn, startOfMonth));

  const [recent, attention] = await Promise.all([
    db.select({ invoice: invoices, clientName: clients.companyName })
      .from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id))
      .orderBy(desc(invoices.createdAt)).limit(8),
    db.select({ invoice: invoices, clientName: clients.companyName })
      .from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(or(
        and(sql`${invoices.status} not in ('DRAFT','VOID','PAID')`, sql`${invoices.dueDate} < now()`, sql`${invoices.balanceDueCents} > 0`),
        and(sql`${invoices.status} not in ('DRAFT','VOID','PAID')`, sql`${invoices.dueDate} < now() + interval '3 days'`, sql`${invoices.balanceDueCents} > 0`),
        eq(invoices.status, "DRAFT"),
      ))
      .orderBy(asc(invoices.dueDate)).limit(12),
  ]);

  return {
    outstandingCents: Number(summary?.outstandingCents ?? 0),
    overdueCents: Number(summary?.overdueCents ?? 0),
    paidThisMonthCents: Number(paid?.paidThisMonthCents ?? 0),
    draftCount: summary?.draftCount ?? 0,
    overdueCount: summary?.overdueCount ?? 0,
    recent, attention,
  };
}
