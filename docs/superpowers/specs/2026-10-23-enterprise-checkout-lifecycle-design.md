# Enterprise Checkout Order Lifecycle & Server-Side Payment Verification Design Spec

- **Ticket:** [DQP-5](https://yqwebstudio.atlassian.net/browse/DQP-5)
- **Status:** In Progress
- **Authors:** Yusuf Qureshi, Antigravity AI
- **Date:** 2026-10-23

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 Incidents & Vulnerabilities Addressed
1. **Customer Order Loss (Andrew Cook, 9 Oct 2026)**:
   - Customer Andrew Cook (`acook@fiveacresgarage.co.uk`) purchased 9 × 42W GX24q-4 CFL bulbs (£89.02).
   - Stripe successfully charged the card (`ch_3UOeBh4Tt6mIhQxV1b5sx7M7` / `pi_3UOeBh4Tt6mIhQxV1cNLUZOX`).
   - The checkout screen displayed "Order processing delayed" and no WooCommerce order was created.
   - **Root Cause**: The legacy architecture executed WooCommerce order creation *after* payment authorization. During post-payment order creation in `stripe-sync.ts`, coupon `THANKYOU10` was submitted to WooCommerce, which rejected it (per-user usage limit or coupon restriction). This threw an uncaught error, aborting order creation in both the webhook and the success-page polling fallback.
2. **Server-Side Verification Vulnerability (DQP-5)**:
   - `POST /api/checkout/create-wc-order` accepted a client-supplied `transactionId` and marked orders `set_paid: true` with `status: "processing"` without verifying the payment with PayPal or Stripe.
   - Anyone could call `create-wc-order` directly with fabricated payment references to generate fraudulent paid orders.

### 1.2 Architectural Target
Transition from an untrusted, post-payment order creation model to an **Atomic Pending-Order-First Lifecycle**:
1. Create a WooCommerce order with `status: "pending"` **before** payment authorization.
2. Inject the confirmed WooCommerce `orderId` into Stripe `PaymentIntent` and PayPal order metadata.
3. Guarantee that **no Stripe charge or PayPal capture can ever occur without an associated WooCommerce order ID**.
4. Promote orders to `processing` **only** via verified server-side captures and cryptographic webhooks.
5. Provide a historical reconciliation utility (`backend/tools/reconcile-stripe-orders.ts`) to recover Andrew Cook's £89.02 order and any orphan Stripe charges since 26 Sep 2026.

---

## 2. Architecture & State Machine

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Checkout State Machine                          │
│                                                                        │
│   1. Pre-Payment Validation                                            │
│      validateCartTotals(items, shipping, form, coupon)                 │
│      ├── Invalid ────────► Return 400 (Halt; no order created)         │
│      └── Valid                                                         │
│            ▼                                                           │
│   2. Atomic Pending Order Creation                                     │
│      createWooCommerceOrder({ status: "pending", set_paid: false })    │
│      Returns orderId (e.g. #38350)                                     │
│            ▼                                                           │
│   3. Payment Gateway Authorization Intent                              │
│      Stripe PaymentIntent / PayPal Order                               │
│      metadata: { orderId: 38350, ... }                                 │
│            ▼                                                           │
│   4. Payment Resolution                                                │
│      ├── Payment Succeeded (Webhook / Server Capture)                  │
│      │     Verify amount, currency (GBP), and orderId                  │
│      │     updateWooCommerceOrder(38350, { status: "processing" })     │
│      │     Send Confirmation Email & Invalidate Stock Cache Tags       │
│      └── Payment Failed / Cancelled                                    │
│            updateWooCommerceOrder(38350, { status: "failed" })         │
│            (Inventory preserved; unreserved cleanly)                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Stripe Pre-Payment Pending Order (`/api/checkout/stripe/create-intent`)
- Prior to creating a Stripe PaymentIntent, the endpoint validates the cart and creates a WooCommerce order with:
  ```json
  {
    "status": "pending",
    "set_paid": false,
    "currency": "GBP",
    "line_items": [...],
    "billing": {...},
    "shipping": {...},
    "coupon_lines": [...]
  }
  ```
- If a customer modifies their cart or retries, previous incomplete PaymentIntents and pending orders are cleanly cancelled or updated to avoid orphan records.
- The resulting `orderId` is injected into Stripe PaymentIntent metadata:
  ```json
  {
    "orderId": "38350",
    "databaseIds": "101,102",
    "slugs": "bulb-a,bulb-b"
  }
  ```
- The endpoint returns `{ clientSecret, orderId }` to the frontend.

### 3.2 PayPal Server-Side Verification (`/api/checkout/paypal/`)
- `create-order`: Pre-creates the WooCommerce `pending` order and sets PayPal `custom_id = orderId`.
- `capture-order`:
  1. Captures the payment via PayPal REST API.
  2. Verifies capture `status === "COMPLETED"`.
  3. Verifies captured currency is `"GBP"` and captured value matches `validateCartTotals().finalTotal`.
  4. Server-side updates the WooCommerce order to `processing` and `set_paid: true`.
  5. Completely removes the client's reliance on calling `create-wc-order` with untrusted transaction IDs.

### 3.3 Webhook & Idempotency Engine (`src/lib/stripe-sync.ts`)
- `processOrderFromPaymentIntent`:
  1. Reads `metadata.orderId` from the PaymentIntent.
  2. Fetches WooCommerce order by ID.
  3. If order is already `processing` or `completed`: skips duplicate processing and suppresses duplicate emails (idempotent 200).
  4. If order is `pending`: promotes to `processing`, records `transaction_id`, records charge metadata, and dispatches customer confirmation email.
  5. If order does not exist (legacy/historical payment): safely creates the order with verified metadata and logs the recovery.

### 3.4 Historical Stripe Reconciliation Engine (`backend/tools/reconcile-stripe-orders.ts`)
A dedicated Node.js/TypeScript CLI tool that audits Stripe against WooCommerce:
- Scans all Stripe charges created after `1727308800` (26 Sep 2026).
- Cross-references each charge against WooCommerce orders using `transaction_id` and PaymentIntent metadata.
- Identifies orphan charges (specifically Andrew Cook's `ch_3UOeBh4Tt6mIhQxV1b5sx7M7`).
- In `--execute` mode, recovers the order in WooCommerce with correct line items, customer billing, and payment transaction metadata, without duplicate charges.

---

## 4. Test Strategy

1. **Unit Tests**:
   - `src/tests/unit/pending-order-lifecycle.test.ts`: Verify pending order creation payload, metadata injection, and promotion logic.
   - `src/tests/unit/paypal-verification.test.ts`: Test server-side PayPal capture verification, rejecting mismatched amounts or forged capture IDs.
   - `src/tests/unit/reconcile-stripe-orders.test.ts`: Test reconciliation scanner matching algorithm and orphan detection.
2. **Integration Tests**:
   - `src/tests/integration/stripe-webhook.test.ts`: Update tests to verify atomic promotion of `pending` -> `processing`, idempotent deduplication, and failure cleanup.
3. **Local Docker Environment**:
   - Test against local container seeded via DQP-10 (`npm run test:env:setup`).

---

## 5. Definition of Done
- [ ] No payment can be authorized without an existing WooCommerce order in `pending` status.
- [ ] Only server-verified captures (PayPal API / Stripe webhook) can promote an order to `processing`.
- [ ] Fabricated or mismatched transaction IDs are rejected with 4xx.
- [ ] Payment decline or cancellation cleanly marks pending order as `failed`/`cancelled` without reducing inventory.
- [ ] Full idempotency: duplicate webhooks/captures never duplicate orders or customer emails.
- [ ] Historical reconciliation tool accurately restores Andrew Cook's £89.02 order and any orphan charges.
- [ ] Unit & integration test coverage >= 80%.
