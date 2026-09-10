/**
 * Oversized, low-contrast rendering of the Sohum mark, used as background
 * texture on dark sections.
 *
 * The mark is a bird in flight, so it carries the brand's sense of forward
 * motion better than an abstract gradient would. Kept at very low opacity so
 * it reads as texture and never competes with the headline.
 */
export function BrandMotif({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="286 0 301 292"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="m428.93,0c-30.41,8.17-142.92,63.88-142.38,116.97,0,58.55,115.04,50.4,143.46,46.7,0,0-14.78-3.13-14.78-19.7s14.78-20.65,14.78-20.65c-30.39-1.79-84.63,6.87-86.35-35.62,0-44.48,79.59-79.3,85.26-87.7Z"
      />
      <path
        fill="currentColor"
        opacity="0.55"
        d="m432.65,16.92c-27.2,6.3-63.51,29.24-73.6,56.14-5.03,13.42.9,28.44,14,34.25,22.23,9.85,58.24,5.64,58.24,5.64,0,0-6.46-1.34-6.63-10.42-.17-9.21,6.9-9.07,6.9-9.07-6.25-1.61-46.02,4.6-45.95-22.2.81-27,39.59-48.8,47.03-54.34Z"
      />
      <circle fill="currentColor" cx="435" cy="143.06" r="10.11" />
      <path
        fill="currentColor"
        opacity="0.55"
        d="m444.59,286.98c30.41-8.17,142.92-63.88,142.38-116.97,0-58.55-115.04-50.4-143.46-46.7,0,0,14.78,3.13,14.78,19.7s-14.78,20.65-14.78,20.65c30.39,1.79,84.63-6.87,86.35,35.62,0,44.48-79.59,79.3-85.26,87.7Z"
      />
      <path
        fill="currentColor"
        d="m440.87,270.06c27.2-6.3,63.51-29.24,73.6-56.14,5.03-13.42-.9-28.44-14-34.25-22.23-9.85-58.24-5.64-58.24-5.64,0,0,6.46,1.34,6.63,10.42.17,9.21-6.9,9.07-6.9,9.07,6.25,1.61,46.02-4.6,45.95,22.2-.81,27-39.59,48.8-47.03,54.34Z"
      />
    </svg>
  );
}
