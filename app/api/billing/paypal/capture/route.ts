import { completeCvPassOrder, orderForUser } from "@/server/billing";
import { customerSession } from "@/server/admin-session";
import { bad, forbidden, json, readJson, sameOrigin } from "@/server/http";
import { paypalConfig, paypalRequest } from "@/server/payment-providers";

type PaypalCapture = { status?: string; amount?: { value?: string; currency_code?: string } };

function captureFrom(body: Record<string, unknown>): PaypalCapture | null {
  const units = body.purchase_units;
  if (!Array.isArray(units)) return null;
  const payments = (units[0] as { payments?: { captures?: unknown } } | undefined)?.payments;
  const captures = payments?.captures;
  return Array.isArray(captures) ? captures.find((item): item is PaypalCapture => !!item && typeof item === "object") ?? null : null;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to confirm your payment.", 401);
  const body = await readJson(req, 1_000);
  const orderId = typeof body?.orderId === "string" && /^[0-9a-f-]{36}$/i.test(body.orderId) ? body.orderId : null;
  if (!orderId) return bad("The payment reference is missing.");
  if (!paypalConfig()) return bad("PayPal payments are not configured.", 503);

  try {
    const order = await orderForUser(orderId, session.userId);
    if (!order || order.provider !== "paypal") return bad("Payment order not found.", 404);
    if (order.status === "paid") return json({ ok: true, paid: true });
    if (order.status !== "pending" || !order.providerReference) return bad("This payment is no longer pending.", 409);

    let capture: PaypalCapture | null = null;
    try {
      const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(order.providerReference)}/capture`, {
        method: "POST",
        headers: { "PayPal-Request-Id": `${order.id}-capture` },
        body: "{}",
      });
      capture = captureFrom(response);
    } catch (captureError) {
      const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(order.providerReference)}`);
      capture = captureFrom(response);
      if (!capture) throw captureError;
    }
    const amount = Number(capture?.amount?.value);
    const currency = capture?.amount?.currency_code?.toUpperCase();
    if (capture?.status !== "COMPLETED" || !Number.isFinite(amount) || !currency) {
      return json({ ok: true, paid: false, status: capture?.status ?? "pending" });
    }
    await completeCvPassOrder(order.id, "paypal", amount, currency);
    return json({ ok: true, paid: true });
  } catch (error) {
    console.error("[billing] PayPal payment capture failed:", error instanceof Error ? error.message : error);
    return bad("We could not confirm that payment yet. Please try refreshing again.", 502);
  }
}
