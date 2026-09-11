import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/ats/access";
import { getInvoiceSettings } from "@/lib/invoices/data";
import { saveInvoiceSettingsAction } from "@/lib/invoices/actions";
import { WorkflowForm, WorkflowField as Field } from "@/components/admin/WorkflowForm";
import { AdminHeader } from "@/components/admin/ui";
import { t } from "@/components/admin/form";
import { site, contact } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice settings" };

export default async function InvoiceSettingsPage() {
  await requirePermission("settings");
  const s = await getInvoiceSettings();

  return (
    <>
      <AdminHeader title="Invoice settings" description="Numbering, defaults and payment instructions." />
      <div className="space-y-5 p-5 sm:p-8">
        <Link href="/admin/settings" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Settings
        </Link>

        <p className={`max-w-2xl ${t.hint} text-graphite-600`}>
          The billing identity below is only needed when it differs from the company details already on file
          ({site.legalName}, {contact.address}). Leave those fields blank to use them.
        </p>

        <div className="max-w-2xl rounded-[4px] border border-paper-300 bg-white p-5">
          <WorkflowForm action={saveInvoiceSettingsAction} label="Save invoice settings">
            <Field name="invoicePrefix" label="Invoice prefix" value={s.invoicePrefix} required />
            <p className={`${t.hint} text-graphite-500`}>
              Numbers are issued as {s.invoicePrefix}-{s.sequenceYear}-0001 and restart each year.
              Next number: {s.invoicePrefix}-{s.sequenceYear}-{String(s.nextSequence).padStart(4, "0")}.
            </p>
            <Field name="defaultPaymentTerms" label="Default payment terms" value={s.defaultPaymentTerms} required />
            <Field name="defaultCurrency" label="Default currency" value={s.defaultCurrency} required />
            <Field name="defaultTaxRateBasisPoints" label="Default tax rate (basis points)" value={String(s.defaultTaxRateBasisPoints)} />
            <Field name="paymentInstructions" label="Payment instructions" value={s.paymentInstructions} multiline />
            <Field name="defaultNotes" label="Default invoice notes" value={s.defaultNotes} multiline />
            <Field name="legalName" label="Billing legal name" value={s.legalName} />
            <Field name="billingAddress" label="Billing address" value={s.billingAddress} multiline />
            <Field name="billingEmail" label="Billing email" value={s.billingEmail} />
            <Field name="billingPhone" label="Billing phone" value={s.billingPhone} />
            <Field name="taxId" label="Tax / EIN" value={s.taxId} />
          </WorkflowForm>
        </div>
      </div>
    </>
  );
}
