import "server-only";
import { shell } from "@/lib/email/templates";
import { escapeHtml } from "@/lib/ats/policy";
import { site } from "@/lib/site";

/**
 * Subject and body for the "your offer is ready" email. Deliberately never
 * attaches the offer PDF — send() has no attachment parameter at all, which
 * is itself the enforcement: nothing attaches unless someone later adds that
 * capability behind an explicit opt-in.
 */
export function offerSentEmail(p: { firstName: string; jobTitle: string; offerUrl: string; expirationDate: Date }) {
  const expires = p.expirationDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const subject = `Employment Offer — ${p.jobTitle} — ${site.name}`;
  const text = `Hi ${p.firstName},

We are pleased to share an offer of employment with you for the ${p.jobTitle} position at ${site.name}.

Review and respond to your offer here:
${p.offerUrl}

This offer expires on ${expires}.

${site.name} Recruiting`;

  const html = shell(
    "Your offer is ready",
    `<p style="font-size:15px;line-height:1.7">Hi ${escapeHtml(p.firstName)},</p>
     <p style="font-size:15px;line-height:1.7">
       We are pleased to share an offer of employment with you for the
       <strong>${escapeHtml(p.jobTitle)}</strong> position at ${site.name}.
     </p>
     <p style="margin:24px 0">
       <a href="${p.offerUrl}" style="display:inline-block;background:#1b2a5e;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
         Review your offer
       </a>
     </p>
     <p style="font-size:13px;color:#5b6a80">This offer expires on ${expires}.</p>`,
  );
  return { subject, text, html };
}

/** The one-time verification code sent when a candidate opens the offer link. */
export function offerOtpEmail(p: { code: string }) {
  const subject = `Your ${site.name} verification code`;
  const text = `Your verification code is ${p.code}. It expires in 10 minutes.`;
  const html = shell(
    "Verify it's you",
    `<p style="font-size:15px;line-height:1.7">Use this code to view your offer:</p>
     <p style="font-size:28px;font-weight:700;letter-spacing:0.1em;margin:20px 0">${p.code}</p>
     <p style="font-size:13px;color:#5b6a80">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
  );
  return { subject, text, html };
}
