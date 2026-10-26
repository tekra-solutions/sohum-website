"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, FileText, Mail, Phone } from "@/components/icons";
import { Logo } from "./Logo";
import { useToday } from "./home/useToday";
import { capabilities, pillars } from "@/lib/capabilities";
import { contact, getActiveVehicles, procurement } from "@/content/company";

const nav = [
  { href: "/capabilities", label: "Capabilities", panel: "capabilities" as const },
  { href: "/federal", label: "Federal Mission" },
  { href: "/contract-vehicles", label: "Contract Vehicles", panel: "vehicles" as const },
  { href: "/about", label: "About" },
  { href: "/careers", label: "Careers" },
];

/**
 * Site header.
 *
 * Fixed, with a spacer of constant height behind it, so it can compact on
 * scroll without shifting the page. Every page opens on a dark hero that
 * slides under the header (the homepage hero, or PageHero), so the header
 * starts transparent over it and turns to frosted white once the reader
 * scrolls. Pages that open on a light surface are listed in LIGHT_TOP.
 *
 * Each mega panel follows its trigger in the DOM, so keyboard users tab from
 * "Capabilities" straight into its links.
 */
const LIGHT_TOP = ["/capability-statement"];

export function Header({ initialDay }: { initialDay: string }) {
  const pathname = usePathname();
  const day = useToday(initialDay);
  const vehicles = getActiveVehicles(day);

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const progress = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled((prev) => (prev === y > 24 ? prev : y > 24));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Route change closes everything, adjusted during render to avoid a stale frame.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setPanel(null);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPanel = (id: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPanel(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPanel(null), 140);
  };

  // A submitted application replaces its dark hero with a light confirmation.
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setSubmitted(root.hasAttribute("data-application-submitted"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-application-submitted"] });
    return () => mo.disconnect();
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const heroTop = !submitted && !LIGHT_TOP.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const dark = mobileOpen || (heroTop && !scrolled && !panel);
  const label = "font-brand text-[0.75rem] font-bold uppercase tracking-[.1em]";

  const panels: Record<"capabilities" | "vehicles", React.ReactNode> = {
    capabilities: (
      <div
        className="absolute inset-x-0 top-full hidden border-b border-paper-200 bg-white shadow-[0_24px_48px_-24px_rgba(8,13,26,0.18)] lg:block"
        onMouseEnter={() => openPanel("capabilities")}
      >
        <div className="container-page grid grid-cols-4 gap-x-8 gap-y-8 py-10">
          {pillars.map((pillar) => (
            <div key={pillar.id}>
              <p className={`${label} text-flame-600`}>{pillar.label}</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-graphite-500">{pillar.description}</p>
              <ul className="mt-4 space-y-0.5">
                {capabilities
                  .filter((c) => c.pillar === pillar.id)
                  .map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/capabilities/${c.slug}`}
                        className="group -mx-2 flex items-center justify-between rounded px-2 py-1.5 text-[0.875rem] text-ink-800 transition-colors hover:bg-paper-100 hover:text-ink-950"
                      >
                        {c.name}
                        <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-paper-200 bg-paper-50">
          <div className="container-page flex items-center justify-between py-4">
            <p className="text-[0.875rem] text-graphite-600">
              {capabilities.length} capabilities delivered by one accountable team.
            </p>
            <Link href="/capabilities" className={`${label} inline-flex items-center gap-1.5 text-ink-900 hover:text-flame-600`}>
              View all capabilities <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    ),
    vehicles: (
      <div
        className="absolute inset-x-0 top-full hidden border-b border-paper-200 bg-white shadow-[0_24px_48px_-24px_rgba(8,13,26,0.18)] lg:block"
        onMouseEnter={() => openPanel("vehicles")}
      >
        <div className="container-page grid grid-cols-[1fr_1.2fr] gap-12 py-10">
          <div>
            <p className={`${label} text-flame-600`}>Ready to award</p>
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-graphite-600">
              {vehicles.length === 1 ? "One contract vehicle is" : `${vehicles.length} contract vehicles are`} open for new orders. Each page explains exactly how to place one.
            </p>
            <Link href="/contract-vehicles" className={`${label} mt-5 inline-flex items-center gap-1.5 text-ink-900 hover:text-flame-600`}>
              All contract vehicles <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid content-start gap-1">
            {vehicles.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/contract-vehicles#${v.slug}`}
                  className="-mx-3 flex items-baseline justify-between gap-4 rounded px-3 py-2.5 transition-colors hover:bg-paper-100"
                >
                  <span className="text-[0.9375rem] font-medium text-ink-900">{v.name}</span>
                  <span className="font-tech text-[0.75rem] text-graphite-500">{v.number}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
          mobileOpen
            ? "bg-[#05070d]"
            : dark
              ? "bg-transparent"
              : "border-b border-ink-950/[0.07] bg-white/85 shadow-[0_8px_30px_-18px_rgba(8,13,26,.35)] backdrop-blur-xl"
        }`}
        onMouseLeave={scheduleClose}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPanel(null);
        }}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>

        {/* ---- Main bar ---- */}
        <div className="container-page">
          <div className={`flex items-center justify-between gap-4 xl:gap-6 transition-[height] duration-300 ${scrolled ? "h-16 lg:h-[4.25rem]" : "h-[4.5rem] lg:h-[5rem]"}`}>
            <Link href="/" className="rounded" aria-label="Sohum Systems, home">
              <Logo tone={dark ? "light" : "dark"} />
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
              {nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <Fragment key={item.href}>
                    <Link
                      href={item.href}
                      onMouseEnter={() => (item.panel ? openPanel(item.panel) : setPanel(null))}
                      onFocus={() => (item.panel ? openPanel(item.panel) : setPanel(null))}
                      aria-expanded={item.panel ? panel === item.panel : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-2 font-brand text-[0.875rem] xl:px-3 xl:text-[0.9375rem] font-semibold tracking-[-0.005em] transition-colors ${
                        active
                          ? dark ? "text-white" : "text-ink-950"
                          : dark ? "text-white/65 hover:text-white" : "text-graphite-600 hover:text-ink-950"
                      }`}
                    >
                      {active && <span aria-hidden="true" className="mr-1 size-1 rounded-full bg-flame-500" />}
                      {item.label}
                      {item.panel && (
                        <ChevronDown
                          className={`size-3 opacity-50 transition-transform duration-200 ${panel === item.panel ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-3.5 bottom-0 h-0.5 rounded-full origin-left bg-flame-500 transition-transform duration-300 ${active ? "scale-x-0" : "scale-x-0 group-hover:scale-x-100"}`}
                      />
                    </Link>
                    {item.panel && panel === item.panel && panels[item.panel]}
                  </Fragment>
                );
              })}
            </nav>

            <div className="hidden items-center gap-1 lg:flex">
              <Link
                href="/capability-statement"
                className={`hidden min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3.5 font-brand text-[0.875rem] font-semibold transition-colors min-[1536px]:inline-flex ${dark ? "text-white/75 hover:text-white" : "text-graphite-600 hover:text-ink-950"}`}
              >
                <FileText className="size-4" aria-hidden="true" />
                Capability statement
              </Link>
              <Link
                href="/contact"
                className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 font-brand text-[0.875rem] xl:px-5 xl:text-[0.9375rem] font-bold transition-colors ${dark ? "bg-flame-500 text-ink-950 hover:bg-white" : "bg-ink-950 text-white hover:bg-flame-500 hover:text-ink-950"}`}
              >
                Talk to us <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* ---- Mobile trigger: two bars that cross into an X ---- */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className={`-mr-1 flex items-center gap-3 rounded-full py-2 pl-3 pr-2 lg:hidden ${dark ? "text-white" : "text-ink-950"}`}
            >
              <span className={label}>{mobileOpen ? "Close" : "Menu"}</span>
              <span className="relative block h-3 w-6" aria-hidden="true">
                <span className={`absolute left-0 h-0.5 w-6 rounded bg-current transition-transform duration-300 ${mobileOpen ? "top-[5px] rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 h-0.5 rounded bg-current transition-[transform,width] duration-300 ${mobileOpen ? "top-[5px] w-6 -rotate-45" : "top-2.5 w-4"}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Reading progress */}
        <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-px ${dark ? "opacity-0" : "opacity-100"}`}>
          <div ref={progress} className="h-px origin-left scale-x-0 bg-flame-500" />
        </div>

      </header>

      {/* Holds the header's resting height in the flow, so compacting never shifts the page. */}
      <div aria-hidden="true" className="h-[4.5rem] lg:h-[5rem]" />

      {/* ---- Mobile: full-screen dark menu ---- */}
      <div
        id="mobile-nav"
        hidden={!mobileOpen}
        className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-[#05070d] pt-[4.5rem] text-white lg:hidden"
      >
        <nav className="container-page pb-10 pt-6" aria-label="Mobile">
          <ul>
            {nav.map((item, i) => (
              <li key={item.href} className="border-b border-white/10">
                <Link href={item.href} className="flex items-baseline gap-4 py-4">
                  <span className="font-tech text-xs text-white/35">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`font-brand text-[1.75rem] font-bold leading-none tracking-[-0.02em] ${isActive(item.href) ? "text-flame-400" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className={`${label} mt-10 text-white/40`}>Capabilities</p>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {capabilities.map((c) => (
              <li key={c.slug}>
                <Link href={`/capabilities/${c.slug}`} className="block py-2 text-[0.9375rem] text-white/70">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link href="/contact" className="btn-tech w-full bg-flame-500 text-ink-950">
              Talk to us <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href="/capability-statement" className="btn-tech w-full border border-white/25 text-white">
              <FileText className="size-4" aria-hidden="true" /> Capability statement
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-white/60">
            <a href={`tel:${contact.phoneHref}`} className="inline-flex items-center gap-3"><Phone className="size-4" aria-hidden="true" /> {contact.phone}</a>
            <a href={`mailto:${contact.emailGeneral}`} className="inline-flex items-center gap-3"><Mail className="size-4" aria-hidden="true" /> {contact.emailGeneral}</a>
            <p className={`${label} mt-2 text-white/35`}>CAGE {procurement.cage} · UEI {procurement.uei}</p>
          </div>
        </nav>
      </div>
    </>
  );
}
