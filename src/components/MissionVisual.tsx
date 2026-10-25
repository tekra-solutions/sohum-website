import Image from "next/image";

/** Shared editorial treatment for conceptual mission and data artwork. */
export function MissionVisual({
  variant,
  caption,
  className = "",
}: {
  variant: "globe" | "ai";
  caption: string;
  className?: string;
}) {
  return (
    <figure className={`overflow-hidden rounded-[4px] border border-white/10 bg-night-950 ${className}`}>
      <Image
        src={`/images/mission/${variant === "globe" ? "connected-globe" : "ai-data-network"}.webp`}
        alt=""
        width={1536}
        height={1024}
        sizes="(min-width: 1280px) 480px, (min-width: 1024px) 40vw, (min-width: 640px) 75vw, 100vw"
        className="h-auto w-full"
      />
      <figcaption className="flex items-center gap-3 border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-white/75 sm:px-6">
        <span aria-hidden="true" className="h-4 w-0.5 shrink-0 bg-azure-400" />
        {caption}
      </figcaption>
    </figure>
  );
}
