import Image from "next/image";
import { credentials } from "@/lib/site";

/**
 * Trust Center cards.
 *
 * Each card pairs the issuing body's official badge with a plain-language note
 * on what the credential actually commits us to — a badge row alone tells a
 * contracting officer nothing about risk.
 *
 * Badge art has a baked-in white background, so it sits in a white plate.
 */
export function CredentialCards() {
  return (
    <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {credentials.map((c) => (
        <li
          key={c.short}
          className="group/cred flex h-full flex-col overflow-hidden rounded-[4px] border border-paper-300 bg-white transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-500/25 hover:shadow-[var(--shadow-lift-lg)]"
        >
          {/* Badge plate */}
          <div className="flex h-[9rem] items-center justify-center border-b border-paper-200 bg-paper-50 px-5">
            <Image
              src={c.badge}
              alt={`${c.name} badge`}
              width={544}
              height={340}
              sizes="(max-width: 768px) 70vw, 320px"
              className="h-[5.25rem] w-auto max-w-[15rem] object-contain transition-transform duration-500 ease-out group-hover/cred:scale-[1.04]"
            />
          </div>

          <div className="flex flex-1 flex-col p-6">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-flame-700">
              {c.kind}
            </p>
            <h3 className="mt-2.5 text-[1.0625rem] font-medium leading-snug text-ink-900">
              {c.name}
            </h3>
            <p className="mt-2.5 flex-1 text-[0.875rem] leading-[1.65] text-graphite-600">
              {c.meaning}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
