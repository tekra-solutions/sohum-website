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
    <div className="flex min-h-dvh flex-col bg-paper-50">
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>

          <div className="mt-8 rounded-[4px] border border-paper-300 bg-white p-7 sm:p-8">
            <h1 className="text-[1.375rem] font-medium text-ink-900">Recruiting admin</h1>
            <p className="mt-2 text-[0.9375rem] text-graphite-600">
              Sign in to manage jobs and applications.
            </p>
            <div className="mt-7">
              <LoginForm />
            </div>
          </div>

          <p className="mt-6 text-center text-[0.8125rem] text-graphite-600">
            <Link href="/" className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
              Back to sohumsystems.com
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
