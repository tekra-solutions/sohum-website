/**
 * Admin sessions.
 *
 * A signed JWT in an httpOnly cookie. We deliberately do not store the role in
 * a way the client can influence: the token is signed server-side, and every
 * privileged call re-reads the admin row so a deactivated account loses access
 * immediately rather than at token expiry.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { serverEnv } from "@/lib/env";

const COOKIE = "sohum_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionAdmin = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECRUITER" | "SUPER_ADMIN";
};

const key = () => new TextEncoder().encode(serverEnv().authSecret);

export async function createSession(adminId: string) {
  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * Resolves the signed-in admin, or null. Re-reads the database每 call so
 * deactivation takes effect immediately.
 */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  let adminId: string;
  try {
    const { payload } = await jwtVerify(token, key());
    if (typeof payload.sub !== "string") return null;
    adminId = payload.sub;
  } catch {
    return null; // expired or tampered
  }

  let row;
  try {
    row = await db.query.admins.findFirst({
      where: eq(admins.id, adminId),
      columns: { id: true, name: true, email: true, role: true, isActive: true },
    });
  } catch (err) {
    // An unreachable database must fail closed, not 500.
    console.error("[auth] admin lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
  if (!row || !row.isActive) return null;

  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

/**
 * Returns the signed-in admin or redirects to the login page.
 *
 * Redirecting rather than throwing keeps an expired session from surfacing as a
 * 500 with a stack trace. Call at the top of every admin page and mutation.
 */
export async function requireAdmin(): Promise<SessionAdmin> {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export const SESSION_COOKIE = COOKIE;
