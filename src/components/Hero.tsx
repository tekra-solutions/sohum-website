import { ButtonLink } from "./ui";
import { ArrowRight } from "lucide-react";
import { credentials } from "@/lib/site";
import { BrandMotif } from "./BrandMotif";

/**
 * Homepage hero.
 *
 * Answers who/what/who-we-serve above the fold, and puts the three credentials a
 * contracting officer screens for directly beneath the headline rather than in a
 * logo strip further down.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      {/*
        Background is deliberately flat and even. An earlier diagonal gradient
        lifted the right-hand side, which made the credential panel read as a
        highlighted box pasted on top rather than part of the composition.
      */}
      <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-[0.35]" />

      {/* Brand mark as background texture — echoes the flight form in the logo. */}
      <BrandMotif
        className="pointer-events-none absolute -right-[20%] -top-[14%] hidden w-[72%] rotate-[-8deg] text-flame-500/[0.055] lg:block"
      />

      {/* A single warm pool low and left, well away from the panel. */}
      <div
        aria-hidden="true"
        className="absolute -left-[15%] bottom-[-45%] h-[720px] w-[720px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(242,88,6,0.13) 0%, rgba(242,88,6,0.04) 45%, transparent 70%)",
        }}
      />

      {/* Vignette: settles the edges without brightening any one region. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 30% 40%, transparent 0%, rgba(9,12,19,0.55) 100%)",
        }}
      />

      <div className="container-page relative">
        <div className="grid items-center gap-16 py-20 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:py-32">
          {/* ---- Copy ---- */}
          <div>
            <p className="eyebrow text-flame-400">
              <span aria-hidden="true" className="h-px w-8 bg-flame-500/60" />
              SBA 8(a) · CMMI Level 3 · Est. 2013
            </p>

            {/*
              The trailing clause is kept on one line only from `sm` up; at phone
              widths it must be free to wrap or it overflows the viewport.
            */}
            <h1 className="mt-7 text-[2.125rem] font-medium leading-[1.08] tracking-[-0.03em] text-balance sm:text-[3.125rem] lg:text-[3.625rem]">
              We modernize the systems{" "}
              <span className="sm:whitespace-nowrap">
                <span className="text-flame-400">federal missions</span> run on.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-[1.0625rem] leading-[1.7] text-white/70 sm:text-[1.125rem]">
              Sohum Systems engineers software, migrates legacy systems to the cloud, and turns
              agency data into evidence people act on — delivered by a CMMI Level 3 appraised
              team that agencies can award to directly.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/capabilities" variant="onDark">
                Explore our capabilities
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                  aria-hidden="true"
                />
              </ButtonLink>
              <ButtonLink
                href="/contract-vehicles"
                variant="secondary"
                className="border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.09]"
              >
                How to contract with us
              </ButtonLink>
            </div>

            <p className="mt-8 text-[0.8125rem] text-white/55">
              Eligible for 8(a) sole-source award through November 2027.
            </p>
          </div>

          {/*
            Credential list: procurement facts, not decoration.
            Set open on the background — a single hairline on the left carries
            the grouping, so nothing here reads as a highlighted card.
          */}
          <div className="relative lg:pl-10">
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 hidden h-[calc(100%-0.25rem)] w-px bg-gradient-to-b from-flame-500/60 via-white/12 to-transparent lg:block"
            />

            <p className="eyebrow text-white/50">Credentialed to deliver</p>

            <ul className="mt-6 space-y-5">
              {credentials.slice(0, 4).map((c) => (
                <li key={c.short}>
                  <p className="font-[family-name:var(--font-display)] text-[1.125rem] font-medium leading-snug text-white">
                    {c.name}
                  </p>
                  <p className="mt-1 text-[0.75rem] uppercase tracking-[0.1em] text-white/45">
                    {c.kind}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              <div>
                <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/45">DUNS</dt>
                <dd className="mt-1.5 font-mono text-[0.875rem] text-white/85">053861658</dd>
              </div>
              <div>
                <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/45">CAGE</dt>
                <dd className="mt-1.5 font-mono text-[0.875rem] text-white/85">7WCV6</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
