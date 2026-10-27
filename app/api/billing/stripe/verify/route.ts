import { completeCvPassOrder, orderForUser } from "@/server/billing";
import { customerSession } from "@/server/admin-session";
import { bad, forbidden, json, limited, readJson, sameOrigin } from "@/server/http";
import { stripeClient, stripeSecret } from "@/server/payment-providers";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to verify your payment.", 401);
  if (limited(`billing:stripe-verify:${session.userId}`, 10, 60_000)) {
    return bad("Too many verification attempts. Try again shortly.", 429);
  }

  const body = await readJson(req, 2_000);
  const orderId = typeof body?.orderId === "string" && /^[0-9a-f-]{36}$/i.test(body.orderId) ? body.orderId : null;
  const sessionId = typeof body?.sessionId === "string" && body.sessionId.startsWith("cs_") ? body.sessionId : null;

  if (!orderId && !sessionId) return bad("The payment reference is missing.");
  if (!stripeSecret()) return bad("Stripe payments are not configured.", 503);

  try {
    const order = orderId
      ? await orderForUser(orderId, session.userId)
      : null;

    if (!order || order.provider !== "stripe") {
      return bad("Payment order not found.", 404);
    }

    if (order.status === "paid") {
      return json({ ok: true, paid: true });
    }
    if (order.status !== "pending") {
      return bad("This payment is no longer pending.", 409);
    }

    const stripe = stripeClient();
    const effectiveSessionId = sessionId || order.providerReference;
    if (!effectiveSessionId) {
      return bad("Stripe checkout reference was not found for this order.", 400);
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(effectiveSessionId);
    if (stripeSession.payment_status !== "paid") {
      return json({ ok: true, paid: false, status: stripeSession.payment_status });
    }

    const amount = (stripeSession.amount_total ?? 0) / 100;
    const currency = (stripeSession.currency ?? "usd").toUpperCase();

    await completeCvPassOrder(order.id, "stripe", amount, currency);
    return json({ ok: true, paid: true });
  } catch (error) {
    console.error("[billing] Stripe payment verification failed:", error instanceof Error ? error.message : error);
    return bad("We could not confirm that payment yet. Please try refreshing again.", 502);
  }
}
