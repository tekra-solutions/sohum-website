import Link from "next/link";

/**
 * URL-driven tabs.
 *
 * Server-rendered and driven by a query parameter, so they work without
 * JavaScript like the rest of the admin's filters and forms, and so a
 * particular tab can be linked to directly (the dashboard links straight to
 * a candidate's interviews, for example).
 */
export function Tabs({
  tabs,
  active,
  href,
  label,
}: {
  tabs: readonly { id: string; label: string; count?: number }[];
  active: string;
  href: (id: string) => string;
  label: string;
}) {
  return (
    <div className="border-b border-paper-300">
      <nav aria-label={label} className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const current = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={href(tab.id)}
              aria-current={current ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[0.8125rem] transition-colors ${
                current
                  ? "border-flame-500 font-medium text-ink-900"
                  : "border-transparent text-graphite-600 hover:border-paper-300 hover:text-ink-900"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 tabular-nums text-graphite-500">{tab.count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
