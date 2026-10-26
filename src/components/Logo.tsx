/**
 * Sohum Systems brand mark: a stylised Sudarshana Chakra.
 *
 * Two counter-sweeping blade pairs, saffron and navy, turn about a central hub,
 * the spinning discus of order and protection. This is a precision redraw of
 * the original artwork:
 *  - exact 180° rotational symmetry about one true centre (436.76, 143.49);
 *  - the hub bite is a true circular arc, and the white ring around the hub
 *    matches the channel between the blades;
 *  - the inner blades end in clean cuts instead of the small hooked nubs.
 * Source lives in public/brand/sohum-chakra-2026.svg.
 */

const BLADE_OUTER = "M428.93 0.00C398.52 8.17 286.01 63.88 286.55 116.97C286.55 175.52 401.59 167.37 430.01 163.66A21.27 21.27 0 0 1 430.01 123.32C399.62 121.53 345.38 130.19 343.66 87.70C343.66 43.22 423.25 8.40 428.93 0.00Z";
const BLADE_INNER = "M432.65 16.92C405.45 23.22 369.14 46.16 359.05 73.06C354.02 86.48 359.95 101.50 373.05 107.31C395.28 117.16 431.29 112.95 431.29 112.95L431.55 93.46C425.30 91.85 385.53 98.06 385.60 71.26C386.41 44.26 425.19 22.46 432.65 16.92Z";

export function LogoMark({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const navy = tone === "light" ? "#c9d4ea" : "#304368";
  return (
    <svg viewBox="285.76 -7.51 302 302" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      {/* The discus turns once about its hub on hover. */}
      <g
        style={{ transformOrigin: "436.76px 143.49px", transformBox: "view-box" }}
        className="transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none group-hover/logo:rotate-[360deg]"
      >
        <path fill="#f25806" d={BLADE_OUTER} />
        <path fill={navy} d={BLADE_INNER} />
        <g transform="rotate(180 436.76 143.49)">
          <path fill={navy} d={BLADE_OUTER} />
          <path fill="#f25806" d={BLADE_INNER} />
        </g>
        <circle cx="436.76" cy="143.49" r="12.3" fill={navy} />
      </g>
    </svg>
  );
}

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
  /** sm = compact rails such as the admin sidebar; md = header default; lg = footer masthead. */
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "sm" ? "size-8" : size === "lg" ? "size-14 sm:size-16" : "size-10 lg:size-11";
  const word = size === "sm" ? "text-[0.9375rem]" : size === "lg" ? "text-[1.5rem] sm:text-[1.75rem]" : "text-[1.0625rem] lg:text-[1.1875rem]";

  return (
    <span className={`group/logo inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={mark} tone={tone} />
      {showWordmark ? (
        // Stacked lockup: SOHUM in heavy caps, SYSTEMS spaced to exactly the same width.
        <span className={`flex flex-col font-brand ${word}`}>
          <span className="sr-only">Sohum Systems</span>
          <span aria-hidden="true" className={`font-extrabold leading-none tracking-[0.06em] ${tone === "light" ? "text-white" : "text-ink-950"}`}>
            SOHUM
          </span>
          <span
            aria-hidden="true"
            className={`mt-[0.3em] flex justify-between pl-[0.05em] text-[0.43em] font-semibold leading-none ${tone === "light" ? "text-flame-400" : "text-flame-600"}`}
          >
            {"SYSTEMS".split("").map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </span>
        </span>
      ) : (
        <span className="sr-only">Sohum Systems</span>
      )}
    </span>
  );
}
