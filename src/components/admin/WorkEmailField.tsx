"use client";

import { useState } from "react";
import { contact } from "@/lib/site";

const DOMAIN = `@${contact.emailDomain}`;

/**
 * A work-email input where only the username is typed.
 *
 * The company domain is rendered beside the field as fixed chrome — a span,
 * not a disabled input, so it cannot be edited, cleared or tabbed into, and it
 * is never submitted as its own value. A hidden input carries the assembled
 * address, so the server still receives a complete email and the schemas
 * behind it are unchanged.
 *
 * Shared by sign-in and admin creation so the two cannot drift: an account
 * created on another domain could never sign in through this form.
 */
export function WorkEmailField({
  name = "email",
  id = "username",
  label = "Work email",
  required = true,
  /** Hide the asterisk while keeping the field required — for forms where
   *  every field is mandatory and marking one would say nothing. */
  hideRequiredMark = false,
  autoFocus = false,
  defaultUsername = "",
  error,
  hint,
}: {
  name?: string;
  id?: string;
  label?: string;
  required?: boolean;
  hideRequiredMark?: boolean;
  autoFocus?: boolean;
  defaultUsername?: string;
  error?: string;
  hint?: string;
}) {
  const [username, setUsername] = useState(defaultUsername);

  /* Keep only the local part.
     Cutting at the first "@" handles a paste or a password manager filling the
     whole address at once. Typing one out by hand is handled separately: the
     keydown below refuses "@" entirely, because stripping it per keystroke
     would silently swallow the separator and leave "namedomain.com" — a value
     that looks almost right and is completely wrong. */
  const clean = (raw: string) =>
    raw.trim().toLowerCase().split("@")[0] ?? "";

  const describedBy = [`${id}-domain`, error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">
        {label}
        {required && !hideRequiredMark && <span aria-hidden="true" className="ml-0.5 text-graphite-500">*</span>}
      </label>

      <div
        className={`mt-2 flex items-stretch overflow-hidden rounded-[3px] border bg-white
          transition-colors focus-within:border-flame-500 focus-within:ring-2 focus-within:ring-flame-500/30
          ${error ? "border-[#c0392b]" : "border-paper-300"}`}
      >
        <input
          id={id}
          value={username}
          onChange={(e) => setUsername(clean(e.target.value))}
          onKeyDown={(e) => {
            // The domain is not typed here, so "@" can only be the start of a
            // mistake. Refusing the key is clearer than accepting it and
            // quietly rewriting what the person sees.
            if (e.key === "@") e.preventDefault();
          }}
          required={required}
          autoComplete="username"
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="firstname.lastname"
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[0.9375rem] text-ink-900
                     placeholder:text-graphite-400 focus:outline-none"
        />
        <span
          id={`${id}-domain`}
          className="flex shrink-0 select-none items-center border-l border-paper-300 bg-paper-50
                     px-3 text-[0.875rem] text-graphite-600"
        >
          {DOMAIN}
        </span>
      </div>

      <input type="hidden" name={name} value={username ? `${username}${DOMAIN}` : ""} />

      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-graphite-500">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-[#c0392b]">{error}</p>
      )}
    </div>
  );
}
