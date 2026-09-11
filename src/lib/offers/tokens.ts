import "server-only";
import { randomBytes, randomInt, createHash } from "node:crypto";

/**
 * Secure offer link token. 256 bits of entropy from the platform CSPRNG,
 * URL-safe. Generated server-side only and never persisted — only its hash
 * is stored (see hashOfferToken). The risk model for a token this long is
 * leakage, not guessing, so a fast hash is correct here: see hashOfferToken.
 */
export function generateOfferToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * sha256, not bcrypt. Bcrypt (and other deliberately slow KDFs) defend
 * low-entropy, guessable secrets against offline brute force — a password,
 * a 6-digit code. A 256-bit random token has no meaningful brute-force
 * exposure regardless of hash speed; the only realistic attack is
 * interception of the token itself, which a slow hash does nothing to
 * prevent. A fast, collision-resistant hash is the correct and sufficient
 * choice, and keeps lookup (by indexed hash equality) cheap.
 */
export function hashOfferToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Six digits, zero-padded, drawn from the platform CSPRNG (never Math.random). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Same sha256 helper as the token. Unlike a password, the defense against
 * brute force here is the attempt cap and short expiry enforced by the
 * caller (offer_otp_codes.attemptCount), not hash cost — a 6-digit space is
 * small enough that hash speed is not the deciding factor either way.
 */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
