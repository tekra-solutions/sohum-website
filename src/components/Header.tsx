"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { capabilities, pillars } from "@/lib/capabilities";
import { activeVehicles } from "@/lib/site";

const nav = [
  { href: "/capabilities", label: "Capabilities", panel: "capabilities" as const },
  { href: "/federal", label: "Federal Mission" },
  { href: "/contract-vehicles", label: "Contract Vehicles", panel: "vehicles" as const },
  { href: "/about", label: "About" },
  { href: "/careers", label: "Careers" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      // Compare before setting so a scroll event at the same state is a no-op.
      setScrolled((prev) => {
        const next = window.scrollY > 8;
        return prev === next ? prev : next;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Seed from the restored scroll position on the next frame, which keeps the
    // initial paint consistent without a synchronous setState in the effect body.
    const raf = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Route change closes everything. Adjusting during render (rather than in an
  // effect) avoids a frame where the menu is still open on the new page.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setPanel(null);
  }

  // Lock body scroll while the mobile sheet is open.
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

  // Small close delay keeps the panel usable while the pointer crosses the gap.
  const openPanel = (id: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPanel(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPanel(null), 140);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled || panel
          ? "border-b border-paper-200 bg-white/92 backdrop-blur-xl"
          : "border-b border-transparent bg-white"
      }`}
      onMouseLeave={scheduleClose}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      <div className="container-page">
        <div className="flex h-[5.5rem] items-center justify-between gap-6">
          <Link
            href="/"
            className="rounded transition-opacity hover:opacity-70"
            aria-label="Sohum Systems — home"
          >
            <Logo />
          </Link>

          {/* ---- Desktop nav ---- */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    onMouseEnter={() => (item.panel ? openPanel(item.panel) : setPanel(null))}
                    onFocus={() => (item.panel ? openPanel(item.panel) : setPanel(null))}
                    aria-expanded={item.panel ? panel === item.panel : undefined}
                    className={`flex items-center gap-1 rounded px-3 py-2 text-[0.9375rem] transition-colors ${
                      active
                        ? "text-ink-900"
                        : "text-graphite-600 hover:text-ink-900"
                    }`}
                  >
                    {item.label}
                    {item.panel && (
                      <ChevronDown
                        className={`size-3.5 opacity-50 transition-transform duration-200 ${
                          panel === item.panel ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 -bottom-px h-0.5 origin-left bg-flame-500 transition-transform duration-300 ${
                        active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/contact"
              className="rounded-[3px] bg-ink-900 px-5 py-3 text-[0.875rem] font-medium text-white transition-colors hover:bg-ink-700"
            >
              Talk to us
            </Link>
          </div>

          {/* ---- Mobile trigger ---- */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="-mr-2 rounded p-2 text-ink-900 lg:hidden"
          >
            {mobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ---- Desktop mega panels ---- */}
      {panel === "capabilities" && (
        <div
          className="absolute inset-x-0 top-full hidden border-b border-paper-200 bg-white shadow-[0_24px_48px_-24px_rgba(8,13,26,0.18)] lg:block"
          onMouseEnter={() => openPanel("capabilities")}
        >
          <div className="container-page grid grid-cols-4 gap-x-8 gap-y-8 py-10">
            {pillars.map((pillar) => (
              <div key={pillar.id}>
                <p className="eyebrow text-graphite-400">{pillar.label}</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-graphite-500">
                  {pillar.description}
                </p>
                <ul className="mt-4 space-y-0.5">
                  {capabilities
                    .filter((c) => c.pillar === pillar.id)
                    .map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/capabilities/${c.slug}`}
                          className="-mx-2 block rounded px-2 py-1.5 text-[0.875rem] text-ink-800 transition-colors hover:bg-paper-100 hover:text-ink-950"
                        >
                          {c.name}
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
                Eleven capabilities delivered by one accountable team.
              </p>
              <Link
                href="/capabilities"
                className="text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
              >
                View all capabilities
              </Link>
            </div>
          </div>
        </div>
      )}

      {panel === "vehicles" && (
        <div
          className="absolute inset-x-0 top-full hidden border-b border-paper-200 bg-white shadow-[0_24px_48px_-24px_rgba(8,13,26,0.18)] lg:block"
          onMouseEnter={() => openPanel("vehicles")}
        >
          <div className="container-page grid grid-cols-[1fr_1.2fr] gap-12 py-10">
            <div>
              <p className="eyebrow text-graphite-400">Ready to award</p>
              <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-graphite-600">
                Three active pathways, including 8(a) sole source and a SEWP VI Category A
                position running through 2036.
              </p>
              <Link
                href="/contract-vehicles"
                className="mt-5 inline-block text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500"
              >
                All contract vehicles
              </Link>
            </div>
            <ul className="grid gap-1">
              {activeVehicles.map((v) => (
                <li key={v.slug}>
                  <Link
                    href={`/contract-vehicles#${v.slug}`}
                    className="-mx-3 flex items-baseline justify-between gap-4 rounded px-3 py-2.5 transition-colors hover:bg-paper-100"
                  >
                    <span className="text-[0.9375rem] font-medium text-ink-900">{v.name}</span>
                    <span className="font-mono text-[0.75rem] text-graphite-500">
                      {v.number ?? v.pop}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ---- Mobile sheet ---- */}
      <div
        id="mobile-nav"
        hidden={!mobileOpen}
        className="fixed inset-x-0 top-[5.5rem] bottom-0 z-40 overflow-y-auto overscroll-contain border-t border-paper-200 bg-white lg:hidden"
      >
        <nav className="container-page py-6" aria-label="Mobile">
          <ul className="divide-y divide-paper-200">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between py-4 text-[1.0625rem] text-ink-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="eyebrow mt-8 text-graphite-400">All capabilities</p>
          <ul className="mt-3 grid gap-0.5">
            {capabilities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/capabilities/${c.slug}`}
                  className="-mx-2 block rounded px-2 py-2 text-[0.9375rem] text-graphite-700"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/contact"
            className="mt-8 flex w-full items-center justify-center rounded-[3px] bg-ink-900 px-6 py-4 text-[1rem] font-medium text-white"
          >
            Talk to us
          </Link>
        </nav>
      </div>
    </header>
  );
}
