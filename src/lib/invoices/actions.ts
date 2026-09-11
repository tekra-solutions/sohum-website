"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  invoices, invoiceItems, invoicePayments, invoiceSettings, clients, auditLogs,
} from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { requireInvoice } from "./access";
import type { AuditAction } from "@/lib/audit";
import { computeTotals } from "./money";
import {
  canEditInvoice, canRecordPayment, canReopenToDraft, canVoidInvoice,
  formatInvoiceNumber, type InvoiceStatus,
} from "./policy";
import {
  clientSchema, invoiceInputSchema, paymentSchema, voidSchema, invoiceSettingsSchema,
} from "./validation";

export type InvoiceActionState = { error?: string; success?: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function record(tx: Tx, adminId: string, invoiceId: string, action: AuditAction, metadata?: Record<string, unknown>) {
  await tx.insert(auditLogs).values({ adminId, entityType: "invoice", entityId: invoiceId, action, metadata });
}

function refresh(id?: string) {
  revalidatePath("/admin/invoices");
  if (id) revalidatePath(`/admin/invoices/${id}`);
}

/** Ensures the settings singleton exists, returning it. */
async function loadSettings(tx: Tx) {
  const [existing] = await tx.select().from(invoiceSettings).where(eq(invoiceSettings.id, 1)).for("update");
  if (existing) return existing;
  const [created] = await tx.insert(invoiceSettings)
    .values({ id: 1, sequenceYear: new Date().getUTCFullYear() })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [row] = await tx.select().from(invoiceSettings).where(eq(invoiceSettings.id, 1)).for("update");
  return row!;
}

/**
 * Allocates the next invoice number under the settings row lock taken by
 * loadSettings(), so two admins creating invoices at the same moment cannot
 * receive the same number. The unique index on invoice_number is the
 * backstop if anything ever bypasses this path.
 */
async function nextInvoiceNumber(tx: Tx) {
  const settings = await loadSettings(tx);
  const year = new Date().getUTCFullYear();
  const sequence = settings.sequenceYear === year ? settings.nextSequence : 1;
  await tx.update(invoiceSettings)
    .set({ nextSequence: sequence + 1, sequenceYear: year, updatedAt: new Date() })
    .where(eq(invoiceSettings.id, 1));
  return { number: formatInvoiceNumber(settings.invoicePrefix, year, sequence), settings };
}

/** Snapshots billing details onto the invoice so later client edits cannot
 *  rewrite an already-issued document. */
function billingSnapshotFrom(client: typeof clients.$inferSelect | undefined) {
  if (!client) return null;
  return {
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    phone: client.phone,
    billingAddress: client.billingAddress,
    agency: client.agency,
  };
}

export async function saveClientAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const admin = await requirePermission("invoices");
  const parsed = clientSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const id = String(form.get("id") ?? "");
  const editing = Boolean(id) && z.uuid().safeParse(id).success;
  try {
    await db.transaction(async tx => {
      if (editing) {
        await tx.update(clients).set({ ...parsed.data, updatedAt: new Date() }).where(eq(clients.id, id));
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "CLIENT_UPDATED", entityType: "client", entityId: id });
      } else {
        const [row] = await tx.insert(clients).values({ ...parsed.data, createdBy: admin.id }).returning({ id: clients.id });
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "CLIENT_CREATED", entityType: "client", entityId: row!.id });
      }
    });
  } catch (err) {
    console.error("[invoices] client save failed", { error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not save this client. Please try again." };
  }
  revalidatePath("/admin/invoices/clients");
  revalidatePath("/admin/invoices/new");
  return { success: editing ? "Client updated." : "Client created." };
}

/** Parses the repeated item_* form fields into ordered line items. */
function itemsFromForm(form: FormData) {
  const descriptions = form.getAll("itemDescription").map(String);
  const quantities = form.getAll("itemQuantity").map(String);
  const rates = form.getAll("itemRate").map(String);
  const periods = form.getAll("itemPeriod").map(String);
  const consultants = form.getAll("itemConsultant").map(String);
  const projects = form.getAll("itemProject").map(String);
  return descriptions
    .map((description, i) => ({
      description,
      quantityMilli: quantities[i] ?? "",
      rateCents: rates[i] ?? "",
      servicePeriod: periods[i] || undefined,
      consultantName: consultants[i] || undefined,
      projectRef: projects[i] || undefined,
    }))
    // A blank trailing row is the natural result of the "add row" affordance;
    // drop it rather than failing validation on the user's behalf.
    .filter(item => item.description.trim() !== "" || String(item.quantityMilli).trim() !== "" || String(item.rateCents).trim() !== "");
}

export async function saveInvoiceAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const admin = await requirePermission("invoices");
  const invoiceId = String(form.get("invoiceId") ?? "");
  const editing = Boolean(invoiceId) && z.uuid().safeParse(invoiceId).success;

  const parsed = invoiceInputSchema.safeParse({ ...Object.fromEntries(form), items: itemsFromForm(form) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const v = parsed.data;

  // Totals are always derived here, never read from the browser.
  const totals = computeTotals({
    items: v.items.map(i => ({ quantityMilli: i.quantityMilli, rateCents: i.rateCents })),
    discountCents: v.discountCents,
    taxRateBasisPoints: v.taxRateBasisPoints,
    additionalChargesCents: v.additionalChargesCents,
  });

  let savedId = invoiceId;
  try {
    await db.transaction(async tx => {
      const client = v.clientId
        ? (await tx.select().from(clients).where(eq(clients.id, v.clientId)).limit(1))[0]
        : undefined;
      if (v.clientId && !client) throw new Error("That client no longer exists.");

      const shared = {
        clientId: v.clientId ?? null,
        invoiceDate: v.invoiceDate,
        dueDate: v.dueDate,
        poNumber: v.poNumber ?? null,
        contractNumber: v.contractNumber ?? null,
        taskOrder: v.taskOrder ?? null,
        projectName: v.projectName ?? null,
        periodOfPerformance: v.periodOfPerformance ?? null,
        paymentTerms: v.paymentTerms ?? null,
        notes: v.notes ?? null,
        taxRateBasisPoints: v.taxRateBasisPoints,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        additionalChargesCents: totals.additionalChargesCents,
        totalCents: totals.totalCents,
        billingSnapshot: billingSnapshotFrom(client),
        updatedAt: new Date(),
      };

      if (editing) {
        const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
        if (!existing) throw new Error("Invoice not found.");
        if (!canEditInvoice(existing.status as InvoiceStatus)) {
          throw new Error("Only a draft invoice can be edited. Return it to draft first if it needs material changes.");
        }
        // Balance follows the recomputed total, keeping any payments intact.
        const balance = totals.totalCents - existing.amountPaidCents;
        await tx.update(invoices).set({ ...shared, balanceDueCents: balance }).where(eq(invoices.id, invoiceId));
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        await record(tx, admin.id, invoiceId, "INVOICE_UPDATED", { totalCents: totals.totalCents });
      } else {
        const { number, settings } = await nextInvoiceNumber(tx);
        const [row] = await tx.insert(invoices).values({
          ...shared,
          invoiceNumber: number,
          currency: settings.defaultCurrency,
          paymentTerms: v.paymentTerms ?? settings.defaultPaymentTerms,
          notes: v.notes ?? settings.defaultNotes ?? null,
          amountPaidCents: 0,
          balanceDueCents: totals.totalCents,
          createdBy: admin.id,
        }).returning({ id: invoices.id });
        savedId = row!.id;
        await record(tx, admin.id, savedId, "INVOICE_CREATED", { invoiceNumber: number, totalCents: totals.totalCents });
      }

      await tx.insert(invoiceItems).values(v.items.map((item, index) => ({
        invoiceId: savedId,
        position: index,
        description: item.description,
        quantityMilli: item.quantityMilli,
        rateCents: item.rateCents,
        amountCents: computeTotals({ items: [{ quantityMilli: item.quantityMilli, rateCents: item.rateCents }] }).subtotalCents,
        servicePeriod: item.servicePeriod ?? null,
        consultantName: item.consultantName ?? null,
        projectRef: item.projectRef ?? null,
      })));
    });
  } catch (err) {
    console.error("[invoices] save failed", { error: err instanceof Error ? err.message : String(err) });
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not save this invoice. Please try again." };
  }
  refresh(savedId);
  redirect(`/admin/invoices/${savedId}`);
}

export async function recordPaymentAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin } = await requireInvoice(invoiceId);
  const parsed = paymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const v = parsed.data;

  try {
    await db.transaction(async tx => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
      if (!invoice) throw new Error("Invoice not found.");
      if (!canRecordPayment(invoice.status as InvoiceStatus)) {
        throw new Error(invoice.status === "VOID"
          ? "A void invoice cannot accept payments."
          : invoice.status === "DRAFT"
            ? "Send the invoice before recording a payment against it."
            : "This invoice is already paid in full.");
      }
      // Overpayment is refused rather than silently creating a credit.
      if (v.amountCents > invoice.balanceDueCents) {
        throw new Error(`That payment exceeds the outstanding balance. At most ${(invoice.balanceDueCents / 100).toFixed(2)} can be applied.`);
      }

      await tx.insert(invoicePayments).values({
        invoiceId, amountCents: v.amountCents, paidOn: v.paidOn, method: v.method,
        reference: v.reference ?? null, notes: v.notes ?? null, recordedBy: admin.id,
      });

      const amountPaid = invoice.amountPaidCents + v.amountCents;
      const balance = invoice.totalCents - amountPaid;
      const status: InvoiceStatus = balance <= 0 ? "PAID" : "PARTIALLY_PAID";
      await tx.update(invoices).set({
        amountPaidCents: amountPaid,
        balanceDueCents: balance,
        status,
        paidAt: balance <= 0 ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(invoices.id, invoiceId));

      await record(tx, admin.id, invoiceId, "PAYMENT_RECORDED", {
        amountCents: v.amountCents, method: v.method,
        previousBalanceCents: invoice.balanceDueCents, newBalanceCents: balance, newStatus: status,
      });
    });
  } catch (err) {
    console.error("[invoices] payment failed", { error: err instanceof Error ? err.message : String(err) });
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not record this payment." };
  }
  refresh(invoiceId);
  return { success: "Payment recorded." };
}

export async function voidInvoiceAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin } = await requireInvoice(invoiceId);
  const parsed = voidSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "A reason is required." };

  try {
    await db.transaction(async tx => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
      if (!invoice || !canVoidInvoice(invoice.status as InvoiceStatus)) throw new Error("This invoice is already void.");
      await tx.update(invoices).set({
        status: "VOID", voidedAt: new Date(), voidedBy: admin.id,
        voidReason: parsed.data.reason,
        // Kill the client link: a voided invoice must stop resolving.
        secureTokenHash: null, tokenExpiresAt: null,
        updatedAt: new Date(),
      }).where(eq(invoices.id, invoiceId));
      await record(tx, admin.id, invoiceId, "INVOICE_VOIDED", {
        reason: parsed.data.reason, previousStatus: invoice.status, balanceAtVoidCents: invoice.balanceDueCents,
      });
    });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not void this invoice." };
  }
  refresh(invoiceId);
  return { success: "Invoice voided." };
}

/** Returns a sent invoice to draft so it can be corrected, with an audit
 *  trail. Refused once money has been received or the invoice is void. */
export async function reopenInvoiceAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin } = await requireInvoice(invoiceId);
  try {
    await db.transaction(async tx => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
      if (!invoice || !canReopenToDraft(invoice.status as InvoiceStatus)) throw new Error("This invoice cannot be returned to draft.");
      if (invoice.amountPaidCents > 0) throw new Error("Payments have been recorded against this invoice, so it cannot be returned to draft.");
      await tx.update(invoices).set({
        status: "DRAFT", secureTokenHash: null, tokenExpiresAt: null, sentAt: null, sentBy: null, updatedAt: new Date(),
      }).where(eq(invoices.id, invoiceId));
      await record(tx, admin.id, invoiceId, "INVOICE_REOPENED", { previousStatus: invoice.status });
    });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not reopen this invoice." };
  }
  refresh(invoiceId);
  return { success: "Invoice returned to draft." };
}

/** Copies client, line items, terms and notes onto a fresh DRAFT. Never
 *  copies the number, payments, sent state or tokens. */
export async function duplicateInvoiceAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin } = await requireInvoice(invoiceId);
  let newId = "";
  try {
    await db.transaction(async tx => {
      const [source] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!source) throw new Error("Invoice not found.");
      const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(invoiceItems.position);
      const { number, settings } = await nextInvoiceNumber(tx);

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate.getTime() + Math.max(0, source.dueDate.getTime() - source.invoiceDate.getTime()));

      const [row] = await tx.insert(invoices).values({
        invoiceNumber: number,
        clientId: source.clientId,
        status: "DRAFT",
        invoiceDate, dueDate,
        currency: source.currency || settings.defaultCurrency,
        subtotalCents: source.subtotalCents,
        discountCents: source.discountCents,
        taxCents: source.taxCents,
        additionalChargesCents: source.additionalChargesCents,
        totalCents: source.totalCents,
        taxRateBasisPoints: source.taxRateBasisPoints,
        amountPaidCents: 0,
        balanceDueCents: source.totalCents,
        poNumber: source.poNumber, contractNumber: source.contractNumber,
        taskOrder: source.taskOrder, projectName: source.projectName,
        periodOfPerformance: source.periodOfPerformance,
        paymentTerms: source.paymentTerms, notes: source.notes,
        billingSnapshot: source.billingSnapshot,
        createdBy: admin.id,
      }).returning({ id: invoices.id });
      newId = row!.id;

      if (items.length) {
        await tx.insert(invoiceItems).values(items.map(item => ({
          invoiceId: newId, position: item.position, description: item.description,
          quantityMilli: item.quantityMilli, rateCents: item.rateCents, amountCents: item.amountCents,
          servicePeriod: item.servicePeriod, consultantName: item.consultantName, projectRef: item.projectRef,
        })));
      }
      await record(tx, admin.id, newId, "INVOICE_DUPLICATED", { sourceInvoiceId: invoiceId, sourceNumber: source.invoiceNumber, invoiceNumber: number });
    });
  } catch (err) {
    console.error("[invoices] duplicate failed", { error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not duplicate this invoice." };
  }
  refresh(newId);
  redirect(`/admin/invoices/${newId}`);
}

export async function saveInvoiceSettingsAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const admin = await requirePermission("settings");
  const parsed = invoiceSettingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  try {
    await db.transaction(async tx => {
      await loadSettings(tx);
      await tx.update(invoiceSettings).set({ ...parsed.data, updatedAt: new Date() }).where(eq(invoiceSettings.id, 1));
      await tx.insert(auditLogs).values({ adminId: admin.id, action: "INVOICE_SETTINGS_SAVED", entityType: "invoice_settings", entityId: "1" });
    });
  } catch (err) {
    console.error("[invoices] settings save failed", { error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not save invoice settings." };
  }
  revalidatePath("/admin/settings/invoice-settings");
  return { success: "Invoice settings saved." };
}

