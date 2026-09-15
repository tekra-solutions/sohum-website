"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { admins, auditLogs } from "@/db/schema";
import { createAdminSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { canManageAdmins } from "@/lib/auth/roles";

export type CreateAdminState = {
  ok?: boolean;
  createdEmail?: string;
  errors?: Record<string, string>;
  message?: string;
};

export async function createAdminAction(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  const session = await requireAdmin();
  if (!canManageAdmins(session.role)) {
    return { message: "Only a super admin can create admin accounts." };
  }

  const parsed = createAdminSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, message: "Please correct the highlighted fields." };
  }
  const v = parsed.data;

  const existing = await db.query.admins.findFirst({
    where: sql`lower(${admins.email}) = ${v.email}`,
    columns: { id: true },
  });
  if (existing) {
    return { errors: { email: "An admin with this email already exists." } };
  }

  try {
    const [row] = await db
      .insert(admins)
      .values({
        name: v.name,
        email: v.email,
        role: v.role,
        passwordHash: await hashPassword(v.password),
      })
      .returning({ id: admins.id, email: admins.email });

    await audit({
      adminId: session.id,
      action: "ADMIN_CREATED_ADMIN",
      entityType: "admin",
      entityId: row!.id,
      // The new account's password is never logged, only who was created.
      metadata: { email: row!.email, role: v.role },
    });

    revalidatePath("/admin/settings");
    return { ok: true, createdEmail: row!.email };
  } catch (err) {
    console.error("[admins] create failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { message: "Could not create this admin. Please try again." };
  }
}

export async function setAdminActiveAction(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireAdmin();
  if (!canManageAdmins(session.role)) return { error: "Only a super admin can manage account access." };
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid account. Reload the page and try again." };
  const { id } = parsed.data;
  const active = parsed.data.active === "true";
  if (id === session.id) return { error: "You cannot change your own account access." };
  try {
    await db.transaction(async tx => {
      const [target] = await tx.select().from(admins).where(eq(admins.id, id)).for("update");
      if (!target) throw new Error("Account not found.");
      if (target.isActive === active) return;
      await tx.update(admins).set({ isActive: active, updatedAt: new Date() }).where(eq(admins.id, id));
      await tx.insert(auditLogs).values({ adminId: session.id, action: active ? "ADMIN_ACTIVATED_ADMIN" : "ADMIN_DEACTIVATED_ADMIN", entityType: "admin", entityId: id, metadata: { email: target.email } });
    });
  } catch { return { error: "Could not update access. Please try again." }; }
  revalidatePath("/admin/settings");
  return { success: active ? "Account access enabled." : "Account access disabled." };
}

/** Async because this module is "use server". */
export async function listAdmins() {
  const session = await requireAdmin();
  if (!canManageAdmins(session.role)) return [];
  return db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
      lastLoginAt: admins.lastLoginAt,
      createdAt: admins.createdAt,
    })
    .from(admins)
    .orderBy(asc(admins.name));
}
