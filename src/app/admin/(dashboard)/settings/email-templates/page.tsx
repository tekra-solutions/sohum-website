import { asc } from "drizzle-orm";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { saveEmailTemplateAction } from "@/lib/ats/actions";
import { templateVariables } from "@/lib/ats/policy";
import { defaultEmailTemplates } from "@/lib/ats/templates";
import { WorkflowForm, WorkflowField as Field } from "@/components/admin/WorkflowForm";
import { AdminHeader } from "@/components/admin/ui";
export const dynamic = "force-dynamic";
export default async function TemplatesPage() {
  await requirePermission("settings");
  const saved = await db.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
  const rows = [...saved, ...defaultEmailTemplates.filter(t => !saved.some(s => s.name === t.name)).map(t => ({ ...t, id: "", isActive: true })), { id: "", name: "", subject: "", body: "", isActive: true }];
  return <><AdminHeader title="Email templates" description="Reusable candidate messages, editable before every send." /><div className="space-y-5 p-5 sm:p-8"><p className="text-xs text-graphite-600">Supported variables: {templateVariables.map(v => `{{${v}}}`).join(", ")}</p>{rows.map((t, index) => <details key={t.id || index} className="rounded-[4px] border border-paper-300 bg-white p-5"><summary className="cursor-pointer text-sm font-medium text-ink-900">{t.name || "Create template"}{!t.isActive ? " · Inactive" : ""}</summary><div className="mt-4 max-w-2xl"><WorkflowForm action={saveEmailTemplateAction} label="Save template"><input type="hidden" name="id" value={t.id} /><Field name="name" label="Template name" value={t.name} required /><Field name="subject" label="Subject" value={t.subject} required /><Field name="body" label="Body" value={t.body} multiline required /><Field name="isActive" label="Status" value={t.isActive ? "1" : "0"} options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]} /></WorkflowForm></div></details>)}</div></>;
}
