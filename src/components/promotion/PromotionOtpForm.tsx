"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  requestPromotionOtpAction, verifyPromotionOtpAction, type PromotionPublicState,
} from "@/app/promotion/[token]/actions";
import { Field, btn, btnSecondary, t } from "@/components/admin/form";

const initial: PromotionPublicState = {};

/** Shown until a verified session exists: request a code, then enter it. */
export function PromotionOtpForm({ token }: { token: string }) {
  const [requestState, requestAction, requestPending] = useActionState(requestPromotionOtpAction, initial);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPromotionOtpAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (verifyState.success) router.refresh();
  }, [verifyState.success, router]);

  return (
    <div className="space-y-6 rounded-[4px] border border-paper-300 bg-white p-6">
      <div>
        <h1 className={`${t.pageTitle} font-medium text-ink-900`}>Verify it&rsquo;s you</h1>
        <p className={`mt-2 ${t.body} text-graphite-600`}>
          For your security, we need to confirm your identity before showing this letter.
        </p>
      </div>

      <form action={requestAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <button type="submit" disabled={requestPending} className={btnSecondary}>
          {requestPending ? "Sending…" : "Email me a code"}
        </button>
        {requestState.error && <p role="alert" className={`${t.body} text-[#c0392b]`}>{requestState.error}</p>}
        {requestState.success && <p role="status" className={`${t.body} text-[#14603b]`}>{requestState.success}</p>}
      </form>

      <form action={verifyAction} className="space-y-3 border-t border-paper-200 pt-5">
        <input type="hidden" name="token" value={token} />
        <Field name="code" label="6-digit code" inputMode="numeric" required placeholder="123456" />
        <button type="submit" disabled={verifyPending} className={btn}>
          {verifyPending ? "Verifying…" : "Verify and continue"}
        </button>
        {verifyState.error && <p role="alert" className={`${t.body} text-[#c0392b]`}>{verifyState.error}</p>}
      </form>
    </div>
  );
}
