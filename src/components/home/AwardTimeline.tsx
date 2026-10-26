
export type TimelineRow = {
  key: string;
  agency: string;
  title: string;
  /** Order or contract number, as it appears in the federal record. */
  reference: string;
  start: string;
  end: string;
  done?: boolean;
};

const at = (d: string) => new Date(d + "T12:00:00Z").getTime();
const pct = (v: number) => `${v.toFixed(3)}%`;
const label = "font-brand text-[0.75rem] font-bold uppercase tracking-[.1em]";
const cols = "md:grid-cols-[minmax(0,25rem)_1fr] md:gap-x-10";
const month = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

/**
 * Contract record on one shared time axis: each order is a bar across its
 * period of performance, filled to today, so a reader sees at a glance how
 * long the work has run, how long it is committed for, and what is current.
 */
export function AwardTimeline({ rows, day }: { rows: TimelineRow[]; day: string }) {
  const first = Math.min(...rows.map((r) => Number(r.start.slice(0, 4))));
  const last = Math.max(...rows.map((r) => Number(r.end.slice(0, 4)))) + 1;
  const a = at(`${first}-01-01`), b = at(`${last}-01-01`);
  const pos = (d: string) => Math.min(100, Math.max(0, ((at(d) - a) / (b - a)) * 100));
  const now = pos(day);
  const span = last - first;
  const years = Array.from({ length: span + 1 }, (_, i) => first + i);
  const grid = {
    backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)",
    backgroundSize: `${100 / span}% 100%`,
  };

  return (
    <div>
      <div aria-hidden="true" className={`hidden border-b border-white/10 pb-3 md:grid ${cols}`}>
        <span className={`${label} self-end text-white/40`}>Order and period</span>
        <div className="relative h-11">
          <span className={`${label} absolute top-0 -translate-x-1/2 text-flame-400`} style={{ left: pct(now) }}>
            Today
          </span>
          {years.map((y, i) =>
            i % 2 === 0 ? (
              <span
                key={y}
                className="absolute bottom-0 -translate-x-1/2 font-tech text-[0.75rem] text-white/45"
                style={{ left: pct(pos(`${y}-01-01`)) }}
              >
                {y}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <div className="relative">
        {/* One continuous "today" line through every row. */}
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 hidden md:grid ${cols}`}>
          <span />
          <span className="relative">
            <span className="absolute inset-y-0 w-px bg-flame-400/60" style={{ left: pct(now) }} />
          </span>
        </div>
        <ol>
          {rows.map((r) => {
            const s = pos(r.start), e = pos(r.end);
            const elapsed = r.done ? 100 : Math.min(100, Math.max(0, ((now - s) / Math.max(0.001, e - s)) * 100));
            return (
              <li
                key={r.key}
                className={`grid gap-y-4 border-b border-white/10 py-6 md:items-center ${cols}`}
              >
                <div>
                  <p className={`${label} text-white/50`}>{r.agency}</p>
                  <p className="mt-2 text-lg font-semibold leading-snug tracking-[-.02em] text-white">{r.title}</p>
                  <p className="mt-1.5 font-tech text-[0.75rem] leading-relaxed text-white/50">
                    {r.reference} <span className="text-white/25">·</span> {month(r.start)} – {month(r.end)}
                    {r.done && <span className="text-white/70"> · Completed</span>}
                  </p>
                </div>

                <div className="relative h-7" style={grid}>
                  <div
                    className={`absolute top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full ${
                      r.done ? "bg-white/25" : "bg-flame-500/15 ring-1 ring-inset ring-flame-500/45"
                    }`}
                    style={{ left: pct(s), width: pct(Math.max(0.6, e - s)) }}
                  >
                    {!r.done && (
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-flame-600 to-flame-400"
                        style={{ width: pct(elapsed) }}
                      />
                    )}
                  </div>
                  <span aria-hidden="true" className="absolute inset-y-0 w-px bg-flame-400/60 md:hidden" style={{ left: pct(now) }} />
                  <span className="sr-only">
                    {r.done ? "Completed." : `${Math.round(elapsed)}% of the period of performance has elapsed.`}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <ul aria-hidden="true" className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-white/55">
        <li className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-gradient-to-r from-flame-600 to-flame-400" />
          Elapsed
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-flame-500/15 ring-1 ring-inset ring-flame-500/45" />
          Remaining period of performance
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-white/25" />
          Completed
        </li>
      </ul>
    </div>
  );
}
