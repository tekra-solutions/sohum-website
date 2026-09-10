import "server-only";

const shell = (heading: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1b2a5e">
  <div style="font-size:20px;font-weight:700;letter-spacing:-.02em">
    <span style="color:#e8622a">Sohum</span> Systems
  </div>
  <h1 style="font-size:22px;font-weight:600;margin:28px 0 14px">${heading}</h1>
  ${body}
  <hr style="border:0;border-top:1px solid #e7ebf1;margin:32px 0 16px">
  <p style="font-size:12px;color:#5b6a80;margin:0">
    Sohum Systems, LLC · 9232 W 143rd Terrace, Overland Park, KS 66221
  </p>
</div>`;

export function applicantConfirmation(p: {
  firstName: string;
  jobTitle: string;
  reference: string;
}) {
  const text = `Thank you for applying to Sohum Systems.

We have received your application for ${p.jobTitle}.
Your reference number is ${p.reference}.

Our recruiting team reviews every submission. If your background matches what
the role needs, we will be in touch.

Sohum Systems, LLC`;

  return {
    subject: `Application Received – ${p.jobTitle}`,
    text,
    html: shell(
      "Application received",
      `<p style="font-size:15px;line-height:1.7">Hi ${p.firstName},</p>
       <p style="font-size:15px;line-height:1.7">
         Thank you for your interest in Sohum Systems. Your application for
         <strong>${p.jobTitle}</strong> has been successfully received.
       </p>
       <div style="background:#f4f6f9;border-radius:4px;padding:16px;margin:20px 0">
         <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#5b6a80">Reference</div>
         <div style="font-family:ui-monospace,monospace;font-size:16px;margin-top:6px">${p.reference}</div>
       </div>
       <p style="font-size:15px;line-height:1.7">
         Our recruiting team reviews every submission. If your background matches
         what the role needs, we will be in touch.
       </p>`,
    ),
  };
}

export function adminNotification(p: {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  reference: string;
  appliedAt: string;
  adminUrl: string;
}) {
  const text = `New application

Applicant: ${p.applicantName}
Email:     ${p.applicantEmail}
Job:       ${p.jobTitle}
Reference: ${p.reference}
Applied:   ${p.appliedAt}

Open in dashboard: ${p.adminUrl}`;

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#5b6a80">${k}</td>
         <td style="padding:6px 0;font-size:14px">${v}</td></tr>`;

  return {
    subject: `New Job Application – ${p.applicantName} – ${p.jobTitle}`,
    text,
    html: shell(
      "New job application",
      `<table style="border-collapse:collapse">
         ${row("Applicant", p.applicantName)}
         ${row("Email", p.applicantEmail)}
         ${row("Job", p.jobTitle)}
         ${row("Reference", p.reference)}
         ${row("Applied", p.appliedAt)}
       </table>
       <p style="margin-top:24px">
         <a href="${p.adminUrl}"
            style="display:inline-block;background:#1b2a5e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:3px;font-size:14px">
           Open in dashboard
         </a>
       </p>`,
    ),
  };
}
