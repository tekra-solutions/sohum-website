/**
 * Sohum Systems mark.
 *
 * A square aperture with three ascending data bars — reads as both a structured
 * system and forward progression. Uses currentColor so it inverts cleanly on
 * dark surfaces without a second asset.
 */
export function Logo({ className = "", showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" opacity="0.32" />
        <rect x="7" y="18" width="4" height="7" fill="currentColor" opacity="0.55" />
        <rect x="14" y="13" width="4" height="12" fill="currentColor" opacity="0.78" />
        <rect x="21" y="7" width="4" height="18" fill="currentColor" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-[family-name:var(--font-display)] text-[1.0625rem] font-semibold tracking-[-0.02em]">
            Sohum Systems
          </span>
          <span className="mt-1 text-[0.5625rem] font-semibold uppercase tracking-[0.2em] opacity-75">
            Federal Technology
          </span>
        </span>
      )}
    </span>
  );
}
