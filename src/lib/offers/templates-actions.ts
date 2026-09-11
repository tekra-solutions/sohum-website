"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerTemplates, auditLogs } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { offerTemplateSchema } from "./validation";
import { defaultOfferTemplates } from "./seed-templates";
import type { ActionState } from "@/lib/ats/actions";

export async function saveOfferTemplateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requirePermission("settings");
  const parsed = offerTemplateSchema.safeParse({ ...Object.fromEntries(form), isActive: form.get("isActive") === "1" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const id = String(form.get("id") ?? "");
  try {
    await db.transaction(async tx => {
      if (id) await tx.update(offerTemplates).set({ ...parsed.data, updatedAt: new Date() }).where(eq(offerTemplates.id, id));
      else await tx.insert(offerTemplates).values({ ...parsed.data, createdBy: admin.id });
      await tx.insert(auditLogs).values({ adminId: admin.id, action: "OFFER_TEMPLATE_SAVED", entityType: "offer_template", entityId: id || null });
    });
  } catch { return { error: "Could not save. Template names must be unique." }; }
  revalidatePath("/admin/settings/offer-templates");
  return { success: "Template saved." };
}

/**
 * Inserts the starter templates only on explicit admin click, never
 * silently on boot — nobody should mistake sample content for reviewed
 * legal language they didn't ask to load.
 */
export async function seedDefaultOfferTemplatesAction(previous: ActionState): Promise<ActionState> {
  void previous; // Required by the useActionState/WorkflowForm contract.
  const admin = await requirePermission("settings");
  const existing = await db.select({ name: offerTemplates.name }).from(offerTemplates);
  const existingNames = new Set(existing.map(t => t.name));
  const toInsert = defaultOfferTemplates.filter(t => !existingNames.has(t.name));
  if (!toInsert.length) return { success: "Starter templates are already present." };
  await db.transaction(async tx => {
    await tx.insert(offerTemplates).values(toInsert.map(t => ({ ...t, createdBy: admin.id })));
    await tx.insert(auditLogs).values({ adminId: admin.id, action: "OFFER_TEMPLATE_SAVED", entityType: "offer_template", metadata: { seeded: toInsert.map(t => t.name) } });
  });
  revalidatePath("/admin/settings/offer-templates");
  return { success: `Loaded ${toInsert.length} starter template(s). Review before use.` };
}
