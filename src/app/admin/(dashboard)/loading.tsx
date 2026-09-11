/**
 * Route-level skeleton for every admin screen.
 *
 * All admin pages are force-dynamic and fan out to several queries, so
 * without this Next.js shows the previous page frozen (or nothing on a cold
 * load) until the server responds. A single skeleton at the layout level
 * covers every route rather than each page hand-rolling its own, and it
 * mirrors the shared page shape: sticky header, then content.
 *
 * Deliberately a static shimmer rather than a spinner — it signals where
 * content will land instead of just that something is happening.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[3px] bg-paper-200 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Header band, matching AdminHeader's sticky bar. */}
      <div className="border-b border-paper-300 bg-white px-5 py-5 sm:px-8 sm:py-6">
        <Bar className="h-5 w-56" />
        <Bar className="mt-2 h-3.5 w-72" />
      </div>

      <div className="space-y-5 p-5 sm:p-6 lg:p-8">
        {/* Counter row. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="rounded-[4px] border border-paper-300 bg-white px-4 py-3.5">
              <Bar className="h-2.5 w-20" />
              <Bar className="mt-2 h-6 w-12" />
            </div>
          ))}
        </div>

        {/* Primary content block. */}
        <div className="rounded-[4px] border border-paper-300 bg-white p-5">
          <Bar className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-paper-200 pb-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <Bar className="h-3.5 w-1/3" />
                  <Bar className="mt-2 h-3 w-1/4" />
                </div>
                <Bar className="h-5 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
