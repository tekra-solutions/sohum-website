import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerVersions } from "@/db/schema";
import { resolveOfferToken } from "@/lib/offers/data";
import { hasVerifiedOfferSession } from "@/lib/offers/candidate-session";
import { downloadOfferPdf } from "@/lib/storage/offers";
import { audit } from "@/lib/audit";

/**
 * Token-and-OTP-session-gated PDF download, mirroring the admin resume
 * download route's pattern but with a verified candidate session in place
 * of an admin session. The storage path never reaches the browser.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 512) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await resolveOfferToken(token);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await hasVerifiedOfferSession(row.offer.id, row.offer.secureTokenHash))) {
    return NextResponse.json({ error: "Verification required" }, { status: 403 });
  }

  const versionId = row.offer.acceptedVersionId ?? row.offer.currentVersionId;
  if (!versionId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, versionId));
  if (!version?.pdfStoragePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const blob = await downloadOfferPdf(version.pdfStoragePath);
    await audit({
      adminId: null,
      action: "OFFER_VIEWED",
      entityType: "offer",
      entityId: row.offer.id,
      metadata: { applicationId: row.application.id, actor: "candidate", asset: "pdf" },
    });
    return new NextResponse(blob.stream(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=\"offer-letter.pdf\"",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[offer-pdf] download failed", { offerId: row.offer.id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not retrieve the file." }, { status: 502 });
  }
}
