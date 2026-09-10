/**
 * Email.
 *
 * Provider-agnostic by design: `send()` picks Resend or SMTP from environment
 * config, and callers never know which. When neither is configured the call is
 * logged and resolves — an unconfigured mail provider must never fail an
 * otherwise-valid job application.
 *
 * Resumes are never attached; admins retrieve them through the authenticated
 * download route instead.
 */
import "server-only";
import { serverEnv, isEmailConfigured } from "@/lib/env";

type Message = { to: string; subject: string; html: string; text: string };

async function sendViaResend(msg: Message) {
  const env = serverEnv();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

async function sendViaSmtp(msg: Message) {
  // Imported lazily and by computed specifier so SMTP support stays optional:
  // the package need not be installed unless SMTP_HOST is actually set.
  const moduleName = "nodemailer";
  const nodemailer = await import(/* webpackIgnore: true */ moduleName).catch(() => null);
  if (!nodemailer) {
    throw new Error("SMTP is configured but nodemailer is not installed. Run: npm i nodemailer");
  }
  const env = serverEnv();
  const transport = (nodemailer.default ?? nodemailer).createTransport({
    host: env.smtpHost,
    port: Number(env.smtpPort),
    secure: Number(env.smtpPort) === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
  });
  await transport.sendMail({ from: env.emailFrom, ...msg });
}

/** Never throws. Email failure must not roll back a submitted application. */
export async function send(msg: Message): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) {
    console.info("[email] not configured; skipping", { to: msg.to, subject: msg.subject });
    return { sent: false, reason: "not_configured" };
  }
  try {
    if (process.env.RESEND_API_KEY) await sendViaResend(msg);
    else await sendViaSmtp(msg);
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed", {
      to: msg.to,
      subject: msg.subject,
      error: err instanceof Error ? err.message : String(err),
    });
    return { sent: false, reason: "send_failed" };
  }
}

export { isEmailConfigured };
