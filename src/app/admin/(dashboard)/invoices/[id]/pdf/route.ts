import { NextResponse } from "next/server";
import { requireInvoice } from "@/lib/invoices/access";
import { buildInvoiceDocument } from "@/lib/invoices/send-actions";
import { renderInvoiceHtml } from "@/lib/invoices/render-html";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { downloadInvoicePdf } from "@/lib/storage/invoices";
import { audit } from "@/lib/audit";

/** Admin PDF download. Streams the stored file when present, otherwise
 *  renders on demand so a draft can always be previewed as a PDF. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin, invoice } = await requireInvoice(id);
  try {
    let body: Buffer | Blob;
    if (invoice.pdfStoragePath) {
      body = await downloadInvoicePdf(invoice.pdfStoragePath);
    } else {
      const doc = await buildInvoiceDocument(id);
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      body = await renderOfferPdf(renderInvoiceHtml(doc));
    }
    await audit({
      adminId: admin.id, action: "INVOICE_PDF_GENERATED", entityType: "invoice", entityId: id,
      metadata: { invoiceNumber: invoice.invoiceNumber, download: true },
    });
    const stream = body instanceof Blob ? body.stream() : new Blob([new Uint8Array(body)]).stream();
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[invoice-pdf] admin download failed", { invoiceId: id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not generate the invoice PDF." }, { status: 502 });
  }
}
