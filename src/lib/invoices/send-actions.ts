"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, auditLogs } from "@/db/schema";
import { requireInvoice } from "./access";
import { renderInvoiceHtml } from "./render-html";
import { pdfFooterTemplate } from "@/lib/documents/chrome";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { buildInvoicePdfPath, uploadInvoicePdf } from "@/lib/storage/invoices";
import { generateInvoiceToken, hashInvoiceToken } from "./tokens";
import { invoiceEmail, invoiceReminderEmail } from "./email-templates";
import { sendInvoiceSchema } from "./validation";
import { canSendInvoice, clientCanView, type InvoiceStatus } from "./policy";
import { buildInvoiceDocument } from "./document";
import { send } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import type { InvoiceActionState } from "./actions";

/** Prepare a PDF from one revision, then refuse to store it if that revision changed. */
async function preparePdf(invoiceId: string, adminId: string) {
  const [before] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!before) throw new Error("Invoice not found.");
  const doc = await buildInvoiceDocument(invoiceId);
  if (!doc) throw new Error("Invoice not found.");
  // Once issued, company/client edits cannot rewrite the original invoice.
  const html = before.documentHtml ?? renderInvoiceHtml(doc);
  if (before.pdfStoragePath && (before.documentHtml || before.status !== "DRAFT")) return { doc, revision: before.updatedAt, html };
  const pdf = await renderOfferPdf(html, { footerTemplate: pdfFooterTemplate(doc.invoiceNumber) });
  const path = buildInvoicePdfPath(invoiceId);
  await uploadInvoicePdf({ path, body: pdf });
  const revision = await db.transaction(async tx => {
    const [current] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
    if (!current || current.updatedAt.getTime() !== before.updatedAt.getTime()) throw new Error("The invoice changed while preparing the PDF. Review it and try again.");
    const updatedAt = new Date();
    await tx.update(invoices).set({ pdfStoragePath: path, documentHtml: html, updatedAt }).where(eq(invoices.id, invoiceId));
    await tx.insert(auditLogs).values({ adminId, action: "INVOICE_PDF_GENERATED", entityType: "invoice", entityId: invoiceId, metadata: { invoiceNumber: doc.invoiceNumber, path } });
    return updatedAt;
  });
  return { doc, revision, html };
}

export async function generateInvoicePdfAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin } = await requireInvoice(invoiceId);
  try { await preparePdf(invoiceId, admin.id); }
  catch { return { error: "Could not generate the PDF. If the invoice changed, review it and try again." }; }
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: "PDF ready." };
}

async function deliverInvoice(form: FormData, reminder: boolean): Promise<InvoiceActionState> {
  const invoiceId = String(form.get("invoiceId") ?? "");
  const { admin, invoice } = await requireInvoice(invoiceId);
  const values = reminder
    ? z.object({ to: z.email().max(255), requestKey: z.uuid(), subject: z.string().optional(), message: z.string().optional() }).safeParse(Object.fromEntries(form))
    : sendInvoiceSchema.safeParse(Object.fromEntries(form));
  if (!values.success) return { error: values.error.issues[0]?.message ?? "Reload the invoice and check the recipient." };
  const v = values.data;
  if (reminder ? !clientCanView(invoice.status as InvoiceStatus) || invoice.balanceDueCents <= 0 : !canSendInvoice(invoice.status as InvoiceStatus)) return { error: "This invoice cannot be sent in its current state." };
  let delivered = false;
  try {
    const prepared = await preparePdf(invoiceId, admin.id);
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
      if (!locked || locked.updatedAt.getTime() !== prepared.revision.getTime()) throw new Error("The invoice changed. Review it before sending.");
      if (reminder ? !clientCanView(locked.status as InvoiceStatus) || locked.balanceDueCents <= 0 : !canSendInvoice(locked.status as InvoiceStatus)) throw new Error("This invoice can no longer be sent.");
      const [duplicate] = await tx.select({ id: auditLogs.id }).from(auditLogs).where(and(eq(auditLogs.entityId, invoiceId), sql`${auditLogs.metadata}->>'requestKey' = ${v.requestKey}`, eq(auditLogs.action, "INVOICE_SENT"))).limit(1);
      if (duplicate) throw new Error("This message was already sent. Reload the invoice to send another.");
      const token = generateInvoiceToken();
      const invoiceUrl = `${serverEnv().appUrl.replace(/\/$/, "")}/invoice/${token}`;
      const dueEnd = new Date(locked.dueDate); dueEnd.setUTCHours(23,59,59,999);
      const common = { invoiceNumber: locked.invoiceNumber, clientName: prepared.doc.billTo?.companyName ?? "Hello",
        balanceDueCents: locked.balanceDueCents, currency: locked.currency, dueDate: locked.dueDate, invoiceUrl };
      const message = reminder ? invoiceReminderEmail({ ...common, overdue: dueEnd < new Date() })
        : invoiceEmail({ ...common, totalCents: locked.totalCents, message: v.message });
      const result = await send({ to: v.to, ...message, subject: v.subject || message.subject });
      delivered = result.sent;
      if (!delivered) {
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "INVOICE_EMAIL_FAILED", entityType: "invoice", entityId: invoiceId, metadata: { reminder, reason: result.reason } });
        return;
      }
      await tx.update(invoices).set({ status: locked.status === "DRAFT" ? "SENT" : locked.status,
        sentAt: locked.sentAt ?? new Date(), sentBy: admin.id, secureTokenHash: hashInvoiceToken(token),
        tokenExpiresAt: new Date(Math.max(Date.now(), dueEnd.getTime()) + 90 * 86400000), updatedAt: new Date(),
      }).where(eq(invoices.id, invoiceId));
      await tx.insert(auditLogs).values({ adminId: admin.id, action: "INVOICE_SENT", entityType: "invoice", entityId: invoiceId,
        metadata: { invoiceNumber: locked.invoiceNumber, to: v.to, requestKey: v.requestKey, reminder, pdfPath: locked.pdfStoragePath } });
    });
  } catch (error) {
    return { error: delivered ? "Email was accepted by the provider but recording delivery failed. Check delivery before retrying." : error instanceof Error && !("query" in error) ? error.message : "Could not send the invoice. Please try again." };
  }
  revalidatePath("/admin", "layout");
  return delivered ? { success: reminder ? "Reminder sent." : "Invoice sent." }
    : { error: "Email was not sent. The invoice status and existing client link are unchanged; check email configuration and retry." };
}

export async function sendInvoiceAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  return deliverInvoice(form, false);
}
export async function sendInvoiceReminderAction(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  return deliverInvoice(form, true);
}
