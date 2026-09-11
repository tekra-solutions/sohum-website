/**
 * Invoice status rules. Pure and DB-free so they can be unit tested and
 * shared between the server actions and the UI, rather than being restated
 * in components.
 */
export const invoiceStatuses = [
  "DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID",
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const paymentMethods = ["ACH", "WIRE", "CHECK", "CREDIT_CARD", "OTHER"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodLabel: Record<string, string> = {
  ACH: "ACH", WIRE: "Wire", CHECK: "Check", CREDIT_CARD: "Credit card", OTHER: "Other",
};

export const invoiceStatusLabel: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", PARTIALLY_PAID: "Partially paid",
  PAID: "Paid", OVERDUE: "Overdue", VOID: "Void",
};

/** Only a draft is freely editable. Anything issued is a financial record. */
export function canEditInvoice(status: InvoiceStatus) {
  return status === "DRAFT";
}

/** A sent invoice may be returned to draft for material corrections, but a
 *  paid or void one is closed — reopening those would rewrite settled money. */
export function canReopenToDraft(status: InvoiceStatus) {
  return status === "SENT" || status === "VIEWED" || status === "OVERDUE";
}

export function canSendInvoice(status: InvoiceStatus) {
  return status === "DRAFT" || status === "SENT" || status === "VIEWED" || status === "OVERDUE";
}

/** Void is terminal and blocks new money; a fully paid invoice needs no more. */
export function canRecordPayment(status: InvoiceStatus) {
  return status !== "VOID" && status !== "DRAFT" && status !== "PAID";
}

export function canVoidInvoice(status: InvoiceStatus) {
  return status !== "VOID";
}

/** The client-facing link only makes sense once the invoice has been issued. */
export function clientCanView(status: InvoiceStatus) {
  return status !== "DRAFT";
}

/** SOH-2026-0001 — prefix configurable, year and zero-padded sequence. */
export function formatInvoiceNumber(prefix: string, year: number, sequence: number) {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}
