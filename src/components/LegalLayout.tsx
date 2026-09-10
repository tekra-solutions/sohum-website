import type { ReactNode } from "react";
import { PageHero, type Crumb } from "./PageHero";

/** Shared shell for policy pages: prose column with consistent rhythm. */
export function LegalLayout({
  eyebrow,
  title,
  lede,
  crumbs,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  crumbs: Crumb[];
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lede={lede} crumbs={crumbs} />
      <section className="bg-white">
        <div className="container-page py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-[0.8125rem] text-graphite-500">Last updated {updated}</p>
            <div
              className="mt-10 space-y-8
                [&_h2]:mt-12 [&_h2]:text-[1.25rem] [&_h2]:font-medium [&_h2]:text-ink-900
                [&_h2:first-child]:mt-0
                [&_p]:text-[1rem] [&_p]:leading-[1.75] [&_p]:text-graphite-600
                [&_ul]:space-y-2.5 [&_ul]:text-[1rem] [&_ul]:leading-[1.7] [&_ul]:text-graphite-600
                [&_li]:relative [&_li]:pl-5
                [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6875rem]
                [&_li]:before:size-1 [&_li]:before:rounded-full [&_li]:before:bg-graphite-400
                [&_a]:text-ink-900 [&_a]:underline [&_a]:decoration-paper-300 [&_a]:underline-offset-4
                [&_a:hover]:decoration-signal-500"
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
