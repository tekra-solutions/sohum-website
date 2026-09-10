import Image from "next/image";
import { logoGroups, allLogos } from "@/lib/logos";

/**
 * Logo presentation.
 *
 * The source images all carry a baked-in white background, so every mark sits on
 * a white card rather than on a tint. Marks are rendered greyscale at rest and
 * resolve to full colour on hover, which keeps a wall of clashing brand palettes
 * from fighting the page — and gives the row a deliberate, designed feel.
 */

/** Compact single strip, used on the homepage. */
export function LogoStrip({ className = "" }: { className?: string }) {
  return (
    <ul
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-paper-300 bg-paper-300 sm:grid-cols-3 lg:grid-cols-6 ${className}`}
    >
      {allLogos.slice(0, 12).map((logo) => (
        <li key={logo.file} className="group/logo flex h-28 items-center justify-center bg-white px-5">
          <Image
            src={`/logos/${logo.file}`}
            alt={logo.alt}
            width={280}
            height={280}
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 140px"
            className="h-24 w-auto max-w-[9.5rem] object-contain opacity-80 grayscale transition duration-500 ease-out group-hover/logo:opacity-100 group-hover/logo:grayscale-0"
          />
        </li>
      ))}
    </ul>
  );
}

/** Grouped presentation, used on the Federal Mission page. */
export function LogoWall() {
  return (
    <div className="space-y-12">
      {logoGroups.map((group) => (
        <div key={group.id}>
          <div className="flex flex-col gap-2 border-b border-paper-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-[1.0625rem] font-medium text-ink-900">{group.label}</h3>
            <p className="max-w-xl text-[0.875rem] leading-relaxed text-graphite-600 sm:text-right">
              {group.note}
            </p>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {group.items.map((logo) => (
              <li
                key={logo.file}
                className="group/logo flex h-32 items-center justify-center rounded-[4px] border border-paper-200 bg-white px-5 transition-[border-color,box-shadow] duration-300 hover:border-paper-300 hover:shadow-[var(--shadow-lift)]"
              >
                <Image
                  src={`/logos/${logo.file}`}
                  alt={logo.alt}
                  width={280}
                  height={280}
                  sizes="(max-width: 640px) 40vw, (max-width: 1024px) 26vw, 160px"
                  className="h-28 w-auto max-w-full object-contain opacity-85 grayscale transition duration-500 ease-out group-hover/logo:opacity-100 group-hover/logo:grayscale-0"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
