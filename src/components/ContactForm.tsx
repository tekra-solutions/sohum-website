"use client";

import { useId, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "./ui";
import { contact } from "@/lib/site";

type Errors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

const inquiryTypes = [
  "Contracting or procurement",
  "Capability or technical question",
  "Teaming or partnership",
  "Careers or recruiting",
  "Other",
];

const fieldClasses =
  "w-full rounded-[3px] border bg-white px-4 py-3 text-[0.9375rem] text-ink-900 " +
  "placeholder:text-graphite-400 transition-colors " +
  "focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30";

/**
 * Contact form.
 *
 * Validates on submit and moves focus to the summary so screen reader users hear
 * what failed. No backend is wired up yet: on success we hand off to the user's
 * mail client with the message pre-filled, so the form never silently discards
 * what someone typed.
 */
export function ContactForm() {
  const id = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const field = (n: string) => `${id}-${n}`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const organization = String(data.get("organization") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const inquiry = String(data.get("inquiry") ?? "").trim();

    const next: Errors = {};
    if (!name) next.name = "Enter your name.";
    if (!email) next.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!subject) next.subject = "Enter a subject.";
    if (!message) next.message = "Tell us how we can help.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Move focus to the first field with an error.
      const firstKey = Object.keys(next)[0];
      document.getElementById(field(firstKey))?.focus();
      return;
    }

    setState("sending");

    const body = [
      `Name: ${name}`,
      organization && `Organization: ${organization}`,
      `Email: ${email}`,
      phone && `Phone: ${phone}`,
      inquiry && `Inquiry type: ${inquiry}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const href = `mailto:${contact.emailGeneral}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    setState("sent");
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Live region: announces validation results and success. */}
      <div aria-live="polite">
        {errorCount > 0 && (
          <div className="flex gap-3 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#8e2c20]">
              {errorCount === 1
                ? "One field needs attention before sending."
                : `${errorCount} fields need attention before sending.`}
            </p>
          </div>
        )}
        {state === "sent" && (
          <div className="flex gap-3 rounded-[3px] border border-flame-500/30 bg-flame-500/[0.06] p-4">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-flame-700"
              aria-hidden="true"
            />
            <p className="text-[0.875rem] text-ink-800">
              Your message is ready in your email client. If it did not open, write to{" "}
              <a
                href={`mailto:${contact.emailGeneral}`}
                className="font-medium underline underline-offset-2"
              >
                {contact.emailGeneral}
              </a>
              .
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={field("name")}
          name="name"
          label="Name"
          required
          autoComplete="name"
          error={errors.name}
        />
        <Field
          id={field("organization")}
          name="organization"
          label="Organization or agency"
          autoComplete="organization"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={field("email")}
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          error={errors.email}
        />
        <Field id={field("phone")} name="phone" type="tel" label="Phone" autoComplete="tel" />
      </div>

      <div>
        <label
          htmlFor={field("inquiry")}
          className="block text-[0.875rem] font-medium text-ink-800"
        >
          What is this about?
        </label>
        <select
          id={field("inquiry")}
          name="inquiry"
          defaultValue={inquiryTypes[0]}
          className={`${fieldClasses} mt-2 border-paper-300`}
        >
          {inquiryTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <Field
        id={field("subject")}
        name="subject"
        label="Subject"
        required
        error={errors.subject}
      />

      <div>
        <label
          htmlFor={field("message")}
          className="block text-[0.875rem] font-medium text-ink-800"
        >
          Message{" "}
          <span className="text-graphite-500" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id={field("message")}
          name="message"
          rows={6}
          required
          aria-required="true"
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${field("message")}-error` : undefined}
          placeholder="Describe the requirement, the timeline, and any constraints we should know about."
          className={`${fieldClasses} mt-2 resize-y ${
            errors.message ? "border-[#c0392b]" : "border-paper-300"
          }`}
        />
        {errors.message && (
          <p
            id={`${field("message")}-error`}
            className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-[#c0392b]"
          >
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {errors.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Preparing
            </>
          ) : (
            <>
              Send message
              <Send className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
        <p className="text-[0.8125rem] text-graphite-500">
          Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- Text field */

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">
        {label}{" "}
        {required && (
          <span className="text-graphite-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={autoComplete}
        className={`${fieldClasses} mt-2 ${error ? "border-[#c0392b]" : "border-paper-300"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-[#c0392b]">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
