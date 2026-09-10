import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

export type Crumb = { label: string; href?: string };

/**
 * Inner-page hero with breadcrumbs.
 *
 * Emits BreadcrumbList structured data from the same crumb array that renders
 * visually, so the two can never drift apart.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  crumbs: Crumb[];
  aside?: ReactNode;
}) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...crumbs];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${site.url}${c.href}` } : {}),
    })),
  };

  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-55" />
      <div
        aria-hidden="true"
        className="absolute left-[-15%] top-[-40%] h-[620px] w-[620px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(18,165,218,0.16) 0%, transparent 68%)" }}
      />

      <div className="container-page relative">
        {/* ---- Breadcrumbs ---- */}
        <nav aria-label="Breadcrumb" className="pt-7">
          <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem]">
            {trail.map((c, i) => {
              const last = i === trail.length - 1;
              return (
                <li key={c.label} className="flex items-center gap-1.5">
                  {c.href && !last ? (
                    <Link
                      href={c.href}
                      className="rounded text-white/45 transition-colors hover:text-white"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white/80" aria-current="page">
                      {c.label}
                    </span>
                  )}
                  {!last && (
                    <ChevronRight className="size-3.5 text-white/25" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div
          className={`grid gap-12 pb-16 pt-10 sm:pb-20 sm:pt-14 ${
            aside ? "lg:grid-cols-[1.15fr_0.85fr] lg:gap-16" : ""
          }`}
        >
          <div className={aside ? "" : "max-w-3xl"}>
            <p className="eyebrow text-signal-300">
              <span aria-hidden="true" className="h-px w-8 bg-signal-400/60" />
              {eyebrow}
            </p>
            <h1 className="mt-6 text-[2.125rem] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[2.875rem] lg:text-[3.25rem]">
              {title}
            </h1>
            {lede && (
              <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-white/60 sm:text-[1.125rem]">
                {lede}
              </p>
            )}
          </div>
          {aside && <div className="lg:pt-2">{aside}</div>}
        </div>
      </div>
    </section>
  );
}
