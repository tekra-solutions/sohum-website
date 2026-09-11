"use client";

import { useId, useRef, useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { MAX_RESUME_BYTES, validateResume } from "@/lib/validation/schemas";
import { formatFileSize } from "@/lib/format";

/**
 * Resume picker.
 *
 * Validates client-side for immediate feedback; the server revalidates the same
 * rules and is the actual gate. Keeps a real <input type="file"> in the DOM so
 * the form posts natively and keyboard/screen-reader behaviour is standard.
 */
export function ResumeUpload({ error }: { error?: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const shown = localError ?? error;

  function accept(next: File | null) {
    setLocalError(null);
    if (!next) {
      setFile(null);
      return;
    }
    const check = validateResume({ name: next.name, type: next.type, size: next.size });
    if (!check.ok) {
      setLocalError(check.error);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(next);
  }

  function clear() {
    setFile(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  return (
    <div>
      <label htmlFor={id} className="block text-[0.875rem] font-medium text-ink-800">
        Resume <span aria-hidden="true" className="text-graphite-500">*</span>
      </label>

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`mt-2 rounded-[3px] border border-dashed p-6 text-center transition-colors ${
            shown
              ? "border-[#c0392b] bg-[#c0392b]/[0.03]"
              : dragging
                ? "border-flame-500 bg-flame-500/[0.04]"
                : "border-paper-300 bg-paper-50"
          }`}
        >
          <Paperclip className="mx-auto size-5 text-graphite-400" aria-hidden="true" />
          <p className="mt-3 text-[0.9375rem] text-ink-900">
            <label
              htmlFor={id}
              className="cursor-pointer font-medium underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
            >
              Choose a file
            </label>{" "}
            <span className="text-graphite-600">or drag it here</span>
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-graphite-500">
            PDF, DOC or DOCX · up to {formatFileSize(MAX_RESUME_BYTES)}
          </p>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3 rounded-[3px] border border-paper-300 bg-white p-4">
          <FileText className="size-5 shrink-0 text-flame-600" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium text-ink-900">
              {file.name}
            </span>
            <span className="block text-[0.8125rem] text-graphite-600">
              {formatFileSize(file.size)}
            </span>
          </span>
          <button
            type="button"
            onClick={clear}
            className="rounded p-1.5 text-graphite-500 transition-colors hover:bg-paper-100 hover:text-ink-900"
            aria-label={`Remove ${file.name}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* The real control. Kept in the DOM so the form submits it natively. */}
      <input
        ref={inputRef}
        id={id}
        name="resume"
        type="file"
        required
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => accept(e.target.files?.[0] ?? null)}
        aria-invalid={shown ? true : undefined}
        aria-describedby={shown ? `${id}-error` : undefined}
        className="sr-only"
      />

      {shown && (
        <p id={`${id}-error`} className="mt-2 text-[0.8125rem] text-[#c0392b]">
          {shown}
        </p>
      )}
    </div>
  );
}
