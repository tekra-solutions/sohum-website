import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";
import { getSessionAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // Already signed in? Skip the form.
  if (await getSessionAdmin()) redirect("/admin");

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-[22rem]">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>

          {/* No card. On a plain white ground a bordered panel is a box drawn
              around nothing — the form is the only thing on the page, so it
              does not need to be separated from anything. */}
          <h1 className="mt-9 text-[1.5rem] font-medium leading-tight text-ink-900">
            Admin panel
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-graphite-600">
            Sign in to continue.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-8 text-[0.8125rem] text-graphite-600">
            <Link href="/" className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
              Back to sohumsystems.com
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
