import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, clients } from "@/db/schema";
import { hashInvoiceToken } from "./tokens";
import { clientCanView, type InvoiceStatus } from "./policy";

/**
 * Resolves a client-facing token to its invoice. Returns null for every
 * failure mode — unknown, expired, revoked, still draft — so the page can
 * render one uniform message and a guess reveals nothing.
 */
export async function resolveInvoiceToken(token: string) {
  if (!token || token.length > 512) return null;
  const [row] = await db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.secureTokenHash, hashInvoiceToken(token)))
    .limit(1);
  if (!row) return null;
  if (!clientCanView(row.invoice.status as InvoiceStatus)) return null;
  if (row.invoice.tokenExpiresAt && row.invoice.tokenExpiresAt <= new Date()) return null;
  return row;
}
