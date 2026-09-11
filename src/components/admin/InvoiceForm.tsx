"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Loader2, Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { saveInvoiceAction, type InvoiceActionState } from "@/lib/invoices/actions";
import { Field, FormSection, Select, TextArea, btn, btnSecondary, control, spanAll, t } from "@/components/admin/form";
import { computeTotals, formatMoney, parseDollarsToCents, parseQuantityToMilli } from "@/lib/invoices/money";

const initial: InvoiceActionState = {};

type Row = {
  key: number; description: string; quantity: string; rate: string;
  period: string; consultant: string; project: string;
};

let nextKey = 1;
const emptyRow = (): Row => ({ key: nextKey++, description: "", quantity: "1", rate: "", period: "", consultant: "", project: "" });

const dateValue = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export type InvoiceFormValues = {
  id?: string;
  clientId?: string | null;
  invoiceDate?: Date | string | null;
  dueDate?: Date | string | null;
  poNumber?: string | null; contractNumber?: string | null; taskOrder?: string | null;
  projectName?: string | null; periodOfPerformance?: string | null;
  paymentTerms?: string | null; notes?: string | null;
  discountCents?: number | null; additionalChargesCents?: number | null; taxRateBasisPoints?: number | null;
  items?: { description: string; quantityMilli: number; rateCents: number;
    servicePeriod?: string | null; consultantName?: string | null; projectRef?: string | null }[];
};

export function InvoiceForm({
  clients, invoice, defaults,
}: {
  clients: { id: string; companyName: string }[];
  invoice?: InvoiceFormValues;
  defaults: { paymentTerms: string; notes: string; taxRateBasisPoints: number; currency: string };
}) {
  const [state, formAction, pending] = useActionState(saveInvoiceAction, initial);

  const [rows, setRows] = useState<Row[]>(
    invoice?.items?.length
      ? invoice.items.map(i => ({
          key: nextKey++, description: i.description,
          quantity: String(i.quantityMilli / 1000), rate: (i.rateCents / 100).toFixed(2),
          period: i.servicePeriod ?? "", consultant: i.consultantName ?? "", project: i.projectRef ?? "",
        }))
      : [emptyRow()],
  );
  const [discount, setDiscount] = useState(invoice?.discountCents ? (invoice.discountCents / 100).toFixed(2) : "");
  const [extra, setExtra] = useState(invoice?.additionalChargesCents ? (invoice.additionalChargesCents / 100).toFixed(2) : "");
  const [taxRate, setTaxRate] = useState(String(invoice?.taxRateBasisPoints ?? defaults.taxRateBasisPoints));

  const update = (key: number, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const move = (index: number, direction: -1 | 1) =>
    setRows(rs => {
      const target = index + direction;
      if (target < 0 || target >= rs.length) return rs;
      const copy = [...rs];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });

  // Live preview only. The server recomputes all of this from the line items
  // and never trusts anything posted from here.
  const preview = computeTotals({
    items: rows.map(r => ({
      quantityMilli: parseQuantityToMilli(r.quantity) ?? 0,
      rateCents: parseDollarsToCents(r.rate) ?? 0,
    })),
    discountCents: parseDollarsToCents(discount) ?? 0,
    additionalChargesCents: parseDollarsToCents(extra) ?? 0,
    taxRateBasisPoints: Number(taxRate) || 0,
  });
  const money = (c: number) => formatMoney(c, defaults.currency);

  return (
    <form action={formAction} className="space-y-6">
      {invoice?.id && <input type="hidden" name="invoiceId" value={invoice.id} />}

      <div aria-live="polite">
        {state.error && (
          <div className="flex gap-2.5 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-3">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className={`${t.body} text-[#8e2c20]`}>{state.error}</p>
          </div>
        )}
      </div>

      <FormSection title="Invoice">
        <Select
          name="clientId" label="Client"
          defaultValue={invoice?.clientId ?? ""}
          options={[{ value: "", label: "— Select a client —" }, ...clients.map(c => ({ value: c.id, label: c.companyName }))]}
          hint="Billing details are copied onto the invoice when it is saved."
        />
        <Field name="paymentTerms" label="Payment terms" defaultValue={invoice?.paymentTerms ?? defaults.paymentTerms} />
        <Field name="invoiceDate" label="Invoice date" type="date" required defaultValue={dateValue(invoice?.invoiceDate) || new Date().toISOString().slice(0, 10)} />
        <Field name="dueDate" label="Due date" type="date" required defaultValue={dateValue(invoice?.dueDate)} hint="Cannot be before the invoice date." />
      </FormSection>

      <FormSection title="References" description="Optional — useful for contract and government work.">
        <Field name="poNumber" label="PO number" defaultValue={invoice?.poNumber} />
        <Field name="contractNumber" label="Contract number" defaultValue={invoice?.contractNumber} />
        <Field name="taskOrder" label="Task order" defaultValue={invoice?.taskOrder} />
        <Field name="projectName" label="Project" defaultValue={invoice?.projectName} />
        <Field name="periodOfPerformance" label="Period of performance" defaultValue={invoice?.periodOfPerformance} className={spanAll} />
      </FormSection>

      <section className="border-t border-paper-200 pt-6">
        <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Line items</h2>
        <p className={`mt-1 ${t.hint} text-graphite-600`}>Amounts are calculated as quantity x rate.</p>

        <div className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const amount = computeTotals({
              items: [{ quantityMilli: parseQuantityToMilli(row.quantity) ?? 0, rateCents: parseDollarsToCents(row.rate) ?? 0 }],
            }).subtotalCents;
            return (
              <div key={row.key} className="rounded-[3px] border border-paper-300 bg-white p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_5rem_7rem_7rem_auto] sm:items-end">
                  <label className="block">
                    <span className={`block ${t.label} font-medium text-ink-800`}>Description</span>
                    <input name="itemDescription" value={row.description}
                      onChange={e => update(row.key, { description: e.target.value })}
                      className={`${control} mt-1.5 border-paper-300`} placeholder="Senior engineering services" />
                  </label>
                  <label className="block">
                    <span className={`block ${t.label} font-medium text-ink-800`}>Qty</span>
                    <input name="itemQuantity" value={row.quantity} inputMode="decimal"
                      onChange={e => update(row.key, { quantity: e.target.value })}
                      className={`${control} mt-1.5 border-paper-300 text-right`} />
                  </label>
                  <label className="block">
                    <span className={`block ${t.label} font-medium text-ink-800`}>Rate</span>
                    <input name="itemRate" value={row.rate} inputMode="decimal" placeholder="0.00"
                      onChange={e => update(row.key, { rate: e.target.value })}
                      className={`${control} mt-1.5 border-paper-300 text-right`} />
                  </label>
                  <div>
                    <span className={`block ${t.label} font-medium text-ink-800`}>Amount</span>
                    <p className="mt-1.5 py-2 text-right text-[0.8125rem] tabular-nums text-ink-900">{money(amount)}</p>
                  </div>
                  <div className="flex gap-1 pb-1">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0}
                      className="rounded p-1.5 text-graphite-500 hover:bg-paper-100 disabled:opacity-30" aria-label={`Move line ${index + 1} up`}>
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1}
                      className="rounded p-1.5 text-graphite-500 hover:bg-paper-100 disabled:opacity-30" aria-label={`Move line ${index + 1} down`}>
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setRows(rs => (rs.length > 1 ? rs.filter(r => r.key !== row.key) : rs))}
                      disabled={rows.length === 1}
                      className="rounded p-1.5 text-[#c0392b] hover:bg-[#c0392b]/[0.06] disabled:opacity-30" aria-label={`Remove line ${index + 1}`}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input name="itemPeriod" value={row.period} onChange={e => update(row.key, { period: e.target.value })}
                    className={`${control} border-paper-300`} placeholder="Service period (optional)" aria-label={`Service period for line ${index + 1}`} />
                  <input name="itemConsultant" value={row.consultant} onChange={e => update(row.key, { consultant: e.target.value })}
                    className={`${control} border-paper-300`} placeholder="Consultant (optional)" aria-label={`Consultant for line ${index + 1}`} />
                  <input name="itemProject" value={row.project} onChange={e => update(row.key, { project: e.target.value })}
                    className={`${control} border-paper-300`} placeholder="Project reference (optional)" aria-label={`Project reference for line ${index + 1}`} />
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={() => setRows(rs => [...rs, emptyRow()])} className={`${btnSecondary} mt-3`}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add line
        </button>
      </section>

      <FormSection title="Adjustments">
        <label className="block">
          <span className={`block ${t.label} font-medium text-ink-800`}>Discount</span>
          <input name="discountCents" value={discount} onChange={e => setDiscount(e.target.value)} inputMode="decimal"
            placeholder="0.00" className={`${control} mt-1.5 border-paper-300`} />
        </label>
        <label className="block">
          <span className={`block ${t.label} font-medium text-ink-800`}>Additional charges</span>
          <input name="additionalChargesCents" value={extra} onChange={e => setExtra(e.target.value)} inputMode="decimal"
            placeholder="0.00" className={`${control} mt-1.5 border-paper-300`} />
        </label>
        <label className="block">
          <span className={`block ${t.label} font-medium text-ink-800`}>Tax rate (basis points)</span>
          <input name="taxRateBasisPoints" value={taxRate} onChange={e => setTaxRate(e.target.value)} inputMode="numeric"
            className={`${control} mt-1.5 border-paper-300`} />
          <span className={`mt-1 block ${t.hint} text-graphite-500`}>825 = 8.25%. Leave 0 for no tax.</span>
        </label>
      </FormSection>

      <section className="border-t border-paper-200 pt-6">
        <div className="ml-auto max-w-xs space-y-1.5">
          {[
            ["Subtotal", money(preview.subtotalCents)],
            preview.discountCents > 0 ? ["Discount", `-${money(preview.discountCents)}`] : null,
            preview.taxCents > 0 ? ["Tax", money(preview.taxCents)] : null,
            preview.additionalChargesCents > 0 ? ["Additional charges", money(preview.additionalChargesCents)] : null,
          ].filter((r): r is [string, string] => r !== null).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 text-[0.8125rem]">
              <span className="text-graphite-600">{k}</span>
              <span className="tabular-nums text-ink-900">{v}</span>
            </div>
          ))}
          <div className="flex justify-between gap-6 border-t border-paper-300 pt-2 text-[0.9375rem] font-semibold">
            <span className="text-ink-900">Total</span>
            <span className="tabular-nums text-ink-900">{money(preview.totalCents)}</span>
          </div>
          <p className={`${t.hint} text-graphite-500`}>Recalculated on the server when you save.</p>
        </div>
      </section>

      <FormSection title="Notes" columns={1}>
        <TextArea name="notes" label="Notes shown on the invoice" defaultValue={invoice?.notes ?? defaults.notes} className={spanAll} />
      </FormSection>

      <div className="border-t border-paper-200 pt-5">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Save className="size-3.5" aria-hidden="true" />}
          {invoice?.id ? "Save changes" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
