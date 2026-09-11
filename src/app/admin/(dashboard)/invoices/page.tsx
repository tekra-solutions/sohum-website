import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listInvoices, invoiceDashboard, listClients } from "@/lib/invoices/data";
import { invoiceStatuses } from "@/lib/invoices/policy";
import { derivedInvoiceStatus, formatMoney } from "@/lib/invoices/money";
import { invoiceStatusLabel, shortDate } from "@/lib/format";
import { AdminHeader, EmptyState, StatCard, StatusPill, adminButton, adminButtonSecondary } from "@/components/admin/ui";
import { control } from "@/components/admin/form";
import { requirePermission } from "@/lib/ats/access";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("invoices");
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Invoices" />
        <div className="p-5 sm:p-6 lg:p-8">
          <EmptyState title="Database not configured" description="See docs/DEPLOYMENT.md to connect Supabase." />
        </div>
      </>
    );
  }

  const filters = {
    q: one("q"), status: one("status") ?? "ALL", clientId: one("clientId"),
    from: one("from"), to: one("to"), dueFrom: one("dueFrom"), dueTo: one("dueTo"),
    page: Number(one("page") ?? 1),
  };
  const filtered = Boolean(filters.q || (filters.status && filters.status !== "ALL") || filters.clientId || filters.from || filters.to || filters.dueFrom || filters.dueTo);

  const [{ rows, total, page, pageSize }, summary, clientList] = await Promise.all([
    listInvoices(filters), invoiceDashboard(), listClients(),
  ]);

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v && k !== "page" && v !== "ALL") params.set(k, String(v));
    params.set("page", String(n));
    return `/admin/invoices?${params}`;
  };

  return (
    <>
      <AdminHeader
        title="Invoices"
        description="Billing, delivery and payment tracking."
        action={
          <>
            <Link href="/admin/invoices/new" className={adminButton}>
              <Plus className="size-3.5" aria-hidden="true" />
              Create invoice
            </Link>
            <Link href="/admin/invoices/clients" className={adminButtonSecondary}>Clients</Link>
            <a href={`/api/admin/invoices/export?${new URLSearchParams(
              Object.entries(filters).filter(([k, v]) => v && k !== "page" && v !== "ALL").map(([k, v]) => [k, String(v)]),
            )}`} className={adminButtonSecondary}>Export CSV</a>
          </>
        }
      />

      <div className="space-y-6 p-5 sm:p-6 lg:p-8">
        <section aria-labelledby="summary">
          <h2 id="summary" className="sr-only">Summary</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Outstanding" value={formatMoney(summary.outstandingCents)} href="/admin/invoices?status=SENT" />
            <StatCard label="Overdue" value={formatMoney(summary.overdueCents)} tone="accent" />
            <StatCard label="Paid this month" value={formatMoney(summary.paidThisMonthCents)} href="/admin/invoices?status=PAID" />
            <StatCard label="Drafts" value={summary.draftCount} href="/admin/invoices?status=DRAFT" />
          </div>
        </section>

        {summary.attention.length > 0 && (
          <section aria-labelledby="attention">
            <h2 id="attention" className="text-[0.9375rem] font-medium text-ink-900">Needs attention</h2>
            <ul className="mt-3 divide-y divide-paper-200 rounded-[4px] border border-paper-300 bg-white">
              {summary.attention.map(({ invoice, clientName }) => {
                const status = derivedInvoiceStatus({
                  status: invoice.status, dueDate: invoice.dueDate, totalCents: invoice.totalCents,
                  amountPaidCents: invoice.amountPaidCents, balanceDueCents: invoice.balanceDueCents,
                });
                const why = status === "OVERDUE" ? `Overdue since ${shortDate(invoice.dueDate)}`
                  : invoice.status === "DRAFT" ? "Draft — not sent yet"
                  : `Due ${shortDate(invoice.dueDate)}`;
                return (
                  <li key={invoice.id}>
                    <Link href={`/admin/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-paper-50">
                      <div className="min-w-0">
                        <p className="text-[0.8125rem] font-medium text-ink-900">
                          {invoice.invoiceNumber} · {clientName ?? invoice.billingSnapshot?.companyName ?? "No client"}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-graphite-500">{why}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums text-[0.8125rem] text-ink-900">{formatMoney(invoice.balanceDueCents, invoice.currency)}</span>
                        <StatusPill status={status} label={invoiceStatusLabel[status]} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <form className="grid gap-3 rounded-[4px] border border-paper-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <label htmlFor="q" className="sr-only">Search invoices</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
            <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Invoice number, client or email" className={`${control} pl-9`} />
          </div>
          <div>
            <label htmlFor="status" className="sr-only">Status</label>
            <select id="status" name="status" defaultValue={filters.status} className={control}>
              <option value="ALL">All statuses</option>
              {invoiceStatuses.map(s => <option key={s} value={s}>{invoiceStatusLabel[s]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="clientId" className="sr-only">Client</label>
            <select id="clientId" name="clientId" defaultValue={filters.clientId ?? ""} className={control}>
              <option value="">All clients</option>
              {clientList.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="from" className="sr-only">Invoiced from</label>
            <input id="from" name="from" type="date" defaultValue={filters.from} className={control} />
          </div>
          <button className={adminButtonSecondary}>Filter</button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No invoices match these filters" : "No invoices yet"}
            description={filtered ? "Clear the filters to see every invoice." : "Create your first invoice to start billing a client."}
            action={filtered
              ? <Link href="/admin/invoices" className={adminButtonSecondary}>Clear filters</Link>
              : <Link href="/admin/invoices/new" className={adminButton}>Create invoice</Link>}
          />
        ) : (
          <div className="overflow-x-auto rounded-[4px] border border-paper-300 bg-white">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr>
                  {["Invoice", "Client", "Invoice date", "Due date", "Amount", "Balance", "Status", "Created by"].map(h => (
                    <th key={h} className="border-b border-paper-300 p-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ invoice, clientName, creatorName }) => {
                  const status = derivedInvoiceStatus({
                    status: invoice.status, dueDate: invoice.dueDate, totalCents: invoice.totalCents,
                    amountPaidCents: invoice.amountPaidCents, balanceDueCents: invoice.balanceDueCents,
                  });
                  return (
                    <tr key={invoice.id} className="border-b border-paper-200 last:border-0">
                      <td className="p-3">
                        <Link href={`/admin/invoices/${invoice.id}`} className="font-medium text-ink-900 underline-offset-4 hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="p-3 text-graphite-700">{clientName ?? invoice.billingSnapshot?.companyName ?? "—"}</td>
                      <td className="p-3 text-graphite-600">{shortDate(invoice.invoiceDate)}</td>
                      <td className={`p-3 ${status === "OVERDUE" ? "font-medium text-[#a5382b]" : "text-graphite-600"}`}>{shortDate(invoice.dueDate)}</td>
                      <td className="p-3 tabular-nums text-graphite-700">{formatMoney(invoice.totalCents, invoice.currency)}</td>
                      <td className="p-3 tabular-nums text-ink-900">{formatMoney(invoice.balanceDueCents, invoice.currency)}</td>
                      <td className="p-3"><StatusPill status={status} label={invoiceStatusLabel[status]} /></td>
                      <td className="p-3 text-graphite-500">{creatorName ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <nav className="flex gap-3" aria-label="Invoice pagination">
          {page > 1 && <Link className={adminButtonSecondary} href={pageHref(page - 1)}>Previous</Link>}
          {page * pageSize < total && <Link className={adminButtonSecondary} href={pageHref(page + 1)}>Next</Link>}
        </nav>
      </div>
    </>
  );
}
