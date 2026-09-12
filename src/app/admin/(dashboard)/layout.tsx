import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getSessionAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Recruiting admin", template: "%s · Sohum Recruiting" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin shell and the outermost authorization gate.
 *
 * Login lives in a sibling route group with no chrome, so every page rendered
 * here is behind this check. Individual mutations still call requireAdmin() —
 * this is a gate, not the only line of defence.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-dvh flex-col bg-paper-100 lg:flex-row">
      <AdminNav adminName={admin.name} role={admin.role} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
