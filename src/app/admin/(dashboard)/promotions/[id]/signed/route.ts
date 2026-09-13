import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { promotionSignatures } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { audit } from "@/lib/audit";
import { signedOfferPdfUrl } from "@/lib/storage/offers";

/**
 * Redirects to a short-lived signed URL for the stored signed PDF.
 *
 * The file itself is never public: the bucket is private and the URL expires,
 * so access is always mediated by this permission check and recorded.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission("employees");
  const { id } = await params;

  const [signature] = await db.select().from(promotionSignatures)
    .where(eq(promotionSignatures.promotionId, id));
  if (!signature?.signedPdfPath) return new NextResponse("Not found", { status: 404 });

  await audit({
    adminId: admin.id, action: "PROMOTION_PDF_GENERATED",
    entityType: "promotion", entityId: id,
    metadata: { accessed: signature.signedPdfPath },
  });

  const url = await signedOfferPdfUrl(signature.signedPdfPath, 60);
  if (!url) return new NextResponse("Storage is not configured", { status: 503 });
  return NextResponse.redirect(url);
}
