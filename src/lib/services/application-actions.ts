"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationEvents, applications } from "@/db/schema";
import { notesSchema, statusChangeSchema } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export async function changeStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = statusChangeSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return;

  const current = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    columns: { status: true, reference: true },
  });
  if (!current || current.status === parsed.data.status) return;

  await db
    .update(applications)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(applications.id, id));

  // The event log is what powers the timeline and the "changed_by" record.
  await db.insert(applicationEvents).values({
    applicationId: id,
    fromStatus: current.status,
    toStatus: parsed.data.status,
    changedBy: admin.id,
    note: parsed.data.note || null,
  });

  await audit({
    adminId: admin.id,
    action: "ADMIN_CHANGED_APPLICATION_STATUS",
    entityType: "application",
    entityId: id,
    metadata: { from: current.status, to: parsed.data.status, reference: current.reference },
  });

  revalidatePath(`/admin/applications/${id}`);
  revalidatePath("/admin/applications");
  revalidatePath("/admin");
}

export async function saveNotesAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = notesSchema.safeParse({ internalNotes: formData.get("internalNotes") ?? "" });
  if (!parsed.success) return;

  await db
    .update(applications)
    .set({ internalNotes: parsed.data.internalNotes || null, updatedAt: new Date() })
    .where(eq(applications.id, id));

  await audit({
    adminId: admin.id,
    action: "ADMIN_UPDATED_NOTES",
    entityType: "application",
    entityId: id,
  });

  revalidatePath(`/admin/applications/${id}`);
}
