import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, auditLogs } from "@/db/schema";
import { resolveInvoiceToken } from "@/lib/invoices/client-access";
import { formatMoney, formatQuantity, derivedInvoiceStatus } from "@/lib/invoices/money";
import { invoiceStatusLabel } from "@/lib/invoices/policy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function ClientInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await resolveInvoiceToken(token);
  // One uniform outcome for unknown, expired, revoked and draft, so a probe
  // cannot distinguish them.
  if (!row) notFound();

  const invoice = row.invoice;

  // First client view is recorded once; the conditional update means a
  // refresh does not repeatedly rewrite the row or spam the audit log.
  if (invoice.status === "SENT") {
    await db.transaction(async tx => {
      const changed = await tx.update(invoices)
        .set({ status: "VIEWED", viewedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(invoices.id, invoice.id), eq(invoices.status, "SENT")))
        .returning({ id: invoices.id });
      if (changed.length) {
        await tx.insert(auditLogs).values({
          adminId: null, action: "INVOICE_VIEWED", entityType: "invoice", entityId: invoice.id,
          metadata: { invoiceNumber: invoice.invoiceNumber, actor: "client" },
        });
      }
    });
  }

  const items = await db.select().from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(invoiceItems.position);

  const status = derivedInvoiceStatus({
    status: invoice.status, dueDate: invoice.dueDate, totalCents: invoice.totalCents,
    amountPaidCents: invoice.amountPaidCents, balanceDueCents: invoice.balanceDueCents,
  });
  const money = (c: number) => formatMoney(c, invoice.currency);
  const billTo = invoice.billingSnapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.25rem] font-medium text-ink-900">Invoice {invoice.invoiceNumber}</h1>
          <p className="mt-1 text-[0.8125rem] text-graphite-600">
            Issued {fmtDate(invoice.invoiceDate)} · Due {fmtDate(invoice.dueDate)}
          </p>
        </div>
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
          status === "PAID" ? "border-[#1e7a4d]/30 bg-[#1e7a4d]/10 text-[#1e7a4d]"
          : status === "OVERDUE" ? "border-[#7a5c00]/30 bg-[#f0a93c]/15 text-[#7a5c00]"
          : "border-paper-300 bg-paper-100 text-graphite-600"}`}>
          {invoiceStatusLabel[status] ?? status}
        </span>
      </div>

      <div className="rounded-[4px] border border-paper-300 bg-white p-5">
        {billTo && (
          <div className="mb-5">
            <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-graphite-500">Billed to</p>
            <p className="mt-1 whitespace-pre-line text-[0.8125rem] text-ink-900">
              {[billTo.companyName, billTo.agency, billTo.contactName, billTo.billingAddress].filter(Boolean).join("\n")}
            </p>
          </div>
        )}

        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[420px] text-left text-[0.8125rem]">
            <thead>
              <tr className="border-b border-paper-300">
                <th className="py-2 font-medium text-graphite-600">Description</th>
                <th className="py-2 text-right font-medium text-graphite-600">Qty</th>
                <th className="py-2 text-right font-medium text-graphite-600">Rate</th>
                <th className="py-2 text-right font-medium text-graphite-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-paper-200 last:border-0">
                  <td className="py-2.5 text-ink-900">{item.description}</td>
                  <td className="py-2.5 text-right tabular-nums text-graphite-700">{formatQuantity(item.quantityMilli)}</td>
                  <td className="py-2.5 text-right tabular-nums text-graphite-700">{money(item.rateCents)}</td>
                  <td className="py-2.5 text-right tabular-nums text-ink-900">{money(item.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 ml-auto max-w-xs space-y-1.5">
          {[
            ["Subtotal", money(invoice.subtotalCents)],
            invoice.discountCents > 0 ? ["Discount", `-${money(invoice.discountCents)}`] : null,
            invoice.taxCents > 0 ? ["Tax", money(invoice.taxCents)] : null,
            ["Total", money(invoice.totalCents)],
            invoice.amountPaidCents > 0 ? ["Amount paid", `-${money(invoice.amountPaidCents)}`] : null,
          ].filter((r): r is [string, string] => r !== null).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 text-[0.8125rem]">
              <dt className="text-graphite-600">{k}</dt>
              <dd className="tabular-nums text-ink-900">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-6 border-t border-paper-300 pt-2 text-[0.9375rem] font-semibold">
            <dt className="text-ink-900">Balance due</dt>
            <dd className="tabular-nums text-ink-900">{money(invoice.balanceDueCents)}</dd>
          </div>
        </dl>

        <a href={`/invoice/${token}/pdf`} target="_blank" rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-ink-900 underline underline-offset-4">
          Download PDF
        </a>
      </div>

      {invoice.paymentTerms && (
        <div className="rounded-[4px] border border-paper-300 bg-white p-5">
          <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-graphite-500">Payment terms</p>
          <p className="mt-1 text-[0.8125rem] text-ink-900">{invoice.paymentTerms}</p>
          {invoice.notes && <p className="mt-3 whitespace-pre-line text-[0.8125rem] text-graphite-700">{invoice.notes}</p>}
        </div>
      )}
    </div>
  );
}
