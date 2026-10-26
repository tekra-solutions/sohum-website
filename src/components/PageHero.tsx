import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import type { ReactNode } from "react";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";

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
    <section className="relative isolate overflow-hidden bg-[#05070d] text-white">
      {/* The chakra, cropped off the right edge: the one decorative element. */}
      <LogoMark tone="light" className="pointer-events-none absolute -right-32 -top-24 -z-10 size-[34rem] opacity-[0.04]" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
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
                      className="inline-flex min-h-8 items-center rounded text-white/55 transition-colors hover:text-white"
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
          className={`grid gap-10 pb-12 pt-8 sm:pb-16 sm:pt-10 ${
            aside ? "lg:grid-cols-[1.15fr_0.85fr] lg:gap-16" : ""
          }`}
        >
          <div className={aside ? "" : "max-w-3xl"}>
            <p className="eyebrow text-flame-400">{eyebrow}</p>
            <h1 className="mt-4 text-[2rem] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[2.5rem] lg:text-[3rem]">
              {title}
            </h1>
            {lede && (
              <p className="mt-5 max-w-2xl text-[1rem] leading-[1.7] text-white/65 sm:text-[1.0625rem]">
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
