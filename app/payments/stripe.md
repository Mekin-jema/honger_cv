# Stripe Payment Integration & Access Control Guide

This document describes the Stripe payment integration and the monetization/access control policies implemented across Honger CV.

---

## 1. Overview & Business Model

Honger CV supports three payment providers: **Stripe**, **PayPal**, and **Chapa**.

### Access Control Rules:
1. **Free Tier**:
   - Users can manually fill in the CV creation form to create **1 CV** for free.
   - All 25+ templates and manual editing are available for their first CV.
   - Generating additional CVs is blocked unless the user owns a Lifetime CV Design Pass.
2. **File Upload & AI Import (Paid Only)**:
   - Uploading resume documents (PDF, Word DOCX, PPTX, TXT, or Markdown) and extracting structured data with Docling & AI is **strictly gated behind the Lifetime CV Design Pass**.
   - If a free-tier user attempts to upload or call `/api/cv/parse` or `/api/cv/extract`, the application returns `402 Payment Required` and displays a premium upgrade banner in the studio.
3. **Lifetime CV Design Pass**:
   - **Price**: $1 USD (Stripe / PayPal) or 100 ETB (Chapa).
   - **Perks**:
     - Upload & auto-extract CVs from existing PDF/DOCX files.
     - Create unlimited additional CVs for life.
     - Unlocks all 25+ CV templates across every CV.
     - One-time payment with no recurring subscription.

---

## 2. Environment Variables

Configure the following variables in your `.env` or `.env.local`:

```bash
# Stripe API Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret (from Stripe CLI or Dashboard Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 3. Architecture & Endpoints

### 3.1. Checkout Initiation
- **Endpoint**: `POST /api/billing/checkout`
- **Payload**: `{ "provider": "stripe" }`
- **Flow**:
  1. Authenticates customer session.
  2. Creates a pending order in the `billing_orders` table with `provider = 'stripe'`, `product = 'cv_pass'`, `currency = 'USD'`, `amount = 1.00`.
  3. Initializes a Stripe Checkout Session via `stripe.checkout.sessions.create`:
     - Sets `mode = 'payment'`.
     - Links `client_reference_id` to the internal order ID.
     - Sets success redirect URL to `/account/billing/?stripe_session_id={CHECKOUT_SESSION_ID}&stripe_order_id=<ORDER_ID>`.
     - Sets cancel redirect URL to `/account/billing/?checkout=cancelled`.
  4. Stores the Stripe session ID in `billing_orders.provider_reference`.
  5. Returns `{ "ok": true, "checkoutUrl": session.url }`.

### 3.2. Verification on Return
- **Endpoint**: `POST /api/billing/stripe/verify`
- **Payload**: `{ "sessionId": "cs_test_...", "orderId": "..." }`
- **Flow**:
  1. Validates that the order belongs to the logged-in customer.
  2. Fetches the session details from Stripe using `stripe.checkout.sessions.retrieve`.
  3. Validates that `payment_status === "paid"`, and that amount and currency match.
  4. Calls `completeCvPassOrder(...)` inside a database transaction:
     - Sets `status = 'paid'`, `paid_at = now()`, and `pass_lifetime = true`.
  5. Returns `{ "ok": true, "paid": true }`.

### 3.3. Webhook Listener
- **Endpoint**: `POST /api/billing/stripe/webhook`
- **Flow**:
  1. Reads raw request payload and verifies signature using `STRIPE_WEBHOOK_SECRET`.
  2. Listens for `checkout.session.completed` events.
  3. On receipt:
     - Finds the matching order by `client_reference_id` or metadata `orderId`.
     - Verifies payment status and marks the pass as active for lifetime.
     - Records event in `billing_webhook_events` to prevent duplicate processing.
  4. Returns HTTP 200 `{ "received": true }`.

### 3.4. Gated File Upload Endpoints
- **Endpoints**:
  - `POST /api/cv/parse` (Docling & resume parser upload)
  - `POST /api/cv/extract` (AI field extraction)
- **Security & Authorization**:
  - Requires signed-in customer session (or admin).
  - Checks `await hasCvPass(session.userId)`.
  - Non-paid requests return:
    ```json
    {
      "success": false,
      "needsPayment": true,
      "error": "File upload and AI document parsing requires a CV Design Pass. Please upgrade to import your document."
    }
    ```
    with HTTP status `402 Payment Required`.

---

## 4. Database Schema

The database migration `migrations/0009_stripe_billing.sql` updates PostgreSQL check constraints:

```sql
ALTER TABLE billing_orders
  DROP CONSTRAINT IF EXISTS billing_orders_provider_check;
ALTER TABLE billing_orders
  ADD CONSTRAINT billing_orders_provider_check CHECK (provider IN ('chapa', 'paypal', 'stripe'));

ALTER TABLE billing_webhook_events
  DROP CONSTRAINT IF EXISTS billing_webhook_events_provider_check;
ALTER TABLE billing_webhook_events
  ADD CONSTRAINT billing_webhook_events_provider_check CHECK (provider IN ('chapa', 'paypal', 'stripe'));
```

---

## 5. Local Testing with Stripe CLI

To test Stripe checkout sessions and webhooks locally:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Authenticate:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/stripe/webhook
   ```
4. Copy the webhook signing secret printed by the CLI (`whsec_...`) into your `.env` as `STRIPE_WEBHOOK_SECRET`.
5. Trigger test payments in the browser or via:
   ```bash
   stripe trigger checkout.session.completed
   ```
