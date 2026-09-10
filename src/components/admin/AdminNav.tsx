"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Briefcase, LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/lib/services/auth-actions";

const items = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/jobs", label: "Jobs", Icon: Briefcase },
  { href: "/admin/applications", label: "Applications", Icon: Users },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export function AdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile sheet on navigation, adjusting during render.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const links = (
    <ul className="space-y-1">
      {items.map(({ href, label, Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-[0.9375rem] transition-colors ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/65 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const footer = (
    <div className="border-t border-white/10 pt-4">
      <p className="px-3 text-[0.75rem] text-white/45">Signed in as</p>
      <p className="mt-1 truncate px-3 text-[0.875rem] text-white/85">{adminName}</p>
      <form action={logoutAction} className="mt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-[3px] px-3 py-2.5 text-[0.9375rem] text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* ---- Mobile bar ---- */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-ink-950 px-4 lg:hidden">
        <Link href="/admin" className="text-white" aria-label="Sohum Systems recruiting dashboard">
          <Logo tone="light" showWordmark={false} size="sm" />
        </Link>
        <span className="text-[0.875rem] font-medium text-white/80">Recruiting</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded p-2 text-white"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <div
        id="admin-nav"
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-ink-950 p-4 lg:hidden"
      >
        <nav aria-label="Admin">{links}</nav>
        <div className="mt-6">{footer}</div>
      </div>

      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-950 p-5 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div>
          <Link href="/admin" className="flex items-center gap-2.5">
            <Logo tone="light" showWordmark={false} size="sm" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-[family-name:var(--font-display)] text-[1.0625rem] font-semibold tracking-[-0.02em] text-white">
                <span className="text-flame-400">Sohum</span> Systems
              </span>
              <span className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                Recruiting
              </span>
            </span>
          </Link>
          <nav aria-label="Admin" className="mt-8">
            {links}
          </nav>
        </div>
        {footer}
      </aside>
    </>
  );
}
