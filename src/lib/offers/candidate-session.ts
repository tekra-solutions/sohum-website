/**
 * Candidate-facing offer session — issued only after OTP verification.
 *
 * Mirrors src/lib/auth/session.ts's signed-JWT-in-an-httpOnly-cookie pattern,
 * but is a completely separate mechanism: a distinct cookie name, and a
 * payload scoped to one specific offer's token hash rather than an admin id.
 * This is what stops a verified session for candidate A's offer from ever
 * being replayed against candidate B's offer link — the cookie only ever
 * matches the one offer it was minted for.
 */
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

const COOKIE = "sohum_offer_session";
const MAX_AGE_SECONDS = 30 * 60; // 30 minutes

const key = () => new TextEncoder().encode(serverEnv().authSecret);

export async function createOfferSession(offerId: string, tokenHash: string) {
  const token = await new SignJWT({ offerId, tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/offer",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyOfferSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * True only if a verified session exists for exactly this offer's token
 * hash — a session minted for a different offer never matches here.
 */
export async function hasVerifiedOfferSession(offerId: string, tokenHash: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.offerId === offerId && payload.tokenHash === tokenHash;
  } catch {
    return false; // expired or tampered
  }
}
