import "server-only";
import { shell } from "@/lib/email/templates";
import { escapeHtml } from "@/lib/ats/policy";
import { site } from "@/lib/site";

/**
 * "Your promotion letter is ready". Like the offer equivalent, it never
 * attaches the PDF — the document is reached only through the secure link, so
 * it cannot be read by anyone who happens to see a forwarded mailbox.
 */
export function promotionSentEmail(p: { firstName: string; jobTitle: string; promotionUrl: string; expirationDate: Date }) {
  const expires = p.expirationDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const subject = `Your promotion letter — ${p.jobTitle} — ${site.name}`;
  const text = `Hi ${p.firstName},

Congratulations. Your promotion letter for the ${p.jobTitle} position is ready for your review and signature.

Review and sign here:
${p.promotionUrl}

Please sign on or before ${expires}.

This link is personal to you — please do not forward it.

${site.name}`;

  const html = shell(
    "Your promotion letter is ready",
    `<p style="font-size:15px;line-height:1.7">Hi ${escapeHtml(p.firstName)},</p>
     <p style="font-size:15px;line-height:1.7">
       Congratulations. Your promotion letter for the
       <strong>${escapeHtml(p.jobTitle)}</strong> position is ready for your review and signature.
     </p>
     <p style="margin:24px 0">
       <a href="${p.promotionUrl}" style="display:inline-block;background:#1b2a5e;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
         Review and sign
       </a>
     </p>
     <p style="font-size:14px;line-height:1.7;color:#46536b">
       Please sign on or before <strong>${escapeHtml(expires)}</strong>.
       This link is personal to you — please do not forward it.
     </p>`,
  );
  return { subject, text, html };
}

/** The one-time code for the employee's identity check. */
export function promotionOtpEmail(p: { code: string }) {
  const subject = `Your ${site.name} verification code`;
  const text = `Your verification code is ${p.code}. It expires in 10 minutes.`;
  const html = shell(
    "Verification code",
    `<p style="font-size:15px;line-height:1.7">Use this code to open your promotion letter:</p>
     <p style="font-size:30px;letter-spacing:7px;font-weight:700;margin:22px 0;color:#16233f">${escapeHtml(p.code)}</p>
     <p style="font-size:14px;color:#46536b">It expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
  );
  return { subject, text, html };
}
