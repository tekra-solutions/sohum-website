import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { db } from "@/db";
import { auditLogs, admins } from "@/db/schema";
import { requireInvoice } from "@/lib/invoices/access";
import { getInvoiceDetail, listClients, getInvoiceSettings } from "@/lib/invoices/data";
import { derivedInvoiceStatus, formatMoney, formatQuantity } from "@/lib/invoices/money";
import {
  canEditInvoice, canRecordPayment, canReopenToDraft, canSendInvoice, canVoidInvoice,
  invoiceStatusLabel, paymentMethodLabel, paymentMethods, type InvoiceStatus,
} from "@/lib/invoices/policy";
import { recordPaymentAction, voidInvoiceAction, duplicateInvoiceAction, reopenInvoiceAction } from "@/lib/invoices/actions";
import { sendInvoiceAction } from "@/lib/invoices/send-actions";
import { AdminHeader, StatusPill, adminButtonSecondary } from "@/components/admin/ui";
import { WorkflowForm, WorkflowField as Field } from "@/components/admin/WorkflowForm";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { t } from "@/components/admin/form";
import { formatDateTime, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireInvoice(id);
  const detail = await getInvoiceDetail(id);
  if (!detail) notFound();

  const invoice = detail.invoice;
  const [activity, clients, settings] = await Promise.all([
    db.select({ event: auditLogs, author: admins.name })
      .from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id))
      .where(and(eq(auditLogs.entityType, "invoice"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt)).limit(100),
    listClients(),
    getInvoiceSettings(),
  ]);

  const status = derivedInvoiceStatus({
    status: invoice.status, dueDate: invoice.dueDate, totalCents: invoice.totalCents,
    amountPaidCents: invoice.amountPaidCents, balanceDueCents: invoice.balanceDueCents,
  }) as InvoiceStatus;
  const money = (c: number) => formatMoney(c, invoice.currency);
  const editable = canEditInvoice(invoice.status as InvoiceStatus);

  return (
    <>
      <AdminHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={detail.clientName ?? invoice.billingSnapshot?.companyName ?? "No client"}
        action={
          <>
            <StatusPill status={status} label={invoiceStatusLabel[status]} />
            <Link href={`/admin/invoices/${id}/preview`} target="_blank" className={adminButtonSecondary}>
              Preview <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href={`/admin/invoices/${id}/pdf`} className={adminButtonSecondary}>
              <FileText className="size-3.5" aria-hidden="true" /> PDF
            </Link>
          </>
        }
      />

      <div className="space-y-5 p-5 sm:p-6 lg:p-8">
        <Link href="/admin/invoices" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All invoices
        </Link>

        {status === "OVERDUE" && (
          <p role="status" className="rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3 text-[0.8125rem] text-[#8e2c20]">
            This invoice was due {shortDate(invoice.dueDate)} and {money(invoice.balanceDueCents)} is still outstanding.
          </p>
        )}
        {invoice.status === "VOID" && (
          <p role="status" className="rounded-[3px] border border-paper-300 bg-paper-50 p-3 text-[0.8125rem] text-graphite-700">
            Voided {invoice.voidedAt ? shortDate(invoice.voidedAt) : ""}: {invoice.voidReason}
          </p>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-[4px] border border-paper-300 bg-white p-5">
            <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Summary</h2>
            <dl className="mt-3 space-y-2">
              {[
                ["Invoice date", shortDate(invoice.invoiceDate)],
                ["Due date", shortDate(invoice.dueDate)],
                ["Total", money(invoice.totalCents)],
                ["Amount paid", money(invoice.amountPaidCents)],
                ["Balance due", money(invoice.balanceDueCents)],
                ["Created by", detail.creatorName ?? "—"],
                invoice.sentAt ? ["Sent", formatDateTime(invoice.sentAt)] : null,
              ].filter((r): r is [string, string] => r !== null).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-paper-200 pb-2 last:border-0">
                  <dt className={`${t.hint} text-graphite-500`}>{k}</dt>
                  <dd className={`${t.body} tabular-nums text-ink-900`}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4 rounded-[4px] border border-paper-300 bg-white p-5">
            <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Actions</h2>

            {canSendInvoice(invoice.status as InvoiceStatus) && (
              <WorkflowForm
                action={sendInvoiceAction}
                label={invoice.sentAt ? "Resend invoice" : "Send invoice"}
                confirm={{
                  message: `This emails the invoice and a secure link to the client${invoice.sentAt ? " again" : ""}. It cannot be unsent.`,
                  confirmLabel: "Send now",
                }}
              >
                <input type="hidden" name="invoiceId" value={id} />
                <Field name="to" label="To" value={invoice.billingSnapshot?.email ?? ""} required />
                <Field name="subject" label="Subject" value={`Invoice ${invoice.invoiceNumber} from Sohum Systems`} required />
                <Field name="message" label="Message" multiline />
              </WorkflowForm>
            )}

            {canRecordPayment(status) && (
              <WorkflowForm action={recordPaymentAction} label="Record payment">
                <input type="hidden" name="invoiceId" value={id} />
                <Field name="amountCents" label={`Amount (max ${money(invoice.balanceDueCents)})`} required />
                <Field name="paidOn" label="Payment date" type="date" value={new Date().toISOString().slice(0, 10)} required />
                <Field name="method" label="Method" value="ACH" options={paymentMethods.map(m => ({ value: m, label: paymentMethodLabel[m] }))} />
                <Field name="reference" label="Reference / check number" />
                <Field name="notes" label="Notes" multiline />
              </WorkflowForm>
            )}

            {canReopenToDraft(invoice.status as InvoiceStatus) && invoice.amountPaidCents === 0 && (
              <WorkflowForm action={reopenInvoiceAction} label="Return to draft"
                confirm={{ message: "This revokes the client's link and returns the invoice to draft so it can be edited. It will need sending again." }}>
                <input type="hidden" name="invoiceId" value={id} />
              </WorkflowForm>
            )}

            <WorkflowForm action={duplicateInvoiceAction} label="Duplicate">
              <input type="hidden" name="invoiceId" value={id} />
              <p className={`${t.hint} text-graphite-500`}>Creates a new draft with the same client, items and terms.</p>
            </WorkflowForm>

            {canVoidInvoice(invoice.status as InvoiceStatus) && (
              <WorkflowForm action={voidInvoiceAction} label="Void invoice"
                confirm={{ message: "Voiding revokes the client's link and blocks further payments. The invoice is kept for the record and cannot be un-voided.", tone: "danger" }}>
                <input type="hidden" name="invoiceId" value={id} />
                <Field name="reason" label="Reason" multiline required />
              </WorkflowForm>
            )}
          </section>
        </div>

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Line items</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-paper-300">
                  <th className="py-2 font-medium text-graphite-600">Description</th>
                  <th className="py-2 text-right font-medium text-graphite-600">Qty</th>
                  <th className="py-2 text-right font-medium text-graphite-600">Rate</th>
                  <th className="py-2 text-right font-medium text-graphite-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map(item => (
                  <tr key={item.id} className="border-b border-paper-200 last:border-0">
                    <td className="py-2.5 text-ink-900">
                      {item.description}
                      {[item.servicePeriod, item.consultantName, item.projectRef].filter(Boolean).length > 0 && (
                        <span className="mt-0.5 block text-[0.75rem] text-graphite-500">
                          {[item.servicePeriod, item.consultantName, item.projectRef].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-graphite-700">{formatQuantity(item.quantityMilli)}</td>
                    <td className="py-2.5 text-right tabular-nums text-graphite-700">{money(item.rateCents)}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink-900">{money(item.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Payment history</h2>
          {detail.payments.length === 0 ? (
            <p className={`mt-3 ${t.body} text-graphite-500`}>No payments recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-paper-200">
              {detail.payments.map(({ payment, recorderName }) => (
                <li key={payment.id} className="flex flex-wrap items-baseline justify-between gap-3 py-2.5">
                  <div>
                    <p className={`${t.body} text-ink-900`}>
                      {shortDate(payment.paidOn)} · {paymentMethodLabel[payment.method] ?? payment.method}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                    <p className={`${t.hint} text-graphite-500`}>Recorded by {recorderName ?? "—"}</p>
                  </div>
                  <span className={`${t.body} tabular-nums font-medium text-ink-900`}>{money(payment.amountCents)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 pt-2.5 text-[0.9375rem] font-semibold">
                <span className="text-ink-900">Balance due</span>
                <span className="tabular-nums text-ink-900">{money(invoice.balanceDueCents)}</span>
              </li>
            </ul>
          )}
        </section>

        {editable && (
          <section className="rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
            <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Edit draft</h2>
            <div className="mt-4">
              <InvoiceForm
                clients={clients}
                invoice={{
                  id: invoice.id, clientId: invoice.clientId, invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate,
                  poNumber: invoice.poNumber, contractNumber: invoice.contractNumber, taskOrder: invoice.taskOrder,
                  projectName: invoice.projectName, periodOfPerformance: invoice.periodOfPerformance,
                  paymentTerms: invoice.paymentTerms, notes: invoice.notes,
                  discountCents: invoice.discountCents, additionalChargesCents: invoice.additionalChargesCents,
                  taxRateBasisPoints: invoice.taxRateBasisPoints,
                  items: detail.items,
                }}
                defaults={{
                  paymentTerms: settings.defaultPaymentTerms, notes: settings.defaultNotes ?? "",
                  taxRateBasisPoints: settings.defaultTaxRateBasisPoints, currency: settings.defaultCurrency,
                }}
              />
            </div>
          </section>
        )}

        <section className="rounded-[4px] border border-paper-300 bg-white p-5">
          <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Activity</h2>
          <ol className="mt-3 space-y-3">
            {activity.map(({ event, author }) => (
              <li key={event.id} className="border-l-2 border-paper-300 pl-3">
                <p className={`${t.body} font-medium text-ink-900`}>
                  {event.action.replace(/^INVOICE_|^PAYMENT_/, m => (m === "PAYMENT_" ? "payment " : "")).replaceAll("_", " ").toLowerCase()}
                </p>
                <p className={`mt-0.5 ${t.hint} text-graphite-500`}>{author ?? "Client"} · {formatDateTime(event.createdAt)}</p>
              </li>
            ))}
            {!activity.length && <li className={`${t.body} text-graphite-500`}>No activity yet.</li>}
          </ol>
        </section>
      </div>
    </>
  );
}
