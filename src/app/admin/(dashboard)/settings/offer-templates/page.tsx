import { asc } from "drizzle-orm";
import { db } from "@/db";
import { offerTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { saveOfferTemplateAction, seedDefaultOfferTemplatesAction } from "@/lib/offers/templates-actions";
import { offerTemplateVariables } from "@/lib/offers/variables";
import { WorkflowForm, WorkflowField as Field } from "@/components/admin/WorkflowForm";
import { AdminHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offer letter templates" };

const categoryOptions = [
  { value: "FULL_TIME", label: "Full-Time Employee" },
  { value: "CONTRACT", label: "Contract Employee" },
  { value: "REMOTE", label: "Remote Employee" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CUSTOM", label: "Custom" },
];

export default async function OfferTemplatesPage() {
  await requirePermission("settings");
  const saved = await db.select().from(offerTemplates).orderBy(asc(offerTemplates.name));
  const rows = [...saved, { id: "", name: "", category: "CUSTOM" as const, subject: "", bodyHtml: "", termsHtml: "", acknowledgementsHtml: "", isActive: true }];

  return (
    <>
      <AdminHeader title="Offer letter templates" description="Reusable offer content, editable before every offer." />
      <div className="space-y-5 p-5 sm:p-8">
        <div className="rounded-[4px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.08] p-4 text-xs text-[#7a5c00]">
          <strong>Every template requires legal review before use.</strong> This platform does not generate
          legally approved language on its own — templates are only as sound as what your organization puts in
          them. Every generated offer carries a standing note in its footer stating that its content was produced
          from a configurable template and not reviewed by counsel for that specific offer.
        </div>

        <p className="text-xs text-graphite-600">
          Supported variables: {offerTemplateVariables.map(v => `{{${v}}}`).join(", ")}
        </p>
        <p className="text-xs text-graphite-600">
          The offer document has three pages: the summary and compensation tables are generated from the
          offer itself, while the prose on each page comes from the fields below. Leaving page 2 or 3 empty
          is allowed — the document states that no terms were configured rather than supplying its own.
        </p>

        {saved.length === 0 && (
          <WorkflowForm action={seedDefaultOfferTemplatesAction} label="Load starter templates">
            <p className="text-xs text-graphite-500">
              Loads one starter template per category (Full-Time, Contract, Remote, Internship), plus the
              Sohum Systems standard offer. All are sample content requiring legal review before you issue
              an offer from them.
            </p>
          </WorkflowForm>
        )}

        {rows.map((row, index) => (
          <details key={row.id || index} className="rounded-[4px] border border-paper-300 bg-white p-5">
            <summary className="cursor-pointer text-sm font-medium text-ink-900">
              {row.name || "Create template"}
              {row.id && !row.isActive ? " · Inactive" : ""}
            </summary>
            <div className="mt-4 max-w-2xl">
              <WorkflowForm action={saveOfferTemplateAction} label="Save template">
                <input type="hidden" name="id" value={row.id} />
                <Field name="name" label="Template name" value={row.name} required />
                <Field name="category" label="Category" value={row.category} options={categoryOptions} />
                <Field name="subject" label="Subject" value={row.subject} required />
                <Field name="bodyHtml" label="Page 1 — Offer summary body (HTML)" value={row.bodyHtml} multiline required />
                <Field name="termsHtml" label="Page 2 — Employment terms (HTML, optional)" value={row.termsHtml ?? ""} multiline />
                <Field name="acknowledgementsHtml" label="Page 3 — Acknowledgements (HTML, optional)" value={row.acknowledgementsHtml ?? ""} multiline />
                <Field
                  name="isActive" label="Status" value={row.isActive ? "1" : "0"}
                  options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]}
                />
              </WorkflowForm>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
