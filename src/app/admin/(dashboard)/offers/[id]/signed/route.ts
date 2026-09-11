import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerSignatures } from "@/db/schema";
import { requireOffer } from "@/lib/offers/access";
import { downloadOfferPdf } from "@/lib/storage/offers";
import { audit } from "@/lib/audit";

/**
 * Streams the countersigned offer PDF to an authorized administrator.
 *
 * Authorization is `requireOffer`, the same gate as every other offer screen,
 * so an offer inherits its parent application's visibility exactly — a
 * recruiter who cannot see the candidate cannot fetch their signed document.
 * The storage path never reaches the browser, and the bucket stays private:
 * the file is read server-side with the service-role key and streamed back.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin, offer, application } = await requireOffer(id, "offers");

  const [signature] = await db.select().from(offerSignatures).where(eq(offerSignatures.offerId, offer.id));
  if (!signature?.signedPdfPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const blob = await downloadOfferPdf(signature.signedPdfPath);
    await audit({
      adminId: admin.id,
      action: "OFFER_VIEWED",
      entityType: "offer",
      entityId: offer.id,
      metadata: { applicationId: application.id, asset: "signed-pdf" },
    });
    return new NextResponse(blob.stream(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="offer-letter-signed.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[offer-signed-pdf] download failed", {
      offerId: offer.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not retrieve the file." }, { status: 502 });
  }
}
