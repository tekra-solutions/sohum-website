"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/services/auth-actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  const field =
    "mt-2 w-full rounded-[3px] border border-paper-300 bg-white px-4 py-3 text-[0.9375rem] " +
    "text-ink-900 transition-colors focus:border-flame-500 focus:outline-none " +
    "focus:ring-2 focus:ring-flame-500/30";

  return (
    <form action={action} className="space-y-5">
      <div aria-live="polite">
        {state.error && (
          <div className="flex gap-3 rounded-[3px] border border-[#c0392b]/30 bg-[#c0392b]/[0.05] p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#c0392b]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#8e2c20]">{state.error}</p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-[0.875rem] font-medium text-ink-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className={field}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[0.875rem] font-medium text-ink-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="group/btn inline-flex w-full items-center justify-center gap-2 rounded-[3px] bg-ink-900 px-6 py-3.5 text-[0.9375rem] font-medium text-white transition-colors hover:bg-ink-700 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1"
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </form>
  );
}
