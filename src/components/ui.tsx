import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------ Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "onDark";

const buttonBase =
  "group/btn inline-flex items-center justify-center gap-2 rounded-[3px] text-[0.9375rem] font-medium leading-none " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 px-6 py-[0.9375rem]";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-900 text-white hover:bg-ink-700 shadow-[0_1px_2px_rgba(8,13,26,0.16)] hover:shadow-[0_6px_20px_-8px_rgba(8,13,26,0.4)]",
  secondary:
    "border border-paper-300 bg-white text-ink-900 hover:border-ink-500 hover:bg-paper-50",
  ghost:
    "text-ink-900 hover:bg-paper-100 px-4",
  onDark:
    "bg-white text-ink-950 hover:bg-signal-300 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.6)]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------- Arrow link */

/** Text link with an arrow that advances on hover. */
export function ArrowLink({
  href,
  children,
  className = "",
  tone = "dark",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light";
}) {
  const color =
    tone === "dark"
      ? "text-ink-900 decoration-paper-300 hover:decoration-signal-500"
      : "text-white decoration-white/30 hover:decoration-signal-300";
  return (
    <Link
      href={href}
      className={`group/al inline-flex items-center gap-1.5 text-[0.9375rem] font-medium underline decoration-1 underline-offset-[6px] transition-colors ${color} ${className}`}
    >
      {children}
      <ArrowRight
        className="size-4 transition-transform duration-300 ease-out group-hover/al:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

/* ----------------------------------------------------------------- Eyebrow */

export function Eyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <p
      className={`eyebrow ${
        tone === "dark" ? "text-graphite-500" : "text-signal-300"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-px w-6 ${tone === "dark" ? "bg-paper-300" : "bg-signal-400/50"}`}
      />
      {children}
    </p>
  );
}

/* --------------------------------------------------------- Section heading */

export function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "dark",
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  tone?: "dark" | "light";
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}
    >
      {eyebrow && (
        <Eyebrow tone={tone} className={align === "center" ? "justify-center" : ""}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2
        className={`mt-5 text-[1.75rem] leading-[1.15] sm:text-[2.125rem] lg:text-[2.5rem] ${
          tone === "dark" ? "text-ink-900" : "text-white"
        }`}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={`mt-5 text-[1.0625rem] leading-[1.65] ${
            tone === "dark" ? "text-graphite-600" : "text-white/65"
          }`}
        >
          {lede}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "active" | "muted" | "accent";
}) {
  const tones = {
    neutral: "border-paper-300 bg-paper-50 text-graphite-700",
    active: "border-signal-500/40 bg-signal-500/8 text-signal-700",
    muted: "border-paper-300 bg-transparent text-graphite-600",
    accent: "border-ember-500/30 bg-ember-400/10 text-[#8a5a06]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ Rule / meta  */

/** Monospace label-value pair used for procurement data. */
export function DataRow({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3 ${
        tone === "dark" ? "border-paper-200" : "border-white/10"
      }`}
    >
      <dt
        className={`text-[0.8125rem] ${
          tone === "dark" ? "text-graphite-500" : "text-white/50"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`font-mono text-[0.8125rem] font-medium tabular-nums ${
          tone === "dark" ? "text-ink-800" : "text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
