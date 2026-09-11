/**
 * Admin form primitives.
 *
 * The admin app is an internal tool, so the type scale is deliberately one step
 * tighter than the marketing site: 13px controls, 12px labels, 20px page
 * titles. Centralising it here keeps every screen consistent and means the
 * scale can be adjusted in one place.
 */
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ scale */

export const t = {
  pageTitle: "text-[1.25rem]",
  sectionTitle: "text-[0.9375rem]",
  body: "text-[0.8125rem]",
  label: "text-[0.75rem]",
  hint: "text-[0.6875rem]",
  micro: "text-[0.625rem]",
} as const;

/** Shared control styling — 13px text, compact padding. */
export const control =
  "w-full rounded-[3px] border bg-white px-3 py-2 text-[0.8125rem] text-ink-900 " +
  "placeholder:text-graphite-400 transition-colors focus:border-flame-500 " +
  "focus:outline-none focus:ring-2 focus:ring-flame-500/25";

const borderFor = (error?: string) => (error ? "border-[#c0392b]" : "border-paper-300");

/* ------------------------------------------------------------------ field */

function Shell({
  id, label, required, hint, error, children, className = "",
}: {
  id: string; label: string; required?: boolean; hint?: string;
  error?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={`block ${t.label} font-medium text-ink-800`}>
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-graphite-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && (
        <p id={`${id}-hint`} className={`mt-1 ${t.hint} text-graphite-500`}>{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className={`mt-1 ${t.hint} text-[#c0392b]`}>{error}</p>
      )}
    </div>
  );
}

export function Field({
  name, label, type = "text", required, defaultValue, placeholder,
  autoComplete, hint, error, className, inputMode, value, onChange, disabled,
}: {
  name: string; label: string; type?: string; required?: boolean;
  defaultValue?: string | number | null; placeholder?: string;
  autoComplete?: string; hint?: string; error?: string; className?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  /** Supplying `value` + `onChange` makes the input controlled; omitting both
   *  leaves it uncontrolled with `defaultValue`, as every existing caller uses. */
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}) {
  const id = `f-${name}`;
  const controlled = value !== undefined;
  return (
    <Shell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        inputMode={inputMode}
        disabled={disabled}
        {...(controlled ? { value, onChange } : { defaultValue: defaultValue ?? "" })}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control} ${borderFor(error)} disabled:cursor-not-allowed disabled:opacity-55`}
      />
    </Shell>
  );
}

export function TextArea({
  name, label, rows = 4, required, defaultValue, placeholder, hint, error, className,
}: {
  name: string; label: string; rows?: number; required?: boolean;
  defaultValue?: string | null; placeholder?: string; hint?: string;
  error?: string; className?: string;
}) {
  const id = `f-${name}`;
  return (
    <Shell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control} resize-y ${borderFor(error)}`}
      />
    </Shell>
  );
}

export function Select({
  name, label, options, defaultValue, required, hint, error, className,
}: {
  name: string; label: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string; required?: boolean; hint?: string;
  error?: string; className?: string;
}) {
  const id = `f-${name}`;
  return (
    <Shell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control} ${borderFor(error)}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Shell>
  );
}

/* --------------------------------------------------------------- grouping */

export function FormSection({
  title, description, children, columns = 2,
}: {
  title: string; description?: string; children: ReactNode; columns?: 1 | 2 | 3;
}) {
  const cols =
    columns === 1 ? "" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <section className="border-t border-paper-200 pt-6 first:border-0 first:pt-0">
      <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>{title}</h2>
      {description && (
        <p className={`mt-1 ${t.hint} text-graphite-600`}>{description}</p>
      )}
      <div className={`mt-4 grid gap-4 ${cols}`}>{children}</div>
    </section>
  );
}

/** Full-width child inside a FormSection grid. */
export const spanAll = "sm:col-span-2";

/* ---------------------------------------------------------------- buttons */

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-4 py-2 " +
  "text-[0.8125rem] font-medium text-white transition-colors hover:bg-ink-700 " +
  "disabled:pointer-events-none disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border border-paper-300 " +
  "bg-white px-4 py-2 text-[0.8125rem] font-medium text-ink-900 transition-colors " +
  "hover:border-ink-500 disabled:pointer-events-none disabled:opacity-60";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-[3px] border border-[#c0392b]/40 " +
  "bg-white px-4 py-2 text-[0.8125rem] font-medium text-[#c0392b] transition-colors " +
  "hover:bg-[#c0392b]/[0.05] disabled:pointer-events-none disabled:opacity-60";
