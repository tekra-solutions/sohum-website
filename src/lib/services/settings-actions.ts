"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { passwordChangeSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/audit";

export type SettingsState = { ok?: boolean; error?: string; errors?: Record<string, string> };

export async function changePasswordAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await requireAdmin();

  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const admin = await db.query.admins.findFirst({
    where: eq(admins.id, session.id),
    columns: { passwordHash: true },
  });
  if (!admin) return { error: "Account not found." };

  const valid = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
  if (!valid) {
    return { errors: { currentPassword: "That is not your current password." } };
  }

  await db
    .update(admins)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), updatedAt: new Date() })
    .where(eq(admins.id, session.id));

  await audit({
    adminId: session.id,
    action: "ADMIN_CHANGED_PASSWORD",
    entityType: "admin",
    entityId: session.id,
  });

  return { ok: true };
}
