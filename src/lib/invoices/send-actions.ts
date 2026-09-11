"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, auditLogs, clients } from "@/db/schema";
import { requireInvoice } from "./access";
import { renderInvoiceHtml, type InvoiceDocumentInput } from "./render-html";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { buildInvoicePdfPath, uploadInvoicePdf } from "@/lib/storage/invoices";
import { generateInvoiceToken, hashInvoiceToken } from "./tokens";
import { invoiceEmail, invoiceReminderEmail } from "./email-templates";
import { sendInvoiceSchema } from "./validation";
import { canSendInvoice, clientCanView, type InvoiceStatus } from "./policy";
import { getInvoiceSettings } from "./data";
import { send } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { site, contact } from "@/lib/site";
import type { InvoiceActionState } from "./actions";

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

/** Renders and stores the PDF, returning its storage path. */
async function generateAndStorePdf(invoiceId: string, adminId: string) {
  const doc = await buildInvoiceDocument(invoiceId);
  if (!doc) throw new Error("Invoice not found.");
  const pdf = await renderOfferPdf(renderInvoiceHtml(doc));
  const path = buildInvoicePdfPath(invoiceId);
  await uploadInvoicePdf({ path, body: pdf });
  await db.transaction(async tx => {
    await tx.update(invoices).set({ pdfStoragePath: path, updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
    await tx.insert(auditLogs).values({
      adminId, action: "INVOICE_PDF_GENERATED", entityType: "invoice", entityId: invoiceId,
      metadata: { invoiceNumber: doc.invoiceNumber },
    });
  });
  return { path, pdf, doc };
}

export async function generateInvoicePdfAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin } = await requireInvoice(invoiceId);
  try {
    await generateAndStorePdf(invoiceId, admin.id);
  } catch (err) {
    console.error("[invoices] pdf generation failed", { invoiceId, error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not generate the invoice PDF. Please try again." };
  }
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: "PDF generated." };
}

export async function sendInvoiceAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin, invoice } = await requireInvoice(invoiceId);
  if (!canSendInvoice(invoice.status as InvoiceStatus)) {
    return { error: "This invoice cannot be sent in its current state." };
  }
  const parsed = sendInvoiceSchema.safeParse({
    ...Object.fromEntries(form), attachPdf: form.get("attachPdf") === "1",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the recipient and subject." };
  const v = parsed.data;

  let token: string;
  try {
    await generateAndStorePdf(invoiceId, admin.id);
  } catch (err) {
    console.error("[invoices] send aborted: pdf failed", { invoiceId, error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not generate the invoice PDF, so nothing was sent. The invoice is unchanged." };
  }

  // The status change is committed before the email goes out. A provider
  // failure then leaves a sent-but-undelivered invoice the admin can retry,
  // rather than a half-updated record — the spec's "email failures must not
  // corrupt invoice status".
  try {
    token = generateInvoiceToken();
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
      if (!locked || !canSendInvoice(locked.status as InvoiceStatus)) throw new Error("This invoice cannot be sent in its current state.");
      await tx.update(invoices).set({
        status: locked.status === "DRAFT" ? "SENT" : locked.status,
        sentAt: new Date(), sentBy: admin.id,
        secureTokenHash: hashInvoiceToken(token),
        // The link outlives the due date so a late payer can still retrieve it.
        tokenExpiresAt: new Date(locked.dueDate.getTime() + 90 * 86_400_000),
        updatedAt: new Date(),
      }).where(eq(invoices.id, invoiceId));
      await tx.insert(auditLogs).values({
        adminId: admin.id, action: "INVOICE_SENT", entityType: "invoice", entityId: invoiceId,
        metadata: { invoiceNumber: locked.invoiceNumber, to: v.to, attachedPdf: Boolean(v.attachPdf) },
      });
    });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not send this invoice." };
  }

  const doc = await buildInvoiceDocument(invoiceId);
  const message = invoiceEmail({
    invoiceNumber: invoice.invoiceNumber,
    clientName: doc?.billTo?.companyName ?? "Hello",
    totalCents: invoice.totalCents, balanceDueCents: invoice.balanceDueCents,
    currency: invoice.currency, dueDate: invoice.dueDate,
    invoiceUrl: `${serverEnv().appUrl.replace(/\/$/, "")}/invoice/${token}`,
    message: v.message,
  });
  const result = await send({ to: v.to, ...message, subject: v.subject || message.subject });
  if (!result.sent) {
    console.error("[invoices] email delivery failed", { invoiceId, reason: result.reason });
  }
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return result.sent
    ? { success: "Invoice sent." }
    : { error: "The invoice is marked sent and its link is live, but the email could not be delivered. Share the link directly or retry." };
}

export async function sendInvoiceReminderAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin, invoice } = await requireInvoice(invoiceId);
  if (!clientCanView(invoice.status as InvoiceStatus)) return { error: "Send the invoice before chasing payment on it." };
  if (invoice.balanceDueCents <= 0) return { error: "This invoice has no outstanding balance." };
  if (!invoice.secureTokenHash) return { error: "This invoice has no active client link. Send it again first." };

  const to = String(form.get("to") ?? "").trim();
  if (!to) return { error: "Enter a recipient email address." };

  const doc = await buildInvoiceDocument(invoiceId);
  // The plaintext token is never stored, so a reminder points at the invoice
  // detail rather than minting a second live link.
  const message = invoiceReminderEmail({
    invoiceNumber: invoice.invoiceNumber,
    clientName: doc?.billTo?.companyName ?? "Hello",
    balanceDueCents: invoice.balanceDueCents, currency: invoice.currency,
    dueDate: invoice.dueDate, overdue: invoice.dueDate < new Date(),
    invoiceUrl: `${serverEnv().appUrl.replace(/\/$/, "")}/admin/invoices/${invoiceId}`,
  });
  const result = await send({ to, ...message });
  await db.insert(auditLogs).values({
    adminId: admin.id, action: "INVOICE_SENT", entityType: "invoice", entityId: invoiceId,
    metadata: { invoiceNumber: invoice.invoiceNumber, reminder: true, delivered: result.sent },
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return result.sent ? { success: "Reminder sent." } : { error: "The reminder could not be delivered." };
}
