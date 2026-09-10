import { ArrowRight } from "lucide-react";
import { ButtonLink, Eyebrow } from "./ui";
import { contact } from "@/lib/site";

/** Closing conversion band used at the foot of inner pages. */
export function CtaBand({
  eyebrow = "Next step",
  title,
  lede,
  primary = { href: "/contact", label: "Talk to us" },
  secondary,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden border-t border-paper-200 bg-ink-900 text-white">
      <div aria-hidden="true" className="absolute inset-0 grid-fine opacity-45" />
      <div
        aria-hidden="true"
        className="absolute right-[-8%] bottom-[-50%] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(18,165,218,0.13) 0%, transparent 68%)" }}
      />
      <div className="container-page relative py-16 sm:py-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow tone="light">{eyebrow}</Eyebrow>
            <h2 className="mt-5 text-[1.75rem] leading-[1.15] text-white sm:text-[2.125rem]">
              {title}
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-[1.7] text-white/60">{lede}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:pb-1">
            <ButtonLink href={primary.href} variant="onDark">
              {primary.label}
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                aria-hidden="true"
              />
            </ButtonLink>
            <ButtonLink
              href={secondary?.href ?? `mailto:${contact.emailGeneral}`}
              variant="secondary"
              className="border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.09]"
            >
              {secondary?.label ?? contact.emailGeneral}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
