"use server";

import { revalidatePath } from "next/cache";
import { sql, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
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

export async function setAdminActiveAction(formData: FormData) {
  const session = await requireAdmin();
  if (!canManageAdmins(session.role)) return;

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  // Deactivating yourself would lock you out of the account you are using.
  if (id === session.id) return;

  const target = await db.query.admins.findFirst({
    where: eq(admins.id, id),
    columns: { email: true },
  });
  if (!target) return;

  await db
    .update(admins)
    .set({ isActive: active, updatedAt: new Date() })
    .where(eq(admins.id, id));

  await audit({
    adminId: session.id,
    action: active ? "ADMIN_ACTIVATED_ADMIN" : "ADMIN_DEACTIVATED_ADMIN",
    entityType: "admin",
    entityId: id,
    metadata: { email: target.email },
  });

  revalidatePath("/admin/settings");
}

/** Async because this module is "use server". */
export async function listAdmins() {
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
