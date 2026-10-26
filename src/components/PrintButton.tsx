"use client";

import { Printer } from "@/components/icons";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full font-brand bg-ink-900 px-5 py-3 text-[0.875rem] font-bold text-white transition-colors hover:bg-ink-700"
    >
      <Printer className="size-4" aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
