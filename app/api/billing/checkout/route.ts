import { billingProducts, createCvPassOrder, markOrderFailed, setOrderProviderReference } from "@/server/billing";
import { customerSession } from "@/server/admin-session";
import { bad, forbidden, json, limited, readJson, sameOrigin } from "@/server/http";
import { appUrl, chapaSecret, paypalConfig, paypalRequest } from "@/server/payment-providers";

type PaypalLink = { rel?: string; href?: string };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in before purchasing a CV Design Pass.", 401);
  if (limited(`billing:checkout:${session.userId}`, 5, 60_000)) return bad("Too many checkout attempts. Try again in a minute.", 429);

  const body = await readJson(req, 1_000);
  const provider = body?.provider;
  if (provider !== "chapa" && provider !== "paypal") return bad("Choose Chapa or PayPal.");
  if (provider === "chapa" && !chapaSecret()) return bad("Chapa payments are not configured yet.", 503);
  if (provider === "paypal" && !paypalConfig()) return bad("PayPal payments are not configured yet.", 503);

  const order = await createCvPassOrder(session.userId, provider);
  try {
    if (provider === "chapa") {
      const nameParts = session.name.trim().split(/\s+/);
      const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
        method: "POST",
        headers: {
          authorization: `Bearer ${chapaSecret()}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          amount: order.amount.toFixed(2),
          currency: order.currency,
          email: session.email,
          first_name: nameParts[0] || "CV",
          last_name: nameParts.slice(1).join(" ") || "Customer",
          tx_ref: order.id,
          callback_url: appUrl("/api/billing/chapa/callback/"),
          return_url: appUrl(`/account/billing/?chapa_order_id=${encodeURIComponent(order.id)}`),
          customization: {
            title: "Honger CV",
            description: billingProducts.cv_pass.description,
          },
        }),
        cache: "no-store",
      });
      const responseBody: unknown = await response.json().catch(() => null);
      const checkoutUrl = responseBody && typeof responseBody === "object" && "data" in responseBody
        ? (responseBody.data as { checkout_url?: unknown } | null)?.checkout_url
        : undefined;
      if (!response.ok || typeof checkoutUrl !== "string" || !/^https:\/\/checkout\.chapa\.co\//.test(checkoutUrl)) {
        throw new Error("Chapa could not create a secure checkout session.");
      }
      await setOrderProviderReference(order.id, order.id, checkoutUrl);
      return json({ ok: true, checkoutUrl });
    }

    const response = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": order.id },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: order.id,
          custom_id: order.id,
          description: billingProducts.cv_pass.title,
          amount: { currency_code: order.currency, value: order.amount.toFixed(2) },
        }],
        application_context: {
          brand_name: "Honger CV",
          user_action: "PAY_NOW",
          return_url: appUrl(`/account/billing/?paypal_order_id=${encodeURIComponent(order.id)}`),
          cancel_url: appUrl("/account/billing/?checkout=cancelled"),
        },
      }),
    });
    const approvalUrl = Array.isArray(response.links)
      ? (response.links as PaypalLink[]).find((link) => link.rel === "approve")?.href
      : undefined;
    if (typeof response.id !== "string" || typeof approvalUrl !== "string" || !approvalUrl.startsWith("https://")) {
      throw new Error("PayPal did not return a secure approval link.");
    }
    await setOrderProviderReference(order.id, response.id, approvalUrl);
    return json({ ok: true, checkoutUrl: approvalUrl });
  } catch (error) {
    await markOrderFailed(order.id);
    console.error(`[billing] Could not start ${provider} CV pass checkout:`, error instanceof Error ? error.message : error);
    return bad(error instanceof Error ? error.message : "Couldn't start checkout. Please try again.", 502);
  }
}
