"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Flame,
  Globe,
  LoaderCircle,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { BillingSummary, PortfolioInsights } from "@/server/billing";
import { cn, withBase } from "@/lib/utils";
import {
  AmexBadge,
  CbBadge,
  ChapaLogo,
  MastercardBadge,
  PaymentBadgesRow,
  PaypalLogo,
  StripeLogo,
  VisaBadge,
} from "@/components/billing/payment-icons";

type ApiResult = {
  ok?: boolean;
  checkoutUrl?: string;
  paid?: boolean;
  active?: boolean;
  cancelled?: boolean;
  error?: string;
};

async function requestJson(url: string, init: RequestInit): Promise<ApiResult> {
  const response = await fetch(withBase(url), init);
  const result = (await response.json()) as ApiResult;
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

function expiryLabel(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function BillingSettings({
  billing,
  insights,
}: {
  billing: BillingSummary;
  insights: PortfolioInsights | null;
}) {
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
    const stripeSessionId = params.get("stripe_session_id");
    const stripeOrderId = params.get("stripe_order_id");
    const checkoutCancelled = params.get("checkout") === "cancelled";
    const returnId =
      chapaOrderId || paypalOrderId || paypalSubscriptionId || stripeSessionId || stripeOrderId;

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
      if (stripeSessionId || stripeOrderId) {
        result = await requestJson("/api/billing/stripe/verify/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: stripeSessionId, orderId: stripeOrderId }),
        });
        if (!result.paid) {
          returnProcessed.current = false;
          setPaymentPending(true);
          setNotice("Stripe is still processing your payment. You can check again shortly.");
          return;
        }
      } else if (chapaOrderId) {
        result = await requestJson("/api/billing/chapa/verify/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: chapaOrderId }),
        });
        if (!result.paid) {
          returnProcessed.current = false;
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
          returnProcessed.current = false;
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
          returnProcessed.current = false;
          setPaymentPending(true);
          setNotice("PayPal is still activating your subscription. You can check again shortly.");
          return;
        }
      }
      setPaymentPending(false);
      setNotice("Payment confirmed! Your plan features are now active.");
      router.refresh();
      router.replace(withBase("/account/billing/"), { scroll: false });
    } catch (verificationError) {
      returnProcessed.current = false;
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "We couldn't confirm this payment yet."
      );
    } finally {
      setBusy(undefined);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void verifyReturn(), 0);
    return () => window.clearTimeout(timer);
  }, [verifyReturn]);

  const checkout = async (provider: "chapa" | "paypal" | "stripe") => {
    setBusy(provider);
    setError(undefined);
    try {
      const result = await requestJson("/api/billing/checkout/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!result.checkoutUrl || !result.checkoutUrl.startsWith("https://"))
        throw new Error("The payment provider did not return a secure checkout link.");
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
      if (!result.checkoutUrl || !result.checkoutUrl.startsWith("https://"))
        throw new Error("PayPal did not return a secure approval link.");
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Couldn't start subscription.");
      setBusy(undefined);
    }
  };

  const cancelSubscription = async () => {
    if (
      !billing.portfolioProSubscriptionId ||
      !window.confirm(
        "Cancel Portfolio Pro? You will retain all Pro features through the end of your current billing period."
      )
    )
      return;
    setBusy("cancel");
    setError(undefined);
    try {
      await requestJson("/api/billing/paypal/subscription/", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscriptionId: billing.portfolioProSubscriptionId }),
      });
      setNotice(
        "Your subscription has been cancelled. Pro features will remain available until your current billing period ends."
      );
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : "Couldn't cancel your subscription."
      );
    } finally {
      setBusy(undefined);
    }
  };

  const hasPass = billing.cvPassLifetime || Boolean(billing.cvPassExpiresAt);
  const isPro = billing.portfolioProActive;

  return (
    <main className="min-h-dvh bg-bg text-fg">
      {/* Top Breadcrumb & Navigation */}
      <div className="border-b border-line bg-bg/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/account/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-fg transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Current Active Plan Pill */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Account Status:</span>
            {hasPass ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-3 text-emerald-500" />
                {billing.cvPassLifetime ? "Lifetime Pass Active" : "Pass Active"}
              </span>
            ) : isPro ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent border border-accent/20">
                <Sparkles className="size-3" />
                Portfolio Pro Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                Free Plan · 1 CV Included
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-8">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent shadow-xs">
            <Zap className="size-3.5" />
            <span>Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
            Invest in Your Career Presence
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Unlock all 25+ professional templates and AI document extraction for life, or superpower your public CV with live visitor AI and recruiter analytics.
          </p>
        </div>

        {/* Notifications & Status Alerts */}
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-in fade-in"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              {notice}
            </span>
            <button
              type="button"
              onClick={() => setNotice(undefined)}
              className="font-bold text-muted hover:text-fg ml-3"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(undefined)}
              className="font-bold text-muted hover:text-fg ml-3"
            >
              ×
            </button>
          </div>
        )}

        {paymentPending && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
            <span>Payment verification is in progress...</span>
            <button
              type="button"
              onClick={() => void verifyReturn()}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-bg px-3 py-1 font-semibold text-fg hover:border-accent disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Check Status
            </button>
          </div>
        )}

        {/* Pro Insights Banner (Visible when Portfolio Pro is Active) */}
        {isPro && insights && (
          <section aria-labelledby="insights-heading" className="rounded-3xl border border-line bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="insights-heading" className="text-sm font-semibold text-fg flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" />
                  Portfolio Pro Analytics (Last 30 Days)
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Real-time visibility into how recruiters and visitors engage with your public CV.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Tracking Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-line bg-bg/50 p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted">Total Profile Views</span>
                <p className="text-2xl font-bold text-fg">{insights.pageViewsLast30Days}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Aggregated across published links</span>
              </div>
              <div className="rounded-2xl border border-line bg-bg/50 p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted">Recruiter Questions Asked</span>
                <p className="text-2xl font-bold text-fg">{insights.visitorQuestionsLast30Days}</p>
                <span className="text-[10px] text-accent font-medium">Interactive queries answered</span>
              </div>
              <div className="rounded-2xl border border-line bg-bg/50 p-4 space-y-1">
                <span className="text-[11px] font-medium text-muted">AI Grounded Responses</span>
                <p className="text-2xl font-bold text-fg">{insights.aiAnswersLast30Days}</p>
                <span className="text-[10px] text-muted">Grounded in your CV facts</span>
              </div>
            </div>
          </section>
        )}

        {/* Core Pricing Grid (2 Side-by-Side Premium Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* PLAN 1: LIFETIME CV DESIGN PASS */}
          <div
            className={cn(
              "relative flex flex-col justify-between rounded-3xl border p-6 sm:p-8 transition-all overflow-hidden",
              hasPass
                ? "border-emerald-500/40 bg-card shadow-sm"
                : "border-accent/40 bg-card shadow-lg ring-1 ring-accent/20"
            )}
          >
            {/* Top Badge */}
            <div className="absolute top-4 right-4 z-10">
              {hasPass ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="size-3.5" /> ACTIVE ON ACCOUNT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent text-on-accent px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-sm">
                  <Flame className="size-3.5 fill-current" /> Most Popular
                </span>
              )}
            </div>

            <div className="space-y-6">
              {/* Visual Card Image Banner */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-line bg-bg/40 shadow-inner">
                <Image
                  src="/images/billing-pass-badge.jpg"
                  alt="Lifetime CV Design Pass"
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                  <div>
                    <span className="rounded bg-accent/90 px-2 py-0.5 text-[10px] font-bold text-on-accent uppercase tracking-wider">
                      Lifetime Deal
                    </span>
                    <h3 className="text-white text-base font-bold mt-1">CV Design & AI Extraction Pass</h3>
                  </div>
                </div>
              </div>

              {/* Price & Tagline */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                    $1 <span className="text-lg font-medium text-muted">USD</span>
                  </span>
                  <span className="text-sm font-semibold text-muted">or 100 ETB</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-accent">
                  One-time payment • Lifetime access • Zero monthly renewal
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-line/60 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  What&apos;s Included for Life:
                </span>
                <ul className="space-y-2 text-fg">
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>Instant AI Document Parser</strong>: Upload resumes in PDF, DOCX, or TXT with automatic semantic extraction.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>All 25+ Premium CV Templates</strong>: Full access to Modern, Executive, Minimal, Compact, and Creative themes.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>Unlimited CV Versions</strong>: Create and customize separate tailored CVs for different roles and companies.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>AI Sound & Voice Access</strong>: Unlock sound playback and speech synthesis on your public profiles.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>High-Resolution Vector PDF Export</strong>: Ready for ATS scanners and recruiter email submissions.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Payment Actions */}
            <div className="mt-8 pt-4 border-t border-line/60 space-y-3">
              {hasPass ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-4" />
                  <span>You own the Lifetime CV Pass</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void checkout("stripe")}
                    disabled={!!busy}
                    className="w-full flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3 text-xs font-bold text-on-accent shadow-sm transition hover:brightness-95 disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2.5">
                      {busy === "stripe" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <StripeLogo className="size-4.5 rounded shadow-xs" />
                      )}
                      <span>Pay with Card via Stripe ($1 USD)</span>
                    </span>
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      <VisaBadge className="h-4.5 w-7.5 px-0.5 rounded-xs" />
                      <MastercardBadge className="h-4.5 w-7.5 px-0.5 rounded-xs" />
                      <AmexBadge className="h-4.5 w-7.5 px-0.5 rounded-xs" />
                    </div>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void checkout("chapa")}
                      disabled={!!busy}
                      className="flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-bg px-3 py-2.5 text-xs font-semibold text-fg hover:border-accent transition-colors disabled:opacity-60"
                    >
                      {busy === "chapa" ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <ChapaLogo className="size-4" />
                      )}
                      <span>Pay with Chapa (100 ETB)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void checkout("paypal")}
                      disabled={!!busy}
                      className="flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-bg px-3 py-2.5 text-xs font-semibold text-fg hover:border-accent transition-colors disabled:opacity-60"
                    >
                      {busy === "paypal" ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <PaypalLogo className="size-4" />
                      )}
                      <span>Pay with PayPal ($1)</span>
                    </button>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/40">
                    <PaymentBadgesRow label="Payments:" />
                    <span className="text-[11px] font-medium text-muted">Instant activation</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PLAN 2: PORTFOLIO PRO */}
          <div
            className={cn(
              "relative flex flex-col justify-between rounded-3xl border p-6 sm:p-8 transition-all overflow-hidden",
              isPro
                ? "border-accent bg-card shadow-md ring-1 ring-accent"
                : "border-line bg-card/60 shadow-sm hover:border-line-strong"
            )}
          >
            {/* Top Badge */}
            <div className="absolute top-4 right-4 z-10">
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent text-on-accent px-3 py-1 text-[11px] font-bold shadow-xs">
                  <Sparkles className="size-3.5" /> SUBSCRIBED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide border border-accent/20">
                  <Sparkles className="size-3.5" /> Recruiter AI & Analytics
                </span>
              )}
            </div>

            <div className="space-y-6">
              {/* Visual Card Image Banner */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-line bg-bg/40 shadow-inner">
                <Image
                  src="/images/billing-pro-badge.jpg"
                  alt="Portfolio Pro AI & Insights"
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                  <div>
                    <span className="rounded bg-violet-600/90 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      AI Powered
                    </span>
                    <h3 className="text-white text-base font-bold mt-1">Portfolio Pro AI & Insights</h3>
                  </div>
                </div>
              </div>

              {/* Price & Tagline */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                    $4.99 <span className="text-lg font-medium text-muted">USD</span>
                  </span>
                  <span className="text-sm font-semibold text-muted">/ month</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-accent">
                  Monthly subscription • Cancel anytime in 1 click
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-line/60 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Everything in Free, plus:
                </span>
                <ul className="space-y-2 text-fg">
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>Advanced 24/7 Visitor AI Assistant</strong>: Gemini 2.5 answers recruiter queries grounded in your verified facts.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>Interactive Voice Persona</strong>: Visitors can speak with your AI assistant using conversational voice synthesis.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>30-Day Recruiter Engagement Insights</strong>: Track profile views, exact questions asked, and answer coverage.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>Priority Semantic Vector Cache</strong>: Sub-150ms instant response times via pgvector database embeddings.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-accent mt-0.5" />
                    <span>
                      <strong>No Risk Guarantee</strong>: If cancelled, your basic public CV and PDF downloads remain active forever.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Subscription Actions */}
            <div className="mt-8 pt-4 border-t border-line/60 space-y-2.5">
              {isPro ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-accent-soft/20 p-3 text-xs text-accent">
                    <span className="font-semibold">Subscribed with PayPal</span>
                    {billing.portfolioProPeriodEnd && (
                      <span className="text-[11px] text-muted">
                        Renews {expiryLabel(billing.portfolioProPeriodEnd)}
                      </span>
                    )}
                  </div>
                  {billing.portfolioProStatus !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => void cancelSubscription()}
                      disabled={!!busy}
                      className="w-full rounded-xl border border-line-strong py-2 text-xs font-semibold text-muted hover:text-red-500 hover:border-red-500/40 transition-colors disabled:opacity-60"
                    >
                      {busy === "cancel" ? "Cancelling..." : "Cancel Subscription"}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void subscribe()}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-bold text-on-accent shadow-sm transition hover:brightness-95 disabled:opacity-60"
                >
                  {busy === "subscription" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <PaypalLogo className="size-4" />
                  )}
                  <span>Subscribe to Portfolio Pro ($4.99/mo)</span>
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trust, Security & Guarantee Footer */}
        <div className="rounded-2xl border border-line bg-card/40 p-5 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4 text-xs text-muted">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <span className="flex items-center gap-1.5 font-medium text-fg">
              <Lock className="size-3.5 text-accent" /> 256-Bit SSL Encryption
            </span>
            <span className="flex items-center gap-1.5 font-medium text-fg">
              <ShieldCheck className="size-3.5 text-accent" /> Powered by Stripe, Chapa & PayPal
            </span>
            <span className="flex items-center gap-1.5 font-medium text-fg">
              <Globe className="size-3.5 text-accent" /> Instant Global Activation
            </span>
          </div>

          <p className="mt-2 sm:mt-0 text-[11px]">
            Honger CV does not store payment card credentials. All checkouts are processed directly via secure payment gateways.
          </p>
        </div>
      </div>
    </main>
  );
}
