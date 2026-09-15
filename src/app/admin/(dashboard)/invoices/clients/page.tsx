import { asc, sql } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, UserPlus } from "lucide-react";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { saveClientAction } from "@/lib/invoices/actions";
import { WorkflowForm, WorkflowField as Field } from "@/components/admin/WorkflowForm";
import { AdminHeader, EmptyState, PageBody } from "@/components/admin/ui";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

/**
 * The fields of a client, laid out the way the Settings forms are: grouped by
 * what the information is for, two columns where the values are short, and a
 * hint on anything whose purpose is not obvious from its label.
 *
 * Shared by the create and edit forms so the two cannot drift — previously
 * they were two hand-maintained copies of the same seven fields.
 */
function ClientFields({ client }: { client?: typeof clients.$inferSelect }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            name="companyName" label="Company name" required
            value={client?.companyName}
            hint="Appears on the invoice as the billed party."
          />
        </div>
        <Field
          name="agency" label="Agency or department" value={client?.agency}
          hint="Optional. The specific office within a larger organisation."
        />
        <Field name="contactName" label="Billing contact" value={client?.contactName} />
        <Field
          name="email" label="Billing email" type="email" value={client?.email}
          hint="Where the invoice link is sent."
        />
        <Field name="phone" label="Phone" value={client?.phone} />
      </div>

      <Field
        name="billingAddress" label="Billing address" multiline rows={3}
        value={client?.billingAddress}
        hint="Copied onto each invoice at the time it is raised."
      />

      <Field
        name="notes" label="Internal notes" multiline rows={2}
        value={client?.notes}
        hint="Never shown to the client or printed on an invoice."
      />
    </div>
  );
}

export default async function ClientsPage() {
  await requirePermission("invoices");

  // The invoice count per client is the fact that decides whether a row is
  // worth opening, so it is loaded with the list rather than discovered by
  // clicking into each one.
  const rows = await db
    .select({
      client: clients,
      invoiceCount: sql<number>`(select count(*)::int from ${invoices} where ${invoices.clientId} = ${clients.id})`,
    })
    .from(clients)
    .orderBy(asc(clients.companyName));

  return (
    <>
      <AdminHeader
        title="Clients"
        description="The organisations your invoices are billed to."
      />
      <PageBody className="max-w-5xl">
        <Link
          href="/admin/invoices"
          className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All invoices
        </Link>

        {/* Add a client — open by default only when there is nothing to show,
            so an established list is not pushed below a long empty form. */}
        <details
          className="group rounded-[4px] border border-paper-300 bg-white"
          open={rows.length === 0}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-ink-900 focus-visible:outline-2">
            <span className="inline-flex items-center gap-2">
              <UserPlus className="size-4 text-graphite-500" aria-hidden="true" />
              Add a client
            </span>
            <span aria-hidden="true" className="text-lg font-normal text-graphite-400 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="border-t border-paper-200 px-5 py-5">
            <WorkflowForm action={saveClientAction} label="Create client">
              <ClientFields />
            </WorkflowForm>
          </div>
        </details>

        {rows.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add a client above, then raise invoices against them."
          />
        ) : (
          <section aria-labelledby="client-list">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 id="client-list" className="text-base font-medium text-ink-900">
                {rows.length} {rows.length === 1 ? "client" : "clients"}
              </h2>
            </div>

            <ul className="divide-y divide-paper-200 overflow-hidden rounded-[4px] border border-paper-300 bg-white">
              {rows.map(({ client, invoiceCount }) => (
                <li key={client.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper-50 focus-visible:outline-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{client.companyName}</p>
                        {/* The details an accounts-payable question needs,
                            without opening the editor. */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-graphite-600">
                          {client.agency && (
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="size-3 text-graphite-400" aria-hidden="true" />
                              {client.agency}
                            </span>
                          )}
                          {client.email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="size-3 text-graphite-400" aria-hidden="true" />
                              {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="size-3 text-graphite-400" aria-hidden="true" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <span className="text-xs text-graphite-500">
                          {invoiceCount === 0
                            ? "No invoices"
                            : `${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"}`}
                        </span>
                        <span aria-hidden="true" className="text-lg font-normal text-graphite-400 transition-transform group-open:rotate-45">
                          +
                        </span>
                      </div>
                    </summary>

                    <div className="border-t border-paper-200 bg-paper-50/50 px-5 py-5">
                      <WorkflowForm action={saveClientAction} label="Save changes">
                        <input type="hidden" name="id" value={client.id} />
                        <ClientFields client={client} />
                      </WorkflowForm>
                      <p className={`mt-4 border-t border-paper-200 pt-3 ${t.hint} text-graphite-500`}>
                        Editing a client never changes invoices already issued — each invoice keeps
                        its own copy of the billing details from the day it was raised.
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>
    </>
  );
}
