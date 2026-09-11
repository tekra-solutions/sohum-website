import { asc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { saveClientAction } from "@/lib/invoices/actions";
import { WorkflowForm, WorkflowField as Field } from "@/components/admin/WorkflowForm";
import { AdminHeader, EmptyState } from "@/components/admin/ui";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  await requirePermission("invoices");
  const rows = await db.select().from(clients).orderBy(asc(clients.companyName));

  return (
    <>
      <AdminHeader title="Clients" description="Who invoices are billed to." />
      <div className="space-y-5 p-5 sm:p-6 lg:p-8">
        <Link href="/admin/invoices" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All invoices
        </Link>

        <details className="rounded-[4px] border border-paper-300 bg-white p-5" open={rows.length === 0}>
          <summary className="cursor-pointer text-sm font-medium text-ink-900">Add a client</summary>
          <div className="mt-4 max-w-2xl">
            <WorkflowForm action={saveClientAction} label="Create client">
              <Field name="companyName" label="Company name" required />
              <Field name="contactName" label="Contact name" />
              <Field name="email" label="Billing email" type="email" />
              <Field name="phone" label="Phone" />
              <Field name="agency" label="Agency or department" />
              <Field name="billingAddress" label="Billing address" multiline />
              <Field name="notes" label="Internal notes" multiline />
            </WorkflowForm>
          </div>
        </details>

        {rows.length === 0 ? (
          <EmptyState title="No clients yet" description="Add a client above to start raising invoices against them." />
        ) : (
          <ul className="divide-y divide-paper-200 rounded-[4px] border border-paper-300 bg-white">
            {rows.map(client => (
              <li key={client.id} className="p-4">
                <details>
                  <summary className="cursor-pointer">
                    <span className="text-[0.875rem] font-medium text-ink-900">{client.companyName}</span>
                    <span className="ml-2 text-[0.75rem] text-graphite-500">
                      {[client.agency, client.email].filter(Boolean).join(" · ")}
                    </span>
                  </summary>
                  <div className="mt-4 max-w-2xl">
                    <WorkflowForm action={saveClientAction} label="Save client">
                      <input type="hidden" name="id" value={client.id} />
                      <Field name="companyName" label="Company name" value={client.companyName} required />
                      <Field name="contactName" label="Contact name" value={client.contactName} />
                      <Field name="email" label="Billing email" type="email" value={client.email} />
                      <Field name="phone" label="Phone" value={client.phone} />
                      <Field name="agency" label="Agency or department" value={client.agency} />
                      <Field name="billingAddress" label="Billing address" value={client.billingAddress} multiline />
                      <Field name="notes" label="Internal notes" value={client.notes} multiline />
                    </WorkflowForm>
                    <p className={`mt-3 ${t.hint} text-graphite-500`}>
                      Editing a client never changes invoices already issued — each invoice keeps its own copy of the billing details.
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
