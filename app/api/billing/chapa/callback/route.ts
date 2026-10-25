import { completeCvPassOrder, orderById } from "@/server/billing";
import { bad, clientKey, json, limited, readJson } from "@/server/http";
import { chapaSecret, verifyChapaTransaction } from "@/server/payment-providers";

async function verify(req: Request, txRef: string | null) {
  if (!txRef || !/^[0-9a-f-]{36}$/i.test(txRef)) return bad("Invalid Chapa transaction reference.", 400);
  if (limited(`billing:chapa-callback:${clientKey(req)}`, 30, 60_000)) return bad("Too many callback attempts.", 429);
  if (!chapaSecret()) return bad("Chapa payments are not configured.", 503);

  try {
    const order = await orderById(txRef);
    if (!order || order.provider !== "chapa") return bad("Payment order not found.", 404);
    const verified = await verifyChapaTransaction(txRef);
    if (verified.status !== "success") return json({ ok: true, paid: false, status: verified.status });
    await completeCvPassOrder(order.id, "chapa", verified.amount, verified.currency);
    return json({ ok: true, paid: true });
  } catch (error) {
    console.error("[billing] Chapa callback verification failed:", error instanceof Error ? error.message : error);
    return bad("Chapa payment could not be verified. Please refresh your billing page to try again.", 502);
  }
}

export async function GET(req: Request) {
  return verify(req, new URL(req.url).searchParams.get("tx_ref"));
}

export async function POST(req: Request) {
  const body = await readJson(req, 2_000);
  const txRef = typeof body?.tx_ref === "string" ? body.tx_ref : typeof body?.trx_ref === "string" ? body.trx_ref : null;
  return verify(req, txRef);
}
