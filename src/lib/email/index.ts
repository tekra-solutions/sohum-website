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
    signal: AbortSignal.timeout(15_000),
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
  const nodemailer = await import("nodemailer");
  const env = serverEnv();
  const transport = (nodemailer.default ?? nodemailer).createTransport({
    host: env.smtpHost,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    port: Number(env.smtpPort),
    secure: Number(env.smtpPort) === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
  });
  await transport.sendMail({ from: env.emailFrom, ...msg });
}

/** Never throws. Email failure must not roll back a submitted application. */
export async function send(msg: Message): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) {
    console.info("[email] not configured; skipping");
    return { sent: false, reason: "not_configured" };
  }
  try {
    if (process.env.RESEND_API_KEY) await sendViaResend(msg);
    else await sendViaSmtp(msg);
    return { sent: true };
  } catch {
    console.error("[email] send failed");
    return { sent: false, reason: "send_failed" };
  }
}

export { isEmailConfigured };
