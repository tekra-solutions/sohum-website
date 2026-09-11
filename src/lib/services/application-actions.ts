"use server";
import { candidateAction } from "@/lib/ats/actions";
/** Compatibility entry points retain server-side authorization. */
export async function changeStatusAction(form: FormData) {
  form.set("applicationId", String(form.get("id") ?? "")); form.set("kind", "status");
  const result = await candidateAction({}, form);
  if (result.error) throw new Error(result.error);
}
export async function saveNotesAction(form: FormData) {
  form.set("applicationId", String(form.get("id") ?? "")); form.set("kind", "note");
  form.set("note", String(form.get("internalNotes") ?? ""));
  const result = await candidateAction({}, form);
  if (result.error) throw new Error(result.error);
}
