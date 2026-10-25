import "server-only";
import { basePath, siteUrl } from "@/lib/site";

type JsonRecord = Record<string, unknown>;

async function responseJson(response: Response): Promise<JsonRecord> {
  if (response.status === 204) return {};
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Payment provider returned an unreadable response (${response.status}).`);
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : `Payment provider request failed (${response.status}).`;
    throw new Error(message);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Payment provider returned an invalid response.");
  return body as JsonRecord;
}

export function appUrl(path: string): string {
  return new URL(`${basePath}${path}`, siteUrl).toString();
}

export function chapaSecret(): string {
  return process.env.CHAPA_SECRET_KEY?.trim() ?? "";
}

type PayPalEnvironment = "sandbox" | "live";

export function paypalConfig(): { clientId: string; clientSecret: string; environment: PayPalEnvironment; baseUrl: string } | null {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const configuredEnvironment = process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() || "sandbox";
  if (configuredEnvironment !== "sandbox" && configuredEnvironment !== "live") return null;
  const environment: PayPalEnvironment = configuredEnvironment;
  return {
    clientId,
    clientSecret,
    environment,
    baseUrl: environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

export async function paypalAccessToken(): Promise<{ baseUrl: string; token: string }> {
  const config = paypalConfig();
  if (!config) throw new Error("PayPal is not configured.");
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const body = await responseJson(response);
  if (typeof body.access_token !== "string") throw new Error("PayPal did not return an access token.");
  return { baseUrl: config.baseUrl, token: body.access_token };
}

export async function paypalRequest(path: string, init: RequestInit = {}): Promise<JsonRecord> {
  const { baseUrl, token } = await paypalAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  return responseJson(response);
}

export async function verifyPaypalWebhook(req: Request, event: JsonRecord): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  const config = paypalConfig();
  if (!webhookId || !config) return false;
  const headers = req.headers;
  const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  return verification.verification_status === "SUCCESS";
}

export async function verifyChapaTransaction(txRef: string): Promise<{ status: string; amount: number; currency: string }> {
  const secret = chapaSecret();
  if (!secret) throw new Error("Chapa is not configured.");
  const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
    headers: { authorization: `Bearer ${secret}`, accept: "application/json" },
    cache: "no-store",
  });
  const body = await responseJson(response);
  const data = body.data && typeof body.data === "object" ? body.data as JsonRecord : {};
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || typeof data.currency !== "string" || typeof data.status !== "string") {
    throw new Error("Chapa returned incomplete transaction verification data.");
  }
  return { status: data.status.toLowerCase(), amount, currency: data.currency.toUpperCase() };
}
