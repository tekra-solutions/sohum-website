"use client";
import { useState } from "react";
import { emailCandidateAction } from "@/lib/ats/actions";
import { WorkflowForm, WorkflowField } from "./WorkflowForm";
import { defaultEmailTemplates } from "@/lib/ats/templates";
import { control } from "./form";
export function CandidateEmail({ applicationId, templates, values, email, requestKey }: { applicationId: string; templates: { name: string; subject: string; body: string }[]; values: Record<string, string>; email: string; requestKey: string }) {
  const all = [...templates, ...defaultEmailTemplates.filter(t => !templates.some(s => s.name === t.name))];
  const [selected, setSelected] = useState("");
  const template = all.find(t => t.name === selected);
  const render = (value: string) => value.replace(/{{\s*([^{}]+?)\s*}}/g, (match, key) => values[key] || match);
  return <div className="space-y-3"><p className="break-all text-xs text-graphite-600">To: {email}</p><label className="block text-xs">Template<select className={`${control} mt-1`} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Custom</option>{all.map(t => <option key={t.name}>{t.name}</option>)}</select></label>
    <WorkflowForm key={selected} applicationId={applicationId} action={emailCandidateAction} label="Send email">
      <input type="hidden" name="requestKey" value={requestKey} /><input type="hidden" name="templateName" value={selected || "Custom"} />
      <WorkflowField name="subject" label="Subject" value={render(template?.subject ?? "")} required />
      <WorkflowField name="body" label="Message — review before sending" value={render(template?.body ?? "")} multiline required />
    </WorkflowForm></div>;
}
