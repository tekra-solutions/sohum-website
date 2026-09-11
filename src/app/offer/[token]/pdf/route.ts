import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerVersions, offerSignatures } from "@/db/schema";
import { resolveOfferToken } from "@/lib/offers/data";
import { hasVerifiedOfferSession } from "@/lib/offers/candidate-session";
import { downloadOfferPdf } from "@/lib/storage/offers";
import { audit } from "@/lib/audit";

/**
 * Token-and-OTP-session-gated PDF download, mirroring the admin resume
 * download route's pattern but with a verified candidate session in place
 * of an admin session. The storage path never reaches the browser.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 512) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await resolveOfferToken(token);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await hasVerifiedOfferSession(row.offer.id, row.offer.secureTokenHash))) {
    return NextResponse.json({ error: "Verification required" }, { status: 403 });
  }

  // ?signed=1 serves the countersigned document produced at acceptance. It is
  // a separate stored object from the unsigned letter, never an overwrite of
  // it, so both remain retrievable.
  const wantsSigned = new URL(request.url).searchParams.get("signed") === "1";
  let storagePath: string | null = null;
  let filename = "offer-letter.pdf";

  if (wantsSigned) {
    const [signature] = await db.select().from(offerSignatures).where(eq(offerSignatures.offerId, row.offer.id));
    if (!signature?.signedPdfPath) return NextResponse.json({ error: "Not found" }, { status: 404 });
    storagePath = signature.signedPdfPath;
    filename = "offer-letter-signed.pdf";
  } else {
    const versionId = row.offer.acceptedVersionId ?? row.offer.currentVersionId;
    if (!versionId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, versionId));
    if (!version?.pdfStoragePath) return NextResponse.json({ error: "Not found" }, { status: 404 });
    storagePath = version.pdfStoragePath;
  }

  try {
    const blob = await downloadOfferPdf(storagePath);
    await audit({
      adminId: null,
      action: "OFFER_VIEWED",
      entityType: "offer",
      entityId: row.offer.id,
      metadata: { applicationId: row.application.id, actor: "candidate", asset: wantsSigned ? "signed-pdf" : "pdf" },
    });
    return new NextResponse(blob.stream(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[offer-pdf] download failed", { offerId: row.offer.id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not retrieve the file." }, { status: 502 });
  }
}
