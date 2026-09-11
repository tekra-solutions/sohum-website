import "server-only";
import { shell } from "@/lib/email/templates";
import { escapeHtml } from "@/lib/ats/policy";
import { site } from "@/lib/site";
import { formatMoney } from "./money";

/** The "here is your invoice" email. The secure link is the payload; the PDF
 *  is attached only when the sender explicitly asks for it. */
export function invoiceEmail(p: {
  invoiceNumber: string; clientName: string; totalCents: number; balanceDueCents: number;
  currency: string; dueDate: Date; invoiceUrl: string; message?: string | null;
}) {
  const due = p.dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const amount = formatMoney(p.balanceDueCents, p.currency);
  const subject = `Invoice ${p.invoiceNumber} from ${site.name}`;
  const text = `${p.clientName},

${p.message ? `${p.message}\n\n` : ""}Invoice ${p.invoiceNumber} for ${amount} is due ${due}.

View the invoice here:
${p.invoiceUrl}

${site.legalName}`;

  const html = shell(`Invoice ${escapeHtml(p.invoiceNumber)}`, `
    <p style="font-size:15px;line-height:1.7">${escapeHtml(p.clientName)},</p>
    ${p.message ? `<p style="font-size:15px;line-height:1.7">${escapeHtml(p.message).replaceAll("\n", "<br>")}</p>` : ""}
    <p style="font-size:15px;line-height:1.7">
      Invoice <strong>${escapeHtml(p.invoiceNumber)}</strong> for <strong>${escapeHtml(amount)}</strong>
      is due <strong>${escapeHtml(due)}</strong>.
    </p>
    <p style="margin:24px 0">
      <a href="${p.invoiceUrl}" style="display:inline-block;background:#1b2a5e;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
        View invoice
      </a>
    </p>`);
  return { subject, text, html };
}

/** Payment reminder / overdue chase. Admin-triggered only — never automatic. */
export function invoiceReminderEmail(p: {
  invoiceNumber: string; clientName: string; balanceDueCents: number; currency: string;
  dueDate: Date; invoiceUrl: string; overdue: boolean;
}) {
  const due = p.dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const amount = formatMoney(p.balanceDueCents, p.currency);
  const subject = p.overdue
    ? `Overdue: invoice ${p.invoiceNumber} from ${site.name}`
    : `Reminder: invoice ${p.invoiceNumber} from ${site.name}`;
  const lead = p.overdue
    ? `Invoice ${p.invoiceNumber} for ${amount} was due ${due} and remains outstanding.`
    : `A friendly reminder that invoice ${p.invoiceNumber} for ${amount} is due ${due}.`;
  const text = `${p.clientName},\n\n${lead}\n\nView the invoice here:\n${p.invoiceUrl}\n\n${site.legalName}`;
  const html = shell(p.overdue ? "Invoice overdue" : "Payment reminder", `
    <p style="font-size:15px;line-height:1.7">${escapeHtml(p.clientName)},</p>
    <p style="font-size:15px;line-height:1.7">${escapeHtml(lead)}</p>
    <p style="margin:24px 0">
      <a href="${p.invoiceUrl}" style="display:inline-block;background:#1b2a5e;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
        View invoice
      </a>
    </p>`);
  return { subject, text, html };
}

/** Confirmation that money landed. */
export function paymentReceivedEmail(p: {
  invoiceNumber: string; clientName: string; amountCents: number; balanceDueCents: number; currency: string;
}) {
  const paid = formatMoney(p.amountCents, p.currency);
  const balance = formatMoney(p.balanceDueCents, p.currency);
  const settled = p.balanceDueCents <= 0;
  const subject = `Payment received for invoice ${p.invoiceNumber}`;
  const text = `${p.clientName},\n\nWe have recorded your payment of ${paid} against invoice ${p.invoiceNumber}.\n${
    settled ? "This invoice is now paid in full. Thank you." : `The remaining balance is ${balance}.`
  }\n\n${site.legalName}`;
  const html = shell("Payment received", `
    <p style="font-size:15px;line-height:1.7">${escapeHtml(p.clientName)},</p>
    <p style="font-size:15px;line-height:1.7">
      We have recorded your payment of <strong>${escapeHtml(paid)}</strong> against invoice
      <strong>${escapeHtml(p.invoiceNumber)}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.7">${settled
      ? "This invoice is now paid in full. Thank you."
      : `The remaining balance is <strong>${escapeHtml(balance)}</strong>.`}</p>`);
  return { subject, text, html };
}
