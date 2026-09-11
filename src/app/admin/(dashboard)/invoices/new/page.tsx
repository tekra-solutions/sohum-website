import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listClients, getInvoiceSettings } from "@/lib/invoices/data";
import { requirePermission } from "@/lib/ats/access";
import { AdminHeader, EmptyState, adminButtonSecondary } from "@/components/admin/ui";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create invoice" };

export default async function NewInvoicePage() {
  await requirePermission("invoices");
  const [clients, settings] = await Promise.all([listClients(), getInvoiceSettings()]);

  return (
    <>
      <AdminHeader title="Create invoice" description="Draft an invoice, preview it, then send." />
      <div className="p-5 sm:p-6 lg:p-8">
        <Link href="/admin/invoices" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All invoices
        </Link>
        {clients.length === 0 ? (
          <div className="mt-4 max-w-3xl">
            <EmptyState
              title="Add a client first"
              description="An invoice is billed to a client. Create one, then come back to raise the invoice."
              action={<Link href="/admin/invoices/clients" className={adminButtonSecondary}>Add a client</Link>}
            />
          </div>
        ) : (
          <div className="mt-4 max-w-4xl rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
            <InvoiceForm
              clients={clients}
              defaults={{
                paymentTerms: settings.defaultPaymentTerms,
                notes: settings.defaultNotes ?? "",
                taxRateBasisPoints: settings.defaultTaxRateBasisPoints,
                currency: settings.defaultCurrency,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
