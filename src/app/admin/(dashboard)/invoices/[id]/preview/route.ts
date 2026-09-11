import { NextResponse } from "next/server";
import { requireInvoice } from "@/lib/invoices/access";
import { buildInvoiceDocument } from "@/lib/invoices/send-actions";
import { renderInvoiceHtml } from "@/lib/invoices/render-html";

/**
 * Serves the invoice document as a raw HTML page. renderInvoiceHtml()
 * returns a complete <!doctype html> document — the same string the PDF is
 * rendered from — so wrapping it in the admin shell would nest documents and
 * let the preview drift from the PDF.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireInvoice(id);
  const doc = await buildInvoiceDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(renderInvoiceHtml(doc), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
