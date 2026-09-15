import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, clients } from "@/db/schema";
import type { InvoiceDocumentInput } from "./render-html";
import { getInvoiceSettings } from "./data";
import { site, contact } from "@/lib/site";

/** Assembles the document input for an invoice, shared by preview, PDF and send. */
export async function buildInvoiceDocument(invoiceId: string): Promise<InvoiceDocumentInput | null> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) return null;
  const [items, settings] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(invoiceItems.position),
    getInvoiceSettings(),
  ]);
  const client = invoice.clientId
    ? (await db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1))[0]
    : undefined;

  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    // Prefer the frozen snapshot so an issued invoice never changes when the
    // client record is later edited; fall back to live data for a fresh draft.
    billTo: invoice.billingSnapshot ?? (client ? {
      companyName: client.companyName, contactName: client.contactName, email: client.email,
      phone: client.phone, billingAddress: client.billingAddress, agency: client.agency,
    } : null),
    references: {
      poNumber: invoice.poNumber, contractNumber: invoice.contractNumber, taskOrder: invoice.taskOrder,
      projectName: invoice.projectName, periodOfPerformance: invoice.periodOfPerformance,
    },
    items,
    subtotalCents: invoice.subtotalCents, discountCents: invoice.discountCents,
    taxCents: invoice.taxCents, additionalChargesCents: invoice.additionalChargesCents,
    totalCents: invoice.totalCents, amountPaidCents: invoice.amountPaidCents,
    balanceDueCents: invoice.balanceDueCents, taxRateBasisPoints: invoice.taxRateBasisPoints,
    paymentTerms: invoice.paymentTerms,
    notes: invoice.notes,
    paymentInstructions: settings.paymentInstructions,
    from: {
      legalName: settings.legalName || site.legalName,
      billingAddress: settings.billingAddress || contact.address,
      email: settings.billingEmail || contact.emailGeneral,
      phone: settings.billingPhone || contact.phone,
      taxId: settings.taxId,
    },
  };
}

