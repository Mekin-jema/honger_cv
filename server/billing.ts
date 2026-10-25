import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";

export type BillingProvider = "chapa" | "paypal";
export type BillingProduct = "cv_pass" | "portfolio_pro";

export const CV_PASS_TEMPLATE = "modern";

export const billingProducts = {
  cv_pass: {
    title: "Lifetime CV Design Pass",
    description: "Unlock every CV template and create additional CVs for life.",
    prices: {
      chapa: { currency: "ETB", amount: 100 },
      paypal: { currency: "USD", amount: 1 },
    },
  },
  portfolio_pro: {
    title: "Portfolio Pro",
    description: "Monthly access to advanced visitor AI and profile insights.",
    prices: {
      paypal: { currency: "USD", amount: 4.99 },
    },
  },
} as const;

export type BillingSummary = {
  cvPassExpiresAt: string | null;
  cvPassLifetime: boolean;
  portfolioProActive: boolean;
  portfolioProStatus: "active" | "cancelled" | "suspended" | "expired" | "pending" | null;
  portfolioProPeriodEnd: string | null;
  portfolioProSubscriptionId: string | null;
};

export type PortfolioInsights = {
  pageViewsLast30Days: number;
  visitorQuestionsLast30Days: number;
  aiAnswersLast30Days: number;
};

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export async function getBillingSummary(userId: string): Promise<BillingSummary> {
  const { rows } = await query<{
    cv_pass_expires_at: Date | null;
    cv_pass_lifetime: boolean;
    portfolio_pro_subscription_id: string | null;
    portfolio_pro_status: BillingSummary["portfolioProStatus"];
    portfolio_pro_period_end: Date | null;
  }>(
    `SELECT
       (SELECT bool_or(pass_lifetime) FROM billing_orders
         WHERE user_id = $1 AND product = 'cv_pass' AND status = 'paid') AS cv_pass_lifetime,
       (SELECT max(pass_expires_at) FROM billing_orders
         WHERE user_id = $1 AND product = 'cv_pass' AND status = 'paid' AND NOT pass_lifetime AND pass_expires_at > now()) AS cv_pass_expires_at,
       (SELECT id::text FROM billing_subscriptions
         WHERE user_id = $1 AND provider = 'paypal' AND status IN ('active', 'cancelled', 'suspended', 'expired', 'pending')
         ORDER BY updated_at DESC LIMIT 1) AS portfolio_pro_subscription_id,
       (SELECT status FROM billing_subscriptions
         WHERE user_id = $1 AND provider = 'paypal' AND status IN ('active', 'cancelled', 'suspended', 'expired', 'pending')
         ORDER BY updated_at DESC LIMIT 1) AS portfolio_pro_status,
       (SELECT current_period_end FROM billing_subscriptions
         WHERE user_id = $1 AND provider = 'paypal' AND status IN ('active', 'cancelled', 'suspended', 'expired', 'pending')
         ORDER BY updated_at DESC LIMIT 1) AS portfolio_pro_period_end`,
    [userId],
  );
  const row = rows[0];
  const cvPassLifetime = row?.cv_pass_lifetime === true;
  const cvPassExpiresAt = cvPassLifetime ? null : toIso(row?.cv_pass_expires_at ?? null);
  const periodEnd = toIso(row?.portfolio_pro_period_end ?? null);
  return {
    cvPassExpiresAt,
    cvPassLifetime,
    portfolioProActive:
      row?.portfolio_pro_status === "active" ||
      (row?.portfolio_pro_status === "cancelled" && !!periodEnd && new Date(periodEnd).getTime() > Date.now()),
    portfolioProStatus: row?.portfolio_pro_status ?? null,
    portfolioProPeriodEnd: periodEnd,
    portfolioProSubscriptionId: row?.portfolio_pro_subscription_id ?? null,
  };
}

export async function hasCvPass(userId: string): Promise<boolean> {
  const { rows } = await query<{ active: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM billing_orders
        WHERE user_id = $1 AND product = 'cv_pass' AND status = 'paid'
          AND (pass_lifetime OR pass_expires_at > now())
     ) AS active`,
    [userId],
  );
  return rows[0]?.active === true;
}

export async function hasPortfolioPro(userId: string): Promise<boolean> {
  const { rows } = await query<{ active: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM billing_subscriptions
        WHERE user_id = $1 AND status = 'active'
     ) OR EXISTS (
       SELECT 1 FROM billing_subscriptions
        WHERE user_id = $1 AND status = 'cancelled' AND current_period_end > now()
     ) AS active`,
    [userId],
  );
  return rows[0]?.active === true;
}

export async function customerPersonaHasPortfolioPro(slug: string): Promise<boolean> {
  const { rows } = await query<{ owner_user_id: string | null; role: string | null }>(
    `SELECT p.owner_user_id, u.role
       FROM personas p
       LEFT JOIN admin_users u ON u.id = p.owner_user_id
      WHERE p.slug = $1`,
    [slug],
  );
  const persona = rows[0];
  if (!persona?.owner_user_id || persona.role !== "customer") return true;
  return hasPortfolioPro(persona.owner_user_id);
}

export async function getPortfolioInsights(userId: string): Promise<PortfolioInsights> {
  const { rows } = await query<PortfolioInsights>(
    `SELECT
       (SELECT count(*)::int FROM events e JOIN personas p ON p.slug = e.persona
         WHERE p.owner_user_id = $1 AND e.type = 'pageview' AND e.at >= now() - interval '30 days') AS "pageViewsLast30Days",
       (SELECT count(*)::int FROM events e JOIN personas p ON p.slug = e.persona
         WHERE p.owner_user_id = $1 AND e.type = 'ask' AND e.at >= now() - interval '30 days') AS "visitorQuestionsLast30Days",
       (SELECT count(*)::int FROM ai_answers a JOIN personas p ON p.slug = a.persona
         WHERE p.owner_user_id = $1 AND a.created_at >= now() - interval '30 days') AS "aiAnswersLast30Days"`,
    [userId],
  );
  return rows[0] ?? { pageViewsLast30Days: 0, visitorQuestionsLast30Days: 0, aiAnswersLast30Days: 0 };
}

export async function createCvPassOrder(
  userId: string,
  provider: BillingProvider,
): Promise<{ id: string; amount: number; currency: "ETB" | "USD" }> {
  if (provider !== "chapa" && provider !== "paypal") throw new Error("Unsupported billing provider.");
  const price = billingProducts.cv_pass.prices[provider];
  const id = randomUUID();
  await query(
    "INSERT INTO billing_orders (id, user_id, provider, product, currency, amount, status) VALUES ($1, $2, $3, 'cv_pass', $4, $5, 'pending')",
    [id, userId, provider, price.currency, price.amount],
  );
  return { id, amount: price.amount, currency: price.currency };
}

export async function orderForUser(
  orderId: string,
  userId: string,
): Promise<{ id: string; provider: BillingProvider; currency: string; amount: string; status: string; providerReference: string | null } | null> {
  const { rows } = await query<{
    id: string;
    provider: BillingProvider;
    currency: string;
    amount: string;
    status: string;
    provider_reference: string | null;
  }>(
    "SELECT id, provider, currency, amount::text, status, provider_reference FROM billing_orders WHERE id = $1 AND user_id = $2 AND product = 'cv_pass'",
    [orderId, userId],
  );
  const row = rows[0];
  return row ? { id: row.id, provider: row.provider, currency: row.currency, amount: row.amount, status: row.status, providerReference: row.provider_reference } : null;
}

export async function orderById(orderId: string): Promise<{
  id: string;
  userId: string;
  provider: BillingProvider;
  currency: string;
  amount: string;
  status: string;
  providerReference: string | null;
} | null> {
  const { rows } = await query<{
    id: string;
    user_id: string;
    provider: BillingProvider;
    currency: string;
    amount: string;
    status: string;
    provider_reference: string | null;
  }>(
    "SELECT id, user_id, provider, currency, amount::text, status, provider_reference FROM billing_orders WHERE id = $1 AND product = 'cv_pass'",
    [orderId],
  );
  const row = rows[0];
  return row ? { id: row.id, userId: row.user_id, provider: row.provider, currency: row.currency, amount: row.amount, status: row.status, providerReference: row.provider_reference } : null;
}

export async function setOrderProviderReference(orderId: string, providerReference: string, checkoutUrl?: string): Promise<void> {
  const { rowCount } = await query(
    `UPDATE billing_orders SET provider_reference = $2, checkout_url = $3
      WHERE id = $1 AND status = 'pending'`,
    [orderId, providerReference, checkoutUrl ?? null],
  );
  if (!rowCount) throw new Error("The pending payment order could not be updated.");
}

export async function markOrderFailed(orderId: string): Promise<void> {
  await query("UPDATE billing_orders SET status = 'failed' WHERE id = $1 AND status = 'pending'", [orderId]);
}

async function completeOrder(client: PoolClient, orderId: string, provider: BillingProvider, amount: number, currency: string) {
  const { rows } = await client.query<{
    id: string;
    user_id: string;
    amount: string;
    currency: string;
    status: string;
  }>(
    "SELECT id, user_id, amount::text, currency, status FROM billing_orders WHERE id = $1 AND provider = $2 AND product = 'cv_pass' FOR UPDATE",
    [orderId, provider],
  );
  const order = rows[0];
  if (!order) throw new Error("Payment order was not found.");
  if (Number(order.amount) !== amount || order.currency !== currency) throw new Error("The verified payment amount does not match the order.");
  if (order.status === "paid") return;
  if (order.status !== "pending") throw new Error("This payment order is no longer pending.");
  await client.query("SELECT id FROM admin_users WHERE id = $1 FOR UPDATE", [order.user_id]);

  await client.query(
    `UPDATE billing_orders
        SET status = 'paid', paid_at = now(), pass_lifetime = true, pass_expires_at = NULL
      WHERE id = $1`,
    [orderId],
  );
}

export async function completeCvPassOrder(orderId: string, provider: BillingProvider, amount: number, currency: string): Promise<void> {
  await withTransaction((client) => completeOrder(client, orderId, provider, amount, currency));
}

export async function createPendingSubscription(userId: string, planId: string): Promise<string> {
  return withTransaction(async (client) => {
    await client.query("SELECT id FROM admin_users WHERE id = $1 FOR UPDATE", [userId]);
    await client.query(
      "UPDATE billing_subscriptions SET status = 'failed', updated_at = now() WHERE user_id = $1 AND status = 'pending' AND created_at < now() - interval '30 minutes'",
      [userId],
    );
    const { rows: existing } = await client.query(
      "SELECT 1 FROM billing_subscriptions WHERE user_id = $1 AND status IN ('pending', 'active') LIMIT 1",
      [userId],
    );
    if (existing.length) throw new Error("A Portfolio Pro subscription is already active or awaiting approval.");
    const id = randomUUID();
    await client.query(
      "INSERT INTO billing_subscriptions (id, user_id, provider, provider_plan_id, status) VALUES ($1, $2, 'paypal', $3, 'pending')",
      [id, userId, planId],
    );
    return id;
  });
}

export async function setSubscriptionReference(id: string, providerSubscriptionId: string): Promise<void> {
  const { rowCount } = await query(
    `UPDATE billing_subscriptions
        SET provider_subscription_id = $2, updated_at = now()
      WHERE id = $1 AND status = 'pending'`,
    [id, providerSubscriptionId],
  );
  if (!rowCount) throw new Error("The pending subscription could not be updated.");
}

export async function markSubscriptionFailed(id: string): Promise<void> {
  await query(
    "UPDATE billing_subscriptions SET status = 'failed', updated_at = now() WHERE id = $1 AND status = 'pending'",
    [id],
  );
}

export async function subscriptionForUser(id: string, userId: string): Promise<{ id: string; providerSubscriptionId: string | null; status: string; providerPlanId: string; currentPeriodEnd: Date | null } | null> {
  const { rows } = await query<{
    id: string;
    provider_subscription_id: string | null;
    status: string;
    provider_plan_id: string;
    current_period_end: Date | null;
  }>(
    "SELECT id, provider_subscription_id, status, provider_plan_id, current_period_end FROM billing_subscriptions WHERE id = $1 AND user_id = $2 AND provider = 'paypal'",
    [id, userId],
  );
  const row = rows[0];
  return row ? { id: row.id, providerSubscriptionId: row.provider_subscription_id, status: row.status, providerPlanId: row.provider_plan_id, currentPeriodEnd: row.current_period_end } : null;
}

export async function activateSubscription(
  id: string,
  providerSubscriptionId: string,
  providerPlanId: string,
  currentPeriodEnd: Date | null,
): Promise<void> {
  const { rowCount } = await query(
    `UPDATE billing_subscriptions
        SET provider_subscription_id = $2, provider_plan_id = $3, status = 'active',
            current_period_end = $4, updated_at = now()
      WHERE id = $1 AND provider = 'paypal' AND provider_plan_id = $3
        AND (provider_subscription_id = $2 OR provider_subscription_id IS NULL)`,
    [id, providerSubscriptionId, providerPlanId, currentPeriodEnd],
  );
  if (!rowCount) throw new Error("The matching Portfolio Pro subscription was not found.");
}

export async function updateSubscriptionStatus(
  providerSubscriptionId: string,
  status: "active" | "cancelled" | "suspended" | "expired",
  currentPeriodEnd: Date | null,
): Promise<void> {
  await query(
    `UPDATE billing_subscriptions
        SET status = $2, current_period_end = COALESCE($3, current_period_end), updated_at = now()
      WHERE provider = 'paypal' AND provider_subscription_id = $1`,
    [providerSubscriptionId, status, currentPeriodEnd],
  );
}

export async function recordWebhookOnce(provider: BillingProvider, eventId: string): Promise<boolean> {
  const { rowCount } = await query(
    "INSERT INTO billing_webhook_events (provider, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [provider, eventId],
  );
  return !!rowCount;
}
