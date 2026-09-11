import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";

/**
 * Every invoice read and write goes through the `invoices` permission.
 * Unlike candidates there is no per-row scoping: an admin who may see
 * invoicing may see all of it, which matches how a finance function works.
 */
const loadInvoice = cache(async (id: string) => {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row ?? null;
});

export async function requireInvoice(id: string) {
  const admin = await requirePermission("invoices");
  if (!z.uuid().safeParse(id).success) notFound();
  const invoice = await loadInvoice(id);
  if (!invoice) notFound();
  return { admin, invoice };
}

export async function requireInvoiceAccess() {
  return requirePermission("invoices");
}
