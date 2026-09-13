/**
 * Employee-facing promotion session — issued only after OTP verification.
 *
 * The same mechanism as offers/candidate-session.ts, with its own cookie name
 * and path so a verified offer session can never be replayed against a
 * promotion link, or vice versa. The payload is scoped to one specific
 * promotion's token hash, so a session minted for one employee's promotion
 * never matches another's.
 */
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

const COOKIE = "sohum_promotion_session";
const MAX_AGE_SECONDS = 30 * 60;

const key = () => new TextEncoder().encode(serverEnv().authSecret);

export async function createPromotionSession(promotionId: string, tokenHash: string) {
  const token = await new SignJWT({ promotionId, tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/promotion",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyPromotionSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    path: "/promotion", maxAge: 0, httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "lax",
  });
}

/** True only for a verified session matching exactly this promotion. */
export async function hasVerifiedPromotionSession(promotionId: string, tokenHash: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.promotionId === promotionId && payload.tokenHash === tokenHash;
  } catch {
    return false;
  }
}
