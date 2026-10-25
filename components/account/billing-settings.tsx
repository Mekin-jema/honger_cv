"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import type { BillingSummary, PortfolioInsights } from "@/server/billing";
import { withBase } from "@/lib/utils";

type ApiResult = { ok?: boolean; checkoutUrl?: string; paid?: boolean; active?: boolean; cancelled?: boolean; error?: string };

async function requestJson(url: string, init: RequestInit): Promise<ApiResult> {
  const response = await fetch(withBase(url), init);
  const result = await response.json() as ApiResult;
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

function expiryLabel(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function BillingSettings({ billing, insights }: { billing: BillingSummary; insights: PortfolioInsights | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [paymentPending, setPaymentPending] = useState(false);
  const returnProcessed = useRef(false);

  const verifyReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const chapaOrderId = params.get("chapa_order_id");
    const paypalOrderId = params.get("paypal_order_id");
    const paypalSubscriptionId = params.get("paypal_subscription_id");
    const checkoutCancelled = params.get("checkout") === "cancelled";
    const returnId = chapaOrderId || paypalOrderId || paypalSubscriptionId;
    if (!returnId && checkoutCancelled) {
      setNotice("Checkout was cancelled. Your account has not been charged.");
      return;
    }
    if (!returnId || returnProcessed.current) return;
    returnProcessed.current = true;
    setBusy("verify");
    setError(undefined);
    setNotice(undefined);
    try {
      let result: ApiResult;
      if (chapaOrderId) {
        result = await requestJson("/api/billing/chapa/verify/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: chapaOrderId }),
        });
        if (!result.paid) {
          setPaymentPending(true);
          setNotice("Chapa has not confirmed this payment yet. You can check again shortly.");
          return;
        }
      } else if (paypalOrderId) {
        result = await requestJson("/api/billing/paypal/capture/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: paypalOrderId }),
        });
        if (!result.paid) {
          setPaymentPending(true);
          setNotice("PayPal is still processing this payment. You can check again shortly.");
          return;
        }
      } else {
        result = await requestJson("/api/billing/paypal/subscription/", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscriptionId: paypalSubscriptionId }),
        });
        if (!result.active) {
          setPaymentPending(true);
          setNotice("PayPal is still activating your subscription. You can check again shortly.");
          return;
        }
      }
      setPaymentPending(false);
      setNotice("Payment confirmed. Your plan is now active.");
      router.refresh();
      router.replace(withBase("/account/billing/"), { scroll: false });
    } catch (verificationError) {
      returnProcessed.current = false;
      setError(verificationError instanceof Error ? verificationError.message : "We couldn't confirm this payment yet.");
    } finally {
      setBusy(undefined);
    }
  }, [router]);

  useEffect(() => {
    void verifyReturn();
  }, [verifyReturn]);

  const checkout = async (provider: "chapa" | "paypal") => {
    setBusy(provider);
    setError(undefined);
    try {
      const result = await requestJson("/api/billing/checkout/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!result.checkoutUrl || !result.checkoutUrl.startsWith("https://")) throw new Error("The payment provider did not return a secure checkout link.");
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Couldn't start checkout.");
      setBusy(undefined);
    }
  };

  const subscribe = async () => {
    setBusy("subscription");
    setError(undefined);
    try {
      const result = await requestJson("/api/billing/paypal/subscription/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "paypal" }),
      });
      if (!result.checkoutUrl || !result.checkoutUrl.startsWith("https://")) throw new Error("PayPal did not return a secure approval link.");
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Couldn't start the subscription.");
      setBusy(undefined);
    }
  };

  const cancelSubscription = async () => {
    if (!billing.portfolioProSubscriptionId || !window.confirm("Cancel Portfolio Pro? You will keep access through the current paid period.")) return;
    setBusy("cancel");
    setError(undefined);
    try {
      await requestJson("/api/billing/paypal/subscription/", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscriptionId: billing.portfolioProSubscriptionId }),
      });
      setNotice("Your subscription is cancelled. Portfolio Pro remains available until the current paid period ends.");
      router.refresh();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Couldn't cancel your subscription.");
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-5 py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Plans & billing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Choose how you grow your CV</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">Your basic CV stays free. Pay only when you want premium designs or ongoing portfolio tools.</p>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm">{error}</p>}
      {paymentPending && (
        <button type="button" onClick={() => void verifyReturn()} disabled={!!busy} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-semibold disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Check payment again
        </button>
      )}

      <section aria-labelledby="current-plan" className="mb-6 rounded-2xl border border-line bg-card p-5 sm:p-6">
        <h2 id="current-plan" className="text-lg font-semibold">Your current access</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-bg p-4">
            <p className="flex items-center gap-2 font-semibold"><Check className="size-4 text-accent" /> Free CV</p>
            <p className="mt-2 text-sm leading-6 text-muted">One clean, ATS-friendly template, editing, and PDF export.</p>
          </div>
          <div className="rounded-xl bg-bg p-4">
            <p className="font-semibold">{billing.cvPassExpiresAt ? "CV Design Pass active" : "CV Design Pass"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {billing.cvPassExpiresAt
                ? `All CV templates unlocked through ${expiryLabel(billing.cvPassExpiresAt)}.`
                : "Unlock all 25+ CV templates for 90 days."}
            </p>
          </div>
          <div className="rounded-xl bg-bg p-4 sm:col-span-2">
            <p className="font-semibold">{billing.portfolioProActive ? "Portfolio Pro active" : "Portfolio Pro"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {billing.portfolioProActive
                ? `Advanced visitor AI is active${billing.portfolioProPeriodEnd ? ` through ${expiryLabel(billing.portfolioProPeriodEnd)}` : ""}.`
                : "Basic public CV and curated answers stay free. Pro adds advanced visitor AI and profile insights."}
            </p>
            {billing.portfolioProActive && billing.portfolioProStatus !== "cancelled" && (
              <button type="button" onClick={() => void cancelSubscription()} disabled={!!busy} className="mt-3 min-h-10 rounded-lg border border-line-strong px-3 text-sm font-semibold disabled:opacity-60">
                {busy === "cancel" ? "Cancelling…" : "Cancel subscription"}
              </button>
            )}
          </div>
        </div>
      </section>

      {billing.portfolioProActive && insights && (
        <section aria-labelledby="insights-heading" className="mb-6 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <h2 id="insights-heading" className="font-semibold">Profile insights · last 30 days</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Profile views", insights.pageViewsLast30Days],
              ["Visitor questions", insights.visitorQuestionsLast30Days],
              ["AI answers", insights.aiAnswersLast30Days],
            ].map(([label, count]) => (
              <div key={label} className="rounded-xl bg-bg p-4">
                <p className="text-2xl font-semibold">{count}</p>
                <p className="mt-1 text-sm text-muted">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">Counts are aggregated across your published CVs. Visitor data is not shown here.</p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="pass-heading" className="flex flex-col rounded-2xl border border-line bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent"><CreditCard className="size-5" /></span>
            <div>
              <h2 id="pass-heading" className="font-semibold">90-day CV Design Pass</h2>
              <p className="text-sm text-muted">One payment · no renewal</p>
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold">ETB 799 <span className="text-sm font-normal text-muted">or USD 6</span></p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><Check className="size-4 shrink-0 text-accent" />All 25+ CV templates for 90 days</li>
            <li className="flex gap-2"><Check className="size-4 shrink-0 text-accent" />Your CV and basic PDF export remain available after the pass</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void checkout("chapa")} disabled={!!busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60">
              {busy === "chapa" ? <LoaderCircle className="size-4 animate-spin" /> : null} Pay with Chapa
            </button>
            <button type="button" onClick={() => void checkout("paypal")} disabled={!!busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong px-4 font-semibold disabled:opacity-60">
              {busy === "paypal" ? <LoaderCircle className="size-4 animate-spin" /> : null} Pay with PayPal
            </button>
          </div>
        </section>

        <section aria-labelledby="pro-heading" className="flex flex-col rounded-2xl border border-accent/40 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent"><Sparkles className="size-5" /></span>
            <div>
              <h2 id="pro-heading" className="font-semibold">Portfolio Pro</h2>
              <p className="text-sm text-muted">Monthly · cancel any time</p>
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold">USD 4.99 <span className="text-sm font-normal text-muted">/ month</span></p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><Check className="size-4 shrink-0 text-accent" />Advanced visitor AI on your portfolio</li>
            <li className="flex gap-2"><Check className="size-4 shrink-0 text-accent" />Aggregated profile views and visitor-question insights</li>
            <li className="flex gap-2"><Check className="size-4 shrink-0 text-accent" />Your basic public CV stays available if you cancel</li>
          </ul>
          {billing.portfolioProActive ? (
            <p className="mt-5 flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"><Check className="size-4" />Subscription active</p>
          ) : (
            <button type="button" onClick={() => void subscribe()} disabled={!!busy} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60">
              {busy === "subscription" ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Subscribe with PayPal <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs leading-5 text-muted">
        Payments are processed securely by Chapa or PayPal. Honger CV does not store card or mobile-money credentials.
      </p>
      <Link href="/account/" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4">
        Return to your CVs <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </main>
  );
}
