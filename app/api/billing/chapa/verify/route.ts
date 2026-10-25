import { completeCvPassOrder, orderForUser } from "@/server/billing";
import { customerSession } from "@/server/admin-session";
import { bad, forbidden, json, limited, readJson, sameOrigin } from "@/server/http";
import { chapaSecret, verifyChapaTransaction } from "@/server/payment-providers";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const session = await customerSession(req);
  if (!session) return bad("Sign in to verify your payment.", 401);
  if (limited(`billing:chapa-verify:${session.userId}`, 10, 60_000)) return bad("Too many verification attempts. Try again shortly.", 429);
  const body = await readJson(req, 1_000);
  const orderId = typeof body?.orderId === "string" && /^[0-9a-f-]{36}$/i.test(body.orderId) ? body.orderId : null;
  if (!orderId) return bad("The payment reference is missing.");
  if (!chapaSecret()) return bad("Chapa payments are not configured.", 503);

  try {
    const order = await orderForUser(orderId, session.userId);
    if (!order || order.provider !== "chapa") return bad("Payment order not found.", 404);
    if (order.status === "paid") return json({ ok: true, paid: true });
    if (order.status !== "pending") return bad("This payment is no longer pending.", 409);
    const verified = await verifyChapaTransaction(order.id);
    if (verified.status !== "success") return json({ ok: true, paid: false, status: verified.status });
    await completeCvPassOrder(order.id, "chapa", verified.amount, verified.currency);
    return json({ ok: true, paid: true });
  } catch (error) {
    console.error("[billing] Chapa payment verification failed:", error instanceof Error ? error.message : error);
    return bad("We could not confirm that payment yet. Please try refreshing again.", 502);
  }
}
