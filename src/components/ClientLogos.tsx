import Image from "next/image";
import { allLogos, logoGroups } from "@/content/company";

/**
 * Client, partner, and platform logos.
 *
 * The source images carry a baked-in white background, so each mark sits on its
 * own white tile. Marks rest in greyscale and resolve to full colour on hover,
 * which keeps thirteen competing brand palettes from fighting the page.
 */

export const LOGO_DISCLAIMER =
  "Marks shown are the property of their respective owners. Their appearance indicates organizations represented in our work and the platforms and frameworks our teams are certified in. It does not imply endorsement or a current contractual relationship.";

function Tile({ file, alt, className = "" }: { file: string; alt: string; className?: string }) {
  return (
    <div className={`group/logo flex items-center justify-center rounded-xl bg-white ${className}`}>
      <Image
        src={`/logos/${file}`}
        alt={alt}
        width={280}
        height={280}
        sizes="160px"
        className="h-full w-auto object-contain opacity-80 grayscale transition duration-500 ease-out group-hover/logo:opacity-100 group-hover/logo:grayscale-0"
      />
    </div>
  );
}

/**
 * Endless scrolling band for dark sections. The source art is dark-on-white, so
 * each mark is inverted to light-on-black and screened onto a track painted in
 * the section colour: the black falls away and only the mark remains, in one
 * consistent tone. Pauses on hover; static with reduced motion.
 */
export function LogoMarquee({ ground = "#0b0d12" }: { ground?: string }) {
  return (
    <div className="group/band overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="marquee flex w-max group-hover/band:[animation-play-state:paused]" style={{ backgroundColor: ground }}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-6 pr-6 sm:gap-10 sm:pr-10" aria-hidden={copy === 1 || undefined}>
            {allLogos.map((logo) => (
              <li key={logo.file} className="flex h-20 w-32 items-center justify-center sm:h-24 sm:w-40">
                <Image
                  src={`/logos/${logo.file}`}
                  alt={copy === 1 ? "" : logo.alt}
                  width={280}
                  height={280}
                  sizes="160px"
                  className="h-full w-auto object-contain opacity-70 mix-blend-screen transition-opacity duration-300 [filter:grayscale(1)_invert(1)_brightness(1.55)] hover:opacity-100"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** Grouped wall, for the Federal Mission page. */
export function LogoWall() {
  return (
    <div className="space-y-12">
      {logoGroups.map((group) => (
        <div key={group.id}>
          <div className="flex flex-col gap-2 border-b border-paper-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-[1.125rem] text-ink-900">{group.label}</h3>
            <p className="max-w-xl text-[0.875rem] leading-relaxed text-graphite-600 sm:text-right">{group.note}</p>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {group.items.map((logo) => (
              <li key={logo.file}>
                <Tile
                  file={logo.file}
                  alt={logo.alt}
                  className="h-32 border border-paper-200 transition-[border-color,box-shadow] duration-300 hover:border-paper-300 hover:shadow-[var(--shadow-lift)]"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
