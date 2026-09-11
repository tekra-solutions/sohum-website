import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "ADMIN_LOGIN"
  | "ADMIN_LOGIN_FAILED"
  | "ADMIN_LOGOUT"
  | "ADMIN_CREATED_JOB"
  | "ADMIN_UPDATED_JOB"
  | "ADMIN_PUBLISHED_JOB"
  | "ADMIN_UNPUBLISHED_JOB"
  | "ADMIN_ARCHIVED_JOB"
  | "ADMIN_DELETED_JOB"
  | "ADMIN_VIEWED_APPLICATION"
  | "ADMIN_CHANGED_APPLICATION_STATUS"
  | "ADMIN_UPDATED_NOTES"
  | "ADMIN_VIEWED_RESUME"
  | "ADMIN_DOWNLOADED_RESUME"
  | "ADMIN_CHANGED_PASSWORD"
  | "ADMIN_CREATED_ADMIN"
  | "ADMIN_ACTIVATED_ADMIN"
  | "ADMIN_DEACTIVATED_ADMIN"
  | "ADMIN_CREATED_EMPLOYEE"
  | "ADMIN_UPDATED_EMPLOYEE"
  | "ADMIN_CHANGED_EMPLOYEE_STATUS"
  | "OFFER_CREATED"
  | "OFFER_UPDATED"
  | "OFFER_SUBMITTED_FOR_APPROVAL"
  | "OFFER_APPROVED"
  | "OFFER_REJECTED"
  | "OFFER_SENT"
  | "OFFER_VIEWED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "OFFER_WITHDRAWN"
  | "OFFER_EXPIRED"
  | "OFFER_PDF_GENERATED"
  | "OFFER_TEMPLATE_SAVED"
  | "INVOICE_CREATED"
  | "INVOICE_UPDATED"
  | "INVOICE_SENT"
  | "INVOICE_VIEWED"
  | "INVOICE_PDF_GENERATED"
  | "INVOICE_VOIDED"
  | "INVOICE_DUPLICATED"
  | "INVOICE_REOPENED"
  | "PAYMENT_RECORDED"
  | "PAYMENT_UPDATED"
  | "CLIENT_CREATED"
  | "CLIENT_UPDATED"
  | "INVOICE_SETTINGS_SAVED"
  | "INVOICE_EXPORTED";

/**
 * Records an admin action. Never throws — an audit write failing must not
 * abort the action the admin actually took.
 */
export async function audit(entry: {
  adminId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      adminId: entry.adminId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] write failed", {
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
