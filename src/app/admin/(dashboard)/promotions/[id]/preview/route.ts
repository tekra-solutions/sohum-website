import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { promotionVersions } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { promotionDetail } from "@/lib/promotions/data";

/**
 * Serves a promotion version as a raw HTML page.
 *
 * Renders the frozen renderedHtml rather than re-rendering, so the preview is
 * byte-identical to what the employee sees and to what the PDF is made from.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("employees");
  const { id } = await params;
  const detail = await promotionDetail(id);
  if (!detail?.version) return new NextResponse("Not found", { status: 404 });

  const url = new URL(_request.url);
  const requested = url.searchParams.get("version");
  let html = detail.version.renderedHtml;
  if (requested) {
    const [v] = await db.select().from(promotionVersions)
      .where(eq(promotionVersions.id, requested));
    if (v && v.promotionId === id) html = v.renderedHtml;
  }

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "Cache-Control": "private, no-store", "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'" },
  });
}
