/**
 * Sohum Systems lockup.
 *
 * The mark is a two-tone S: an orange upper sweep and a navy lower sweep that
 * cross at the centre, each tapering to a point. Drawn as two closed outlines
 * rather than strokes so the taper is real rather than a cap effect.
 *
 * The wordmark and the TECHNOLOGY | TALENT | TRUST descriptor are live text,
 * so the lockup stays selectable, searchable and translatable, and no second
 * raster asset ever has to be kept in sync.
 */

/** Brand values, used by both the mark and the wordmark. */
const NAVY = "#1b2a5e";
const ACCENT = "#e8622a";

/** Upper sweep — orange. Tapers from the crossing out to the top-right tip. */
const S_UPPER =
  "M108 8C62 8 20 26 12 50 6 68 24 79 50 81 32 75 24 63 31 49 43 27 74 12 108 8Z";

/** Lower sweep — navy. Rotationally symmetric to the upper. */
const S_LOWER =
  "M4 100c46 0 88-18 96-42 6-18-12-29-38-31 18 6 26 18 19 32C69 81 38 96 4 100Z";

export function Logo({
  className = "",
  showWordmark = true,
  tone = "dark",
  size = "md",
  showTagline = true,
}: {
  className?: string;
  showWordmark?: boolean;
  /** "dark" = for light backgrounds; "light" = for dark backgrounds. */
  tone?: "dark" | "light";
  /** md = header default; lg = footer masthead. */
  size?: "md" | "lg";
  /** The TECHNOLOGY | TALENT | TRUST descriptor. */
  showTagline?: boolean;
}) {
  const isLight = tone === "light";

  // On dark grounds the navy sweep would disappear, so it becomes white there.
  const sweep = isLight ? "#ffffff" : NAVY;

  // One proportional scale, stepped down on narrow screens. At full desktop
  // size the lockup pushed the mobile menu button past the viewport edge, so
  // phones get a smaller step and tablets up get the intended size.
  const markSize =
    size === "lg"
      ? "w-[3.75rem] sm:w-[4.5rem] lg:w-[5.25rem]"
      : "w-[3.25rem] sm:w-[4rem] lg:w-[4.5rem]";
  const wordSize =
    size === "lg"
      ? "text-[1.5rem] sm:text-[1.875rem] lg:text-[2.125rem]"
      : "text-[1.3125rem] sm:text-[1.625rem] lg:text-[1.875rem]";
  const tagSize =
    size === "lg"
      ? "text-[0.5rem] sm:text-[0.625rem] lg:text-[0.6875rem]"
      : "text-[0.4375rem] sm:text-[0.5625rem] lg:text-[0.625rem]";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 112 108"
        className={`${markSize} h-auto shrink-0`}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d={S_UPPER} fill={ACCENT} />
        <path d={S_LOWER} fill={sweep} />
      </svg>

      {showWordmark && (
        <span className="flex flex-col gap-[0.3em]">
          <span
            className={`whitespace-nowrap font-[family-name:var(--font-display)] ${wordSize} font-bold leading-none tracking-[-0.02em] ${
              isLight ? "text-white" : "text-[#1b2a5e]"
            }`}
          >
            {/* One orange in both tones so the header and footer lockups are
                identical. WCAG 1.4.3 exempts logotype text from the contrast
                minimum, and splitting the colour by background made the two
                lockups visibly different brands. */}
            <span style={{ color: ACCENT }}>Sohum</span> Systems
          </span>

          {showTagline && (
            <span
              className={`flex items-center gap-[0.7em] whitespace-nowrap ${tagSize} font-semibold uppercase leading-none tracking-[0.16em] ${
                isLight ? "text-white/85" : "text-[#1b2a5e]/85"
              }`}
            >
              <span>Technology</span>
              <span aria-hidden="true" className="opacity-40">
                |
              </span>
              <span>Talent</span>
              <span aria-hidden="true" className="opacity-40">
                |
              </span>
              <span>Trust</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
