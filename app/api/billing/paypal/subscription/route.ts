import { activateSubscription, billingProducts, createPendingSubscription, markSubscriptionFailed, setSubscriptionReference, subscriptionForUser, updateSubscriptionStatus } from "@/server/billing";
import { customerSession } from "@/server/admin-session";
import { bad, forbidden, json, limited, readJson, sameOrigin } from "@/server/http";
import { appUrl, paypalConfig, paypalRequest } from "@/server/payment-providers";

type PaypalLink = { rel?: string; href?: string };

function paypalPeriodEnd(body: Record<string, unknown>): Date | null {
  const billingInfo = body.billing_info;
  if (!billingInfo || typeof billingInfo !== "object") return null;
  const end = (billingInfo as { next_billing_time?: unknown }).next_billing_time;
  if (typeof end !== "string") return null;
  const date = new Date(end);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in before subscribing to Portfolio Pro.", 401);
  if (limited(`billing:subscription:${session.userId}`, 3, 60_000)) return bad("Too many subscription attempts. Try again in a minute.", 429);

  const body = await readJson(req, 1_000);
  if (body?.provider !== "paypal") return bad("Portfolio Pro subscriptions are currently available through PayPal.");
  const config = paypalConfig();
  const planId = process.env.PAYPAL_PORTFOLIO_PRO_PLAN_ID?.trim();
  if (!config || !planId) return bad("PayPal Portfolio Pro is not configured yet.", 503);

  let localId: string | undefined;
  try {
    const plan = await paypalRequest(`/v1/billing/plans/${encodeURIComponent(planId)}`);
    const cycles = Array.isArray(plan.billing_cycles) ? plan.billing_cycles as Record<string, unknown>[] : [];
    const monthlyPrice = cycles.some((cycle) => {
      const frequency = cycle.frequency as { interval_unit?: unknown; interval_count?: unknown } | undefined;
      const pricing = cycle.pricing_scheme as { fixed_price?: { currency_code?: unknown; value?: unknown } } | undefined;
      const tenureType = cycle.tenure_type;
      const totalCycles = cycle.total_cycles;
      return frequency?.interval_unit === "MONTH" &&
        frequency.interval_count === 1 &&
        tenureType === "REGULAR" &&
        totalCycles === 0 &&
        pricing?.fixed_price?.currency_code === "USD" &&
        Number(pricing.fixed_price.value) === billingProducts.portfolio_pro.prices.paypal.amount;
    });
    if (plan.status !== "ACTIVE" || !monthlyPrice) return bad("The PayPal Portfolio Pro plan must be active and priced at USD 4.99 monthly.", 503);

    localId = await createPendingSubscription(session.userId, planId);
    const response = await paypalRequest("/v1/billing/subscriptions", {
      method: "POST",
      headers: { "PayPal-Request-Id": localId },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: localId,
        application_context: {
          brand_name: "Honger CV",
          user_action: "SUBSCRIBE_NOW",
          return_url: appUrl(`/account/billing/?paypal_subscription_id=${encodeURIComponent(localId)}`),
          cancel_url: appUrl("/account/billing/?checkout=cancelled"),
        },
      }),
    });
    const approvalUrl = Array.isArray(response.links)
      ? (response.links as PaypalLink[]).find((link) => link.rel === "approve")?.href
      : undefined;
    if (typeof response.id !== "string" || typeof approvalUrl !== "string" || !approvalUrl.startsWith("https://")) {
      throw new Error("PayPal did not return a secure subscription approval link.");
    }
    await setSubscriptionReference(localId, response.id);
    return json({ ok: true, checkoutUrl: approvalUrl });
  } catch (error) {
    if (localId) await markSubscriptionFailed(localId);
    console.error("[billing] Could not start PayPal Portfolio Pro subscription:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message.includes("already active or awaiting approval")) return bad(error.message, 409);
    return bad(error instanceof Error ? error.message : "Couldn't start the subscription. Please try again.", 502);
  }
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to verify your subscription.", 401);
  if (limited(`billing:paypal-subscription-check:${session.userId}`, 10, 60_000)) return bad("Too many subscription checks. Try again shortly.", 429);
  const body = await readJson(req, 1_000);
  const localId = typeof body?.subscriptionId === "string" && /^[0-9a-f-]{36}$/i.test(body.subscriptionId) ? body.subscriptionId : null;
  if (!localId) return bad("The subscription reference is missing.");

  try {
    const local = await subscriptionForUser(localId, session.userId);
    if (!local || !local.providerSubscriptionId) return bad("Subscription not found.", 404);
    if (local.status === "active") return json({ ok: true, active: true });
    if (local.status !== "pending") return bad("This subscription is no longer pending.", 409);

    const response = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(local.providerSubscriptionId)}`);
    if (
      response.custom_id !== local.id ||
      response.plan_id !== local.providerPlanId ||
      response.plan_id !== process.env.PAYPAL_PORTFOLIO_PRO_PLAN_ID?.trim()
    ) {
      return bad("PayPal subscription details do not match this account.", 409);
    }
    if (response.status !== "ACTIVE") return json({ ok: true, active: false, status: response.status ?? "PENDING" });
    await activateSubscription(local.id, local.providerSubscriptionId, local.providerPlanId, paypalPeriodEnd(response));
    return json({ ok: true, active: true });
  } catch (error) {
    console.error("[billing] PayPal subscription verification failed:", error instanceof Error ? error.message : error);
    return bad("We could not confirm the subscription yet. Please refresh again.", 502);
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to cancel your subscription.", 401);
  if (limited(`billing:paypal-subscription-cancel:${session.userId}`, 3, 60_000)) return bad("Too many cancellation requests. Try again shortly.", 429);
  const body = await readJson(req, 1_000);
  const localId = typeof body?.subscriptionId === "string" && /^[0-9a-f-]{36}$/i.test(body.subscriptionId) ? body.subscriptionId : null;
  if (!localId) return bad("The subscription reference is missing.");

  try {
    const local = await subscriptionForUser(localId, session.userId);
    if (!local || !local.providerSubscriptionId) return bad("Subscription not found.", 404);
    if (local.status === "cancelled") return json({ ok: true, cancelled: true });
    if (local.status !== "active") return bad("Only an active subscription can be cancelled.", 409);
    await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(local.providerSubscriptionId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "Cancelled by the Honger CV customer." }),
    });
    await updateSubscriptionStatus(local.providerSubscriptionId, "cancelled", local.currentPeriodEnd);
    return json({ ok: true, cancelled: true });
  } catch (error) {
    console.error("[billing] PayPal subscription cancellation failed:", error instanceof Error ? error.message : error);
    return bad("We could not cancel the subscription. Please try again.", 502);
  }
}
