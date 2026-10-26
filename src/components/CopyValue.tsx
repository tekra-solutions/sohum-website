"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "@/components/icons";

/** A reference number with one-click copy, for buyers filling in order forms. */
export function CopyValue({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = () =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(true))
      .catch(() => undefined);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span className="font-tech tracking-[0.02em]">{value}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        className="-my-1 grid size-8 shrink-0 place-items-center rounded-md opacity-55 transition hover:bg-current/10 hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </span>
  );
}
