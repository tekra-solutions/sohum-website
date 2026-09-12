import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listInvoices, invoiceDashboard, listClients } from "@/lib/invoices/data";
import { invoiceStatuses } from "@/lib/invoices/policy";
import { derivedInvoiceStatus, formatMoney } from "@/lib/invoices/money";
import { invoiceStatusLabel, shortDate } from "@/lib/format";
import { AdminHeader, Card, DataTable, EmptyState, Filter, PageBody, Pager, StatCard, StatusPill, Toolbar, adminButton, adminButtonSecondary, td, tr } from "@/components/admin/ui";
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
          </>
        }
      />

      <PageBody>
        <section aria-labelledby="summary">
          <h2 id="summary" className="sr-only">Summary</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Outstanding" value={formatMoney(summary.outstandingCents)} href="/admin/invoices?status=SENT" />
            <StatCard label="Overdue" value={formatMoney(summary.overdueCents)} href="/admin/invoices?status=OVERDUE" tone="critical" />
            <StatCard label="Paid this month" value={formatMoney(summary.paidThisMonthCents)} href="/admin/invoices?status=PAID" />
            <StatCard label="Drafts" value={summary.draftCount} href="/admin/invoices?status=DRAFT" />
          </div>
        </section>

        {summary.attention.length > 0 && (
          <Card title="Needs attention" className="[&>div]:p-0">
            <ul className="divide-y divide-paper-200">
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
          </Card>
        )}

        <Toolbar>
          <Filter label="Search" wide>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
              <input name="q" type="search" defaultValue={filters.q} placeholder="Invoice number, client or email" className={`${control} pl-9`} />
            </div>
          </Filter>
          <Filter label="Status">
            <select name="status" defaultValue={filters.status} className={control}>
              <option value="ALL">All statuses</option>
              {invoiceStatuses.map(s => <option key={s} value={s}>{invoiceStatusLabel[s]}</option>)}
            </select>
          </Filter>
          <Filter label="Client">
            <select name="clientId" defaultValue={filters.clientId ?? ""} className={control}>
              <option value="">All clients</option>
              {clientList.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </Filter>
          <Filter label="Invoiced from">
            <input name="from" type="date" defaultValue={filters.from} className={control} />
          </Filter>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No invoices match these filters" : "No invoices yet"}
            description={filtered ? "Clear the filters to see every invoice." : "Create your first invoice to start billing a client."}
            action={filtered
              ? <Link href="/admin/invoices" className={adminButtonSecondary}>Clear filters</Link>
              : <Link href="/admin/invoices/new" className={adminButton}>Create invoice</Link>}
          />
        ) : (
          <DataTable headers={["Invoice", "Client", "Invoice date", "Due date", "Amount", "Balance", "Status", "Created by"]} minWidth="56rem">
            {rows.map(({ invoice, clientName, creatorName }) => {
              const status = derivedInvoiceStatus({
                status: invoice.status, dueDate: invoice.dueDate, totalCents: invoice.totalCents,
                amountPaidCents: invoice.amountPaidCents, balanceDueCents: invoice.balanceDueCents,
              });
              return (
                <tr key={invoice.id} className={tr}>
                  <th scope="row" className="px-4 py-2.5 text-left">
                    <Link href={`/admin/invoices/${invoice.id}`} className="text-[0.8125rem] font-medium text-ink-900 underline-offset-4 hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </th>
                  <td className={td}>{clientName ?? invoice.billingSnapshot?.companyName ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap text-graphite-600`}>{shortDate(invoice.invoiceDate)}</td>
                  <td className={`${td} whitespace-nowrap ${status === "OVERDUE" ? "font-medium text-[#a5382b]" : "text-graphite-600"}`}>{shortDate(invoice.dueDate)}</td>
                  <td className={`${td} tabular-nums`}>{formatMoney(invoice.totalCents, invoice.currency)}</td>
                  <td className={`${td} tabular-nums font-medium text-ink-900`}>{formatMoney(invoice.balanceDueCents, invoice.currency)}</td>
                  <td className="px-4 py-2.5"><StatusPill status={status} label={invoiceStatusLabel[status]} /></td>
                  <td className={`${td} text-graphite-500`}>{creatorName ?? "—"}</td>
                </tr>
              );
            })}
          </DataTable>
        )}

        <Pager page={page} pageCount={Math.ceil(total / pageSize)} href={pageHref} />

        {/* Export reflects the filters above, so it sits after the result it
            describes rather than in the page header. */}
        <Card title="Export" description="Comma-separated values for the invoices listed above">
          <a href={`/api/admin/invoices/export?${new URLSearchParams(
            Object.entries(filters).filter(([k, v]) => v && k !== "page" && v !== "ALL").map(([k, v]) => [k, String(v)]),
          )}`} className={adminButtonSecondary}>Download CSV</a>
        </Card>
      </PageBody>
    </>
  );
}
