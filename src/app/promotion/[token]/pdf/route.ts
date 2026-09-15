import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { promotionVersions, auditLogs } from "@/db/schema";
import { resolvePromotionToken } from "@/lib/promotions/data";
import { hasVerifiedPromotionSession } from "@/lib/promotions/employee-session";
import { ensureSignedDocument } from "@/lib/documents/signed-files";
import { downloadOfferPdf } from "@/lib/storage/offers";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { letterheadFooterTemplate, letterheadHeaderTemplate } from "@/lib/documents/chrome";
import { sohumLetterheadDataUri } from "@/lib/documents/logo";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await resolvePromotionToken(token);
  if (!row) return new NextResponse("Not found", { status: 404 });
  if (!await hasVerifiedPromotionSession(row.promotion.id, row.promotion.secureTokenHash)) return new NextResponse("Verification required", { status: 403 });
  try {
    let blob: Blob;
    if (new URL(request.url).searchParams.get("signed") === "1") {
      const path = await ensureSignedDocument("promotion", row.promotion.id);
      if (!path) return new NextResponse("No signed document", { status: 404 });
      blob = await downloadOfferPdf(path);
    } else {
      const [version] = await db.select().from(promotionVersions).where(eq(promotionVersions.id, row.promotion.acceptedVersionId ?? row.promotion.currentVersionId!));
      if (!version) return new NextResponse("Not found", { status: 404 });
      blob = version.pdfStoragePath ? await downloadOfferPdf(version.pdfStoragePath) : new Blob([new Uint8Array(await renderOfferPdf(version.renderedHtml, {
        headerTemplate: letterheadHeaderTemplate(sohumLetterheadDataUri), footerTemplate: letterheadFooterTemplate(),
      }))]);
    }
    await db.insert(auditLogs).values({ action: "PROMOTION_VIEWED", entityType: "promotion", entityId: row.promotion.id, metadata: { asset: "pdf", actor: "employee" } });
    return new NextResponse(blob.stream(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="promotion-letter.pdf"', "Cache-Control": "private, no-store" } });
  } catch { return new NextResponse("PDF temporarily unavailable. Please retry.", { status: 502 }); }
}
