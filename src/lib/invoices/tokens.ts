import "server-only";
import { randomBytes, createHash } from "node:crypto";

/**
 * Client invoice link tokens. Same design as the offer tokens: 256 bits of
 * CSPRNG entropy, and only the sha256 hash is ever stored. A high-entropy
 * token's risk is leakage, not guessing, so a fast collision-resistant hash
 * is correct — bcrypt buys nothing here and costs latency.
 */
export function generateInvoiceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvoiceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
