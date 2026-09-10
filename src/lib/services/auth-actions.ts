"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionAdmin } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { audit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string };

/**
 * Admin sign-in.
 *
 * Failures are deliberately indistinguishable: unknown email, wrong password
 * and deactivated account all return the same message, so the form cannot be
 * used to enumerate valid admin addresses.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  const limited = await rateLimit({ key: `login:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Enter your email address and password." };
  }
  const { email, password } = parsed.data;

  let admin;
  try {
    admin = await db.query.admins.findFirst({
      where: sql`lower(${admins.email}) = ${email}`,
      columns: { id: true, passwordHash: true, isActive: true, email: true },
    });
  } catch (err) {
    console.error("[auth] login lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }

  const generic = "Incorrect email or password.";

  if (!admin || !admin.isActive) {
    // Compare against a dummy hash so a missing account and a wrong password
    // take a comparable amount of time.
    await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu");
    await audit({
      action: "ADMIN_LOGIN_FAILED",
      entityType: "admin",
      metadata: { email, reason: admin ? "inactive" : "unknown" },
    });
    return { error: generic };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    await audit({
      adminId: admin.id,
      action: "ADMIN_LOGIN_FAILED",
      entityType: "admin",
      entityId: admin.id,
      metadata: { reason: "bad_password" },
    });
    return { error: generic };
  }

  await db
    .update(admins)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(sql`${admins.id} = ${admin.id}`);

  await createSession(admin.id);
  await audit({ adminId: admin.id, action: "ADMIN_LOGIN", entityType: "admin", entityId: admin.id });

  redirect("/admin");
}

export async function logoutAction() {
  const admin = await getSessionAdmin();
  if (admin) {
    await audit({
      adminId: admin.id,
      action: "ADMIN_LOGOUT",
      entityType: "admin",
      entityId: admin.id,
    });
  }
  await destroySession();
  redirect("/admin/login");
}
