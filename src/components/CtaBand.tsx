import { ArrowRight } from "@/components/icons";
import { ButtonLink, Eyebrow } from "./ui";
import { LogoMark } from "./Logo";
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
    <section className="relative isolate overflow-hidden bg-[#0b0f1a] text-white">
      <LogoMark tone="light" className="pointer-events-none absolute -bottom-40 -right-24 -z-10 size-[30rem] opacity-[0.045]" />
      <div className="container-page relative section-y-tight">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow tone="light">{eyebrow}</Eyebrow>
            <h2 className="mt-4 text-[2rem] leading-[1.08] text-white sm:text-[2.5rem]">
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
              variant="outlineDark"
            >
              {secondary?.label ?? contact.emailGeneral}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
