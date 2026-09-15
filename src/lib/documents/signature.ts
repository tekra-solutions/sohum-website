import { escapeHtml } from "@/lib/ats/policy";

/** Preserve the issued letter verbatim; append evidence tied to that version. */
export function appendElectronicSignature(html: string, signature: {
  name: string; email: string; value: string; signedAt: Date; consentText: string;
  verificationMethod: string; reference: string; documentHash?: string | null;
}) {
  const e = escapeHtml;
  const record = `<section style="break-before:page;font-family:Arial,sans-serif;color:#16233f;line-height:1.5">
    <h1 style="font-size:18pt">Electronic signature record</h1>
    <p>This record accompanies the unchanged letter on the preceding pages.</p>
    <p><strong>Document:</strong> ${e(signature.reference)}</p>
    <p><strong>Signed by:</strong> ${e(signature.name)}<br><strong>Email:</strong> ${e(signature.email)}<br>
    <strong>Signed at:</strong> ${e(signature.signedAt.toISOString())}<br>
    <strong>Verification:</strong> ${e(signature.verificationMethod)}</p>
    <p style="font-family:cursive;font-size:24pt;overflow-wrap:anywhere">${e(signature.value)}</p>
    <h2 style="font-size:12pt">Electronic consent</h2><p>${e(signature.consentText)}</p>
    ${signature.documentHash ? `<p style="font-size:8pt;overflow-wrap:anywhere"><strong>Content SHA-256:</strong> ${e(signature.documentHash)}</p>` : ""}
  </section>`;
  return html.includes("</body>") ? html.replace("</body>", record + "</body>") : html + record;
}
