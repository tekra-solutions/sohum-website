import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { resolveInvoiceToken } from "@/lib/invoices/client-access";
import { downloadInvoicePdf } from "@/lib/storage/invoices";
import { renderInvoiceHtml } from "@/lib/invoices/render-html";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { buildInvoiceDocument } from "@/lib/invoices/send-actions";

/**
 * Token-gated invoice PDF. The storage path never reaches the browser and
 * there is no permanent public URL: the bytes are streamed through here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await resolveInvoiceToken(token);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = row.invoice;
  try {
    let body: Buffer | Blob;
    if (invoice.pdfStoragePath) {
      body = await downloadInvoicePdf(invoice.pdfStoragePath);
    } else {
      // No stored PDF (storage unconfigured, or sent before generation) —
      // render on demand so the client is never left without their invoice.
      const doc = await buildInvoiceDocument(invoice.id);
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      body = await renderOfferPdf(renderInvoiceHtml(doc));
    }
    await db.insert(auditLogs).values({
      adminId: null, action: "INVOICE_VIEWED", entityType: "invoice", entityId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, actor: "client", asset: "pdf" },
    });
    const stream = body instanceof Blob ? body.stream() : new Blob([new Uint8Array(body)]).stream();
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[invoice-pdf] client download failed", { invoiceId: invoice.id, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not retrieve the invoice." }, { status: 502 });
  }
}
