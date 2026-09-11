"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { requestOtpAction, verifyOtpAction, type OfferPublicState } from "@/app/offer/[token]/actions";
import { Field, btn, btnSecondary, t } from "@/components/admin/form";

const initial: OfferPublicState = {};

/** Shown when there is no verified session yet: request a code, then enter it. */
export function OtpForm({ token }: { token: string }) {
  const [requestState, requestAction, requestPending] = useActionState(requestOtpAction, initial);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (verifyState.success) router.refresh();
  }, [verifyState.success, router]);

  return (
    <div className="space-y-6 rounded-[4px] border border-paper-300 bg-white p-6">
      <div>
        <h1 className={`${t.pageTitle} font-medium text-ink-900`}>Verify it&rsquo;s you</h1>
        <p className={`mt-2 ${t.body} text-graphite-600`}>
          For your security, we need to confirm your identity before showing the details of this offer.
        </p>
      </div>

      <form action={requestAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <button type="submit" disabled={requestPending} className={btnSecondary}>
          {requestPending ? "Sending…" : "Send verification code"}
        </button>
        {requestState.success && <p className={`${t.body} text-[#14603b]`}>{requestState.success}</p>}
        {requestState.error && <p className={`${t.body} text-[#8e2c20]`}>{requestState.error}</p>}
      </form>

      <form action={verifyAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <Field name="code" label="6-digit code" required inputMode="numeric" placeholder="000000" />
        <button type="submit" disabled={verifyPending} className={btn}>
          {verifyPending ? "Verifying…" : "Verify"}
        </button>
        {verifyState.error && <p className={`${t.body} text-[#8e2c20]`}>{verifyState.error}</p>}
      </form>
    </div>
  );
}
