"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-[3px] bg-ink-900 px-5 py-3 text-[0.875rem] font-medium text-white transition-colors hover:bg-ink-700"
    >
      <Printer className="size-4" aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
