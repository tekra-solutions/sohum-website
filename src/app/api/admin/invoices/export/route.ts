import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, clients, auditLogs } from "@/db/schema";
import { getSessionAdmin } from "@/lib/auth/session";
import { csvCell, permits } from "@/lib/ats/policy";
import { derivedInvoiceStatus } from "@/lib/invoices/money";
import { invoiceFilter } from "@/lib/invoices/data";

/**
 * Invoice CSV export. Respects the list's active filters, never emits the
 * secure token or its hash, and records the export in the audit log.
 */
export async function GET(request: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!permits(admin.role, "invoices")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(request.url).searchParams;
  const status = sp.get("status"), clientId = sp.get("clientId"), from = sp.get("from"), to = sp.get("to"), q = sp.get("q");
  const clause = invoiceFilter({ status: status ?? undefined, clientId: clientId ?? undefined,
    from: from ?? undefined, to: to ?? undefined, q: q ?? undefined,
    dueFrom: sp.get("dueFrom") ?? undefined, dueTo: sp.get("dueTo") ?? undefined });

  await db.insert(auditLogs).values({
    adminId: admin.id, action: "INVOICE_EXPORTED", entityType: "export",
    metadata: { filters: { status, clientId, from, to, q: q ? "(search)" : null } },
  });

  const encoder = new TextEncoder();
  let page = 0, headerWritten = false, cancelled = false;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const rows = await db
          .select({
            number: invoices.invoiceNumber, client: clients.companyName, snapshot: invoices.billingSnapshot,
            invoiceDate: invoices.invoiceDate, dueDate: invoices.dueDate, status: invoices.status,
            total: invoices.totalCents, paid: invoices.amountPaidCents, balance: invoices.balanceDueCents,
            currency: invoices.currency,
          })
          .from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id))
          .where(clause).orderBy(desc(invoices.invoiceDate), asc(invoices.invoiceNumber))
          .limit(500).offset(page * 500);
        if (cancelled) return;
        if (!headerWritten) {
          controller.enqueue(encoder.encode(
            ["Invoice", "Client", "Invoice date", "Due date", "Total", "Paid", "Balance", "Status"].map(csvCell).join(",") + "\r\n",
          ));
          headerWritten = true;
        }
        for (const r of rows) {
          const status = derivedInvoiceStatus({
            status: r.status, dueDate: r.dueDate, totalCents: r.total,
            amountPaidCents: r.paid, balanceDueCents: r.balance,
          });
          controller.enqueue(encoder.encode([
            r.number,
            r.client ?? r.snapshot?.companyName ?? "",
            r.invoiceDate.toISOString().slice(0, 10),
            r.dueDate.toISOString().slice(0, 10),
            // Plain decimal strings so a spreadsheet reads them as numbers.
            (r.total / 100).toFixed(2),
            (r.paid / 100).toFixed(2),
            (r.balance / 100).toFixed(2),
            status,
          ].map(csvCell).join(",") + "\r\n"));
        }
        if (rows.length < 500) controller.close(); else page++;
      } catch {
        if (!cancelled) controller.error(new Error("Export interrupted. Please retry."));
      }
    },
    cancel() { cancelled = true; },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sohum-invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
