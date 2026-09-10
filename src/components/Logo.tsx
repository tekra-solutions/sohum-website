/**
 * Sohum Systems brand mark.
 *
 * Paths are taken verbatim from the supplied brand SVG. The artwork is a
 * two-part rotationally symmetric bird form: one half in the brand orange,
 * one in the brand navy.
 *
 * Rendering notes:
 *  - The source file packs the symbol (x 286-587, y 0-292) above the wordmark.
 *    We crop the viewBox to the symbol and set the wordmark in live text, so
 *    the lockup stays crisp, searchable, and translatable.
 *  - On dark grounds the navy half would nearly vanish, so `tone="light"`
 *    swaps it for a light slate that keeps the two halves legible.
 */
export function Logo({
  className = "",
  showWordmark = true,
  tone = "dark",
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  /** "dark" = for light backgrounds; "light" = for dark backgrounds. */
  tone?: "dark" | "light";
  /** md = header/footer default; lg = generous, for the footer masthead. */
  size?: "md" | "lg";
}) {
  const navy = tone === "light" ? "#8fa2c4" : "#304368";
  const wordNavy = tone === "light" ? "text-white" : "text-brand-navy";
  // Stepped down on narrow screens: at full size the lockup pushed the mobile
  // menu button past the viewport edge (41px overflow at 320px).
  const markSize =
    size === "lg"
      ? "h-[3rem] w-[3.0625rem] sm:h-[3.5rem] sm:w-[3.625rem] lg:h-[4rem] lg:w-[4.125rem]"
      : "h-[2.625rem] w-[2.6875rem] sm:h-[3rem] sm:w-[3.0625rem] lg:h-[3.375rem] lg:w-[3.4375rem]";
  const wordSize =
    size === "lg"
      ? "text-[1.375rem] sm:text-[1.625rem] lg:text-[2rem]"
      : "text-[1.1875rem] sm:text-[1.4375rem] lg:text-[1.75rem]";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="286 0 301 292"
        className={`${markSize} shrink-0`}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Upper sweep — orange outer, navy inner */}
        <path
          fill="#f25806"
          d="m428.93,0c-30.41,8.17-142.92,63.88-142.38,116.97,0,58.55,115.04,50.4,143.46,46.7,0,0-14.78-3.13-14.78-19.7s14.78-20.65,14.78-20.65c-30.39-1.79-84.63,6.87-86.35-35.62,0-44.48,79.59-79.3,85.26-87.7Z"
        />
        <path
          fill={navy}
          d="m432.65,16.92c-27.2,6.3-63.51,29.24-73.6,56.14-5.03,13.42.9,28.44,14,34.25,22.23,9.85,58.24,5.64,58.24,5.64,0,0-6.46-1.34-6.63-10.42-.17-9.21,6.9-9.07,6.9-9.07-6.25-1.61-46.02,4.6-45.95-22.2.81-27,39.59-48.8,47.03-54.34Z"
        />
        {/* Pivot */}
        <circle fill={navy} cx="435" cy="143.06" r="10.11" />
        {/* Lower sweep — navy outer, orange inner */}
        <path
          fill={navy}
          d="m444.59,286.98c30.41-8.17,142.92-63.88,142.38-116.97,0-58.55-115.04-50.4-143.46-46.7,0,0,14.78,3.13,14.78,19.7s-14.78,20.65-14.78,20.65c30.39,1.79,84.63-6.87,86.35,35.62,0,44.48-79.59,79.3-85.26,87.7Z"
        />
        <path
          fill="#f25806"
          d="m440.87,270.06c27.2-6.3,63.51-29.24,73.6-56.14,5.03-13.42-.9-28.44-14-34.25-22.23-9.85-58.24-5.64-58.24-5.64,0,0,6.46,1.34,6.63,10.42.17,9.21-6.9,9.07-6.9,9.07,6.25,1.61,46.02-4.6,45.95,22.2-.81,27-39.59,48.8-47.03,54.34Z"
        />
      </svg>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={`whitespace-nowrap font-[family-name:var(--font-display)] ${wordSize} font-semibold tracking-[-0.03em] ${wordNavy}`}
          >
            {/* "Sohum" carries the orange; "Systems" stays navy. The artwork's
                orange (#f25806) is 3.4:1 on white — right for a graphic, short
                of AA for text — so light grounds use flame-600 (4.82:1) and
                dark grounds the brighter flame-400. Same colour family either
                way, so the header and footer lockups read identically. */}
            <span className={tone === "light" ? "text-flame-400" : "text-flame-600"}>
              Sohum
            </span>{" "}
            Systems
          </span>
        </span>
      )}
    </span>
  );
}
