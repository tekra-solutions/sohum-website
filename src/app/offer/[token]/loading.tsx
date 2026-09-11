/**
 * Candidate-facing skeleton. The offer page resolves a token, checks the
 * verification session and loads the frozen version before rendering, so a
 * candidate on a slow connection would otherwise see an empty page while
 * waiting on the most important email they have had all week.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[3px] bg-paper-200 ${className}`} />;
}

export default function OfferLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your offer…</span>
      <div>
        <Bar className="h-6 w-2/3" />
        <Bar className="mt-2 h-4 w-1/2" />
      </div>
      <div className="rounded-[4px] border border-paper-300 bg-white p-5">
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex justify-between gap-4 border-b border-paper-200 pb-2 last:border-0">
              <Bar className="h-3 w-24" />
              <Bar className="h-3.5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
