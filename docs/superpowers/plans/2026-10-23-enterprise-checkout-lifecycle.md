# Enterprise Checkout Order Lifecycle & Server-Side Payment Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the atomic Pending-Order-First checkout lifecycle for Stripe and PayPal, enforce strict server-side payment verification (closing DQP-5), and provide a historical reconciliation engine to recover Andrew Cook's £89.02 order and any orphan Stripe charges since 26 Sep 2026.

**Architecture:** Pre-create WooCommerce orders with `status: "pending"` before payment capture. Store confirmed `orderId` in Stripe PaymentIntent and PayPal order metadata. Promote orders to `processing` solely via verified server-side captures and webhooks. Provide `backend/tools/reconcile-stripe-orders.ts` CLI to audit and restore orphan charges.

**Tech Stack:** Next.js (App Router), TypeScript, Stripe API, PayPal API, WooCommerce REST API, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-23-enterprise-checkout-lifecycle-design.md](file:///c:/Development/DQP/discount-products-store/docs/superpowers/specs/2026-10-23-enterprise-checkout-lifecycle-design.md)

## Global Constraints

- **Ticket Key:** `DQP-5`
- **Branch:** `fix/DQP-5-enterprise-checkout-lifecycle`
- **Base Branch:** `main`
- **Commit Format:** `[DQP] type(scope): description (DQP-5)`
- **PR Format:** `[DQP] type(scope): description (DQP-5)`
- **Test Coverage:** Changed lines >= 80%.
- **Zero Production Risk:** No unverified charges or order tampering; reconciliation script defaults to `--dry-run`.

---

### Task 1: Historical Stripe Order Reconciliation Engine

**Files:**
- Create: `backend/tools/reconcile-stripe-orders.ts`
- Test: `src/tests/unit/reconcile-stripe-orders.test.ts`

**Interfaces:**
- Consumes: Stripe API charges (`created >= 1727308800`), WooCommerce REST API
- Produces: CLI tool reporting orphan charges, and recovering them into WooCommerce orders in `--execute` mode

- [ ] **Step 1: Write failing unit test for reconciliation matcher & decoder**
Create `src/tests/unit/reconcile-stripe-orders.test.ts` testing charge matching, metadata parsing, and order payload building for Andrew Cook's transaction (`ch_3UOeBh4Tt6mIhQxV1b5sx7M7`).

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/reconcile-stripe-orders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement backend/tools/reconcile-stripe-orders.ts**
Implement:
1. `auditStripeCharges(options)`: Fetches charges since given timestamp, checks WooCommerce `transaction_id`.
2. `buildRecoveryOrderPayload(charge, paymentIntent)`: Constructs valid WooCommerce order payload from charge metadata and customer details.
3. CLI argument parsing (`--since`, `--execute`, `--dry-run`, `--pi`).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/reconcile-stripe-orders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/tools/reconcile-stripe-orders.ts src/tests/unit/reconcile-stripe-orders.test.ts
git commit -m "[DQP] feat(reconcile): implement historical stripe order reconciliation engine (DQP-5)"
```

---

### Task 2: Server-Side PayPal Verification & Pending-Order Consolidation

**Files:**
- Modify: `src/app/api/checkout/paypal/create-order/route.ts`
- Modify: `src/app/api/checkout/paypal/capture-order/route.ts`
- Modify: `src/app/api/checkout/create-wc-order/route.ts`
- Test: `src/tests/unit/paypal-verification.test.ts`

**Interfaces:**
- Consumes: PayPal REST API, `validateCartTotals`
- Produces: Pending WooCommerce order created before PayPal popup; verified server-side promotion on capture; rejection of unverified/forged client calls

- [ ] **Step 1: Write failing unit tests for server-side PayPal payment verification**
Create `src/tests/unit/paypal-verification.test.ts`:
1. Reject unverified capture IDs.
2. Reject mismatched currency or amounts.
3. Verify pending order promotion on valid COMPLETED capture.
4. Verify `/api/checkout/create-wc-order` rejects requests without server-verified payment.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/paypal-verification.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement server-side verification in PayPal routes**
1. In `paypal/create-order/route.ts`: Validate cart and create WooCommerce order with `status: "pending"`, `set_paid: false`. Pass `orderId` in PayPal `custom_id`.
2. In `paypal/capture-order/route.ts`: Capture PayPal payment server-side, verify `COMPLETED` and amount match, then promote WooCommerce order to `processing` and `set_paid: true`.
3. In `create-wc-order/route.ts`: Deprecate or strictly gate endpoint so unverified client claims cannot create paid orders.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/paypal-verification.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/checkout/paypal/ src/app/api/checkout/create-wc-order/ src/tests/unit/paypal-verification.test.ts
git commit -m "[DQP] fix(checkout): enforce server-side paypal payment verification and pending order creation (DQP-5)"
```

---

### Task 3: Atomic Pre-Payment Pending Order Creation for Stripe

**Files:**
- Modify: `src/app/api/checkout/stripe/create-intent/route.ts`
- Modify: `src/lib/stripe-sync.ts`
- Modify: `src/app/api/webhooks/stripe/route.ts`
- Test: `src/tests/unit/pending-order-lifecycle.test.ts`
- Test: `src/tests/integration/stripe-webhook.test.ts`

**Interfaces:**
- Consumes: Stripe API, WooCommerce REST API
- Produces: Guaranteed WooCommerce `orderId` in Stripe PaymentIntent metadata; webhook promotes `pending` -> `processing`; failure cleans up pending order

- [ ] **Step 1: Write failing tests for pending-order creation and webhook promotion**
Create `src/tests/unit/pending-order-lifecycle.test.ts`:
1. `create-intent` creates a WooCommerce `pending` order and includes `orderId` in Stripe metadata.
2. `stripe-sync.ts` promotes the existing pending order to `processing` on `payment_intent.succeeded`.
3. `stripe-sync.ts` cleans up/marks failed on `payment_intent.payment_failed`.
4. Idempotency: multiple webhook calls for the same order ID do not duplicate emails or status updates.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/pending-order-lifecycle.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement pending-order-first lifecycle in Stripe routes and sync**
1. In `create-intent/route.ts`: Create WooCommerce pending order (`status: "pending"`, `set_paid: false`). Put `orderId` into PaymentIntent metadata.
2. In `stripe-sync.ts`: Retrieve WooCommerce order by `metadata.orderId`. If `pending`, update to `processing`, set `transaction_id`, record charge metadata, and send confirmation email.
3. In `stripe-sync.ts`: Handle `payment_intent.payment_failed` by transitioning pending order to `failed` or cancelling it.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/pending-order-lifecycle.test.ts src/tests/integration/stripe-webhook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/checkout/stripe/create-intent/route.ts src/lib/stripe-sync.ts src/app/api/webhooks/stripe/route.ts src/tests/unit/pending-order-lifecycle.test.ts src/tests/integration/stripe-webhook.test.ts
git commit -m "[DQP] feat(checkout): implement atomic pending-order-first stripe lifecycle (DQP-5)"
```

---

### Task 4: Storefront Checkout Flow & Success Page Alignment

**Files:**
- Modify: `src/app/checkout/CheckoutFlow.tsx`
- Modify: `src/app/checkout/success/SuccessContent.tsx`
- Test: `src/tests/unit/checkout-flow-alignment.test.ts`

**Interfaces:**
- Consumes: Pre-created `orderId` from server responses
- Produces: Instant order confirmation without long polling; zero client-side paid order creation

- [ ] **Step 1: Write failing test verifying checkout flow consumes orderId directly**
Create `src/tests/unit/checkout-flow-alignment.test.ts`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/unit/checkout-flow-alignment.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update CheckoutFlow.tsx and SuccessContent.tsx**
1. In `CheckoutFlow.tsx`: Pass pre-created `orderId` to success redirect (`/checkout/success?order=${orderId}&pi=${pi}`).
2. In `SuccessContent.tsx`: If `order` query param is present, immediately display confirmed order details without polling or delay.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/unit/checkout-flow-alignment.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/checkout/CheckoutFlow.tsx src/app/checkout/success/SuccessContent.tsx src/tests/unit/checkout-flow-alignment.test.ts
git commit -m "[DQP] feat(checkout): align storefront and success page with pre-created order IDs (DQP-5)"
```

---

### Task 5: Contributor Runbook, End-to-End Verification & Typecheck

**Files:**
- Modify: `package.json` (add `reconcile:stripe` script)
- Modify: `docs/testing.md`
- Test: Full Vitest suite & TypeScript compilation

- [ ] **Step 1: Add reconcile:stripe npm script to package.json**
Add `"reconcile:stripe": "tsx backend/tools/reconcile-stripe-orders.ts"` to `package.json`.

- [ ] **Step 2: Update documentation in docs/testing.md**
Document how to run the reconciliation tool in dry-run and live modes.

- [ ] **Step 3: Run full verification suite**
Run:
```bash
npm run typecheck
npm run test:coverage
```
Expected: All tests pass, changed lines >= 80% coverage, zero type errors.

- [ ] **Step 4: Commit**
```bash
git add package.json docs/testing.md
git commit -m "[DQP] docs(testing): add stripe reconciliation runbook and npm script (DQP-5)"
```
