import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerVersions } from "@/db/schema";
import { requireOffer } from "@/lib/offers/access";

/**
 * Serves the offer's frozen HTML as a raw document, not a React page — the
 * stored renderedHtml is already a complete <!doctype html> document (the
 * same one pdf.ts renders to a PDF), so wrapping it in the admin shell's own
 * <html> would nest documents. A route handler returning it directly keeps
 * the preview pixel-identical to the eventual PDF.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { offer } = await requireOffer(id, "offers");
  if (!offer.currentVersionId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId));
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(version.renderedHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
