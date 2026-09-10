import { ButtonLink } from "./ui";
import { ArrowRight } from "lucide-react";
import { credentials } from "@/lib/site";

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
      {/* Layered background: fine grid, a soft directional glow, and a vignette. */}
      <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-60" />
      <div
        aria-hidden="true"
        className="absolute -left-1/4 top-[-30%] h-[820px] w-[820px] rounded-full opacity-[0.55] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(18,165,218,0.20) 0%, rgba(18,165,218,0.06) 42%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(5,8,15,0.94) 0%, rgba(5,8,15,0.72) 45%, rgba(8,13,26,0.55) 100%)",
        }}
      />

      <div className="container-page relative">
        <div className="grid items-center gap-16 py-20 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:py-32">
          {/* ---- Copy ---- */}
          <div>
            <p className="eyebrow text-signal-300">
              <span aria-hidden="true" className="h-px w-8 bg-signal-400/60" />
              SBA 8(a) · CMMI Level 3 · Est. 2013
            </p>

            <h1 className="mt-7 text-[2.375rem] font-medium leading-[1.06] tracking-[-0.03em] sm:text-[3.25rem] lg:text-[3.875rem]">
              We modernize the systems
              <br className="hidden sm:block" />{" "}
              <span className="text-white/45">federal missions</span> run on.
            </h1>

            <p className="mt-7 max-w-xl text-[1.0625rem] leading-[1.65] text-white/65 sm:text-[1.125rem]">
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

            <p className="mt-8 text-[0.8125rem] text-white/40">
              Eligible for 8(a) sole-source award through November 2027.
            </p>
          </div>

          {/* ---- Credential panel: procurement facts, not decoration ---- */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-px rounded-[4px] bg-gradient-to-b from-white/12 to-transparent"
            />
            <div className="relative rounded-[4px] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-sm sm:p-9">
              <div className="flex items-baseline justify-between gap-4">
                <p className="eyebrow text-white/40">Credentialed to deliver</p>
                <span className="size-1.5 rounded-full bg-signal-400" aria-hidden="true" />
              </div>

              <ul className="mt-7 divide-y divide-white/[0.07]">
                {credentials.slice(0, 4).map((c) => (
                  <li key={c.short} className="py-4 first:pt-0">
                    <p className="font-[family-name:var(--font-display)] text-[1.0625rem] font-medium text-white">
                      {c.name}
                    </p>
                    <p className="mt-1 text-[0.8125rem] uppercase tracking-[0.1em] text-white/35">
                      {c.kind}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/40">DUNS</p>
                  <p className="mt-1.5 font-mono text-[0.875rem] text-white/85">053861658</p>
                </div>
                <div>
                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/40">CAGE</p>
                  <p className="mt-1.5 font-mono text-[0.875rem] text-white/85">7WCV6</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
