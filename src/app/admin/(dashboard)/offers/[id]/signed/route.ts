import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOffer } from "@/lib/offers/access";
import { ensureSignedDocument } from "@/lib/documents/signed-files";
import { downloadOfferPdf } from "@/lib/storage/offers";
import { audit } from "@/lib/audit";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  const { admin } = await requireOffer(id, "offers");
  try {
    const path = await ensureSignedDocument("offer", id);
    if (!path) return new NextResponse("No signed document", { status: 404 });
    const blob = await downloadOfferPdf(path);
    await audit({ adminId: admin.id, action: "SIGNED_PDF_GENERATED", entityType: "offer", entityId: id, metadata: { download: true } });
    return new NextResponse(blob.stream(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="offer-signed.pdf"', "Cache-Control": "private, no-store" } });
  } catch { return new NextResponse("The signed PDF is temporarily unavailable. Please retry.", { status: 502 }); }
}
