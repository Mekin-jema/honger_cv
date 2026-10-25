CREATE TABLE IF NOT EXISTS billing_orders (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('chapa', 'paypal')),
  product text NOT NULL CHECK (product IN ('cv_pass')),
  currency text NOT NULL CHECK (currency IN ('ETB', 'USD')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  provider_reference text UNIQUE,
  checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  pass_expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS billing_orders_user_pass_idx
  ON billing_orders (user_id, pass_expires_at DESC)
  WHERE status = 'paid';

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'paypal'),
  provider_subscription_id text UNIQUE,
  provider_plan_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'cancelled', 'suspended', 'expired', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_user_status_idx
  ON billing_subscriptions (user_id, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_one_pending_active_idx
  ON billing_subscriptions (user_id)
  WHERE status IN ('pending', 'active');

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  provider text NOT NULL CHECK (provider IN ('chapa', 'paypal')),
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);
