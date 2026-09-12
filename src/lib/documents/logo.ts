/**
 * The Sohum Systems mark, as a self-contained data URI for print documents.
 *
 * The offer letter and the invoice are rendered by a headless Chromium that
 * aborts every external request, so a `/brand/logo-full.svg` reference would
 * silently render blank — which is exactly what was happening: both renderers
 * accepted a `logoDataUri`, but no call site ever supplied one, so every
 * issued offer and invoice went out with no logo at all.
 *
 * The paths below are the original artwork, copied verbatim from
 * public/brand/logo-full.svg (the same paths components/Logo.tsx draws), so
 * the documents and the web app render the identical mark. Only the symbol is
 * used: the documents set "SOHUM SYSTEMS" in live text beneath it, which stays
 * crisp at any size and keeps the lockup consistent between the two.
 *
 * Inlined rather than read from disk at request time because the PDF route
 * runs on a serverless filesystem where public/ is not reliably readable, and
 * because a document's branding should not depend on I/O succeeding.
 */

/** Brand values, from the source artwork. */
const FLAME = "#f25806";
const NAVY = "#304368";

/**
 * The symbol alone, cropped to its bounds (x 286-587, y 0-292) exactly as
 * Logo.tsx crops it. Two rotationally symmetric sweeps around a pivot.
 */
const SYMBOL_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="286 0 301 292">` +
  `<path fill="${FLAME}" d="m428.93,0c-30.41,8.17-142.92,63.88-142.38,116.97,0,58.55,115.04,50.4,143.46,46.7,0,0-14.78-3.13-14.78-19.7s14.78-20.65,14.78-20.65c-30.39-1.79-84.63,6.87-86.35-35.62,0-44.48,79.59-79.3,85.26-87.7Z"/>` +
  `<path fill="${NAVY}" d="m432.65,16.92c-27.2,6.3-63.51,29.24-73.6,56.14-5.03,13.42.9,28.44,14,34.25,22.23,9.85,58.24,5.64,58.24,5.64,0,0-6.46-1.34-6.63-10.42-.17-9.21,6.9-9.07,6.9-9.07-6.25-1.61-46.02,4.6-45.95-22.2.81-27,39.59-48.8,47.03-54.34Z"/>` +
  `<circle fill="${NAVY}" cx="435" cy="143.06" r="10.11"/>` +
  `<path fill="${NAVY}" d="m444.59,286.98c30.41-8.17,142.92-63.88,142.38-116.97,0-58.55-115.04-50.4-143.46-46.7,0,0,14.78,3.13,14.78,19.7s-14.78,20.65-14.78,20.65c30.39,1.79,84.63-6.87,86.35,35.62,0,44.48-79.59,79.3-85.26,87.7Z"/>` +
  `<path fill="${FLAME}" d="m440.87,270.06c27.2-6.3,63.51-29.24,73.6-56.14,5.03-13.42-.9-28.44-14-34.25-22.23-9.85-58.24-5.64-58.24-5.64,0,0,6.46,1.34,6.63,10.42.17,9.21-6.9,9.07-6.9,9.07,6.25,1.61,46.02-4.6,45.95,22.2-.81,27-39.59,48.8-47.03,54.34Z"/>` +
  `</svg>`;

/**
 * The mark as a data URI, ready for an <img src>.
 *
 * SVG is used rather than a raster so the mark stays sharp at print DPI. It is
 * percent-encoded rather than base64: the payload is small, it stays readable
 * in a rendered document's source, and it avoids a Buffer dependency in code
 * that also runs in the edge runtime.
 */
export const sohumLogoDataUri =
  `data:image/svg+xml,${encodeURIComponent(SYMBOL_SVG)}`;
