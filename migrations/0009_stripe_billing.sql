ALTER TABLE billing_orders
  DROP CONSTRAINT IF EXISTS billing_orders_provider_check;

ALTER TABLE billing_orders
  ADD CONSTRAINT billing_orders_provider_check CHECK (provider IN ('chapa', 'paypal', 'stripe'));

ALTER TABLE billing_webhook_events
  DROP CONSTRAINT IF EXISTS billing_webhook_events_provider_check;

ALTER TABLE billing_webhook_events
  ADD CONSTRAINT billing_webhook_events_provider_check CHECK (provider IN ('chapa', 'paypal', 'stripe'));
