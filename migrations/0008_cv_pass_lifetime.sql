ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS pass_lifetime boolean NOT NULL DEFAULT false;
