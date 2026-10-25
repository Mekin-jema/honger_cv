import { activateSubscription, recordWebhookOnce, updateSubscriptionStatus } from "@/server/billing";
import { bad, json, readJson } from "@/server/http";
import { paypalRequest, verifyPaypalWebhook } from "@/server/payment-providers";

type PaypalEvent = {
  id?: unknown;
  event_type?: unknown;
  resource?: {
    id?: unknown;
    custom_id?: unknown;
    plan_id?: unknown;
  };
};

function currentPeriodEnd(body: Record<string, unknown>): Date | null {
  const billingInfo = body.billing_info;
  if (!billingInfo || typeof billingInfo !== "object") return null;
  const nextBillingTime = (billingInfo as { next_billing_time?: unknown }).next_billing_time;
  if (typeof nextBillingTime !== "string") return null;
  const date = new Date(nextBillingTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  const body = await readJson(req, 64_000);
  const event = body as PaypalEvent | null;
  if (!event) return bad("Invalid PayPal webhook payload.", 400);
  if (typeof event.id !== "string" || typeof event.event_type !== "string" || !event.resource) {
    return bad("Incomplete PayPal webhook payload.", 400);
  }

  try {
    if (!(await verifyPaypalWebhook(req, event as Record<string, unknown>))) {
      return bad("PayPal webhook signature is invalid.", 400);
    }
    const resource = event.resource;
    const subscriptionId = typeof resource.id === "string" ? resource.id : null;
    if (!subscriptionId) return bad("PayPal subscription reference is missing.", 400);

    const statusEvents: Record<string, "cancelled" | "suspended" | "expired"> = {
      "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
      "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
      "BILLING.SUBSCRIPTION.EXPIRED": "expired",
    };
    const terminalStatus = statusEvents[event.event_type];
    if (terminalStatus) {
      const current = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
      if (current.id !== subscriptionId) return bad("PayPal subscription could not be verified.", 400);
      await updateSubscriptionStatus(subscriptionId, terminalStatus, currentPeriodEnd(current));
    } else if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED" || event.event_type === "BILLING.SUBSCRIPTION.UPDATED") {
      const current = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
      const planId = process.env.PAYPAL_PORTFOLIO_PRO_PLAN_ID?.trim();
      if (
        current.id !== subscriptionId ||
        current.status !== "ACTIVE" ||
        typeof planId !== "string" ||
        current.plan_id !== planId ||
        typeof current.custom_id !== "string"
      ) {
        return bad("PayPal subscription details could not be verified.", 400);
      }
      await activateSubscription(current.custom_id, subscriptionId, planId, currentPeriodEnd(current));
    } else {
      return json({ ok: true, ignored: true });
    }
    await recordWebhookOnce("paypal", event.id);
    return json({ ok: true });
  } catch (error) {
    console.error("[billing] PayPal webhook processing failed:", error instanceof Error ? error.message : error);
    return bad("PayPal webhook could not be processed.", 500);
  }
}
