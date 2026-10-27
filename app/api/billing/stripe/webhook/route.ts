import type Stripe from "stripe";
import { completeCvPassOrder, orderById, recordWebhookOnce } from "@/server/billing";
import { bad, json } from "@/server/http";
import { stripeClient, stripeSecret, stripeWebhookSecret } from "@/server/payment-providers";

export async function POST(req: Request) {
  if (!stripeSecret()) {
    return bad("Stripe is not configured.", 503);
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = stripeWebhookSecret();

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return bad("Could not read webhook payload.", 400);
  }

  let event: Stripe.Event;
  const stripe = stripeClient();

  if (webhookSecret) {
    if (!signature) {
      return bad("Stripe signature header is missing.", 400);
    }
    try {
      event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
    } catch (err) {
      console.error("[billing] Stripe signature verification failed:", err instanceof Error ? err.message : err);
      return bad("Stripe signature verification failed.", 400);
    }
  } else {
    // If webhook secret is not yet configured in development, parse body safely
    if (process.env.NODE_ENV === "production") {
      return bad("STRIPE_WEBHOOK_SECRET must be configured in production.", 500);
    }
    try {
      event = JSON.parse(bodyText) as Stripe.Event;
    } catch {
      return bad("Invalid JSON payload.", 400);
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const orderId =
        checkoutSession.client_reference_id ||
        (typeof checkoutSession.metadata?.orderId === "string" ? checkoutSession.metadata.orderId : null);

      if (orderId && checkoutSession.payment_status === "paid") {
        const order = await orderById(orderId);
        if (order && order.provider === "stripe" && order.status === "pending") {
          const amount = (checkoutSession.amount_total ?? 0) / 100;
          const currency = (checkoutSession.currency ?? "usd").toUpperCase();
          await completeCvPassOrder(order.id, "stripe", amount, currency);
        }
      }
    }

    await recordWebhookOnce("stripe", event.id);
    return json({ received: true });
  } catch (error) {
    console.error("[billing] Stripe webhook handler failed:", error instanceof Error ? error.message : error);
    return bad("Webhook processing failed.", 500);
  }
}
