# Design Specification: Contributor-Friendly Local & CI Testing Environment

- **Ticket Key:** DQP-10
- **Status:** Approved Design
- **Date:** 2026-10-23
- **Author:** Yusuf Qureshi / AI Agent
- **Parent/Dependent Ticket:** DQP-11 (Enterprise Checkout Order Lifecycle & Stripe Order Reconciliation)

---

## 1. Problem Statement & Motivation

During recent incident investigations (e.g., Andrew Cook's uncreated WooCommerce order for £89.02 and silent webhook failures), testing changes against live client infrastructure or relying purely on synthetic mocks was identified as a major risk. Naive mocks frequently miss real WooCommerce behavior (such as coupon usage limits, product restrictions, and database constraints), while live testing risks clobbering production state.

Furthermore, external or new contributors currently face high friction:
1. No documented, single-command method to spin up a working local WooCommerce backend.
2. Incomplete seed data missing crucial test edge cases (coupons with usage limits, expired coupons, out-of-stock items, verified low-stock bypasses).
3. No zero-credential mechanism to simulate Stripe payment webhooks locally without an external Stripe CLI account and login tunnel.

**Goal:** Establish a 100% reproducible, hermetic testing environment that any contributor can spin up with a single command (`npm run test:env:setup`) to run unit, integration, and E2E tests without needing access to production secrets, live Bluehost servers, or manual WordPress setup.

---

## 2. Architecture & Components

The testing environment implements a two-tier architecture:
1. **Fast Local Tier (MSW)**: In-memory mock server for quick unit testing and pre-commit checks (`npm test`).
2. **Deep Integration Tier (`@wordpress/env` in Docker)**: Fully functional WordPress 6.7 + WooCommerce instance running locally with version-controlled PHP snippets auto-mounted, seed catalog data, and a local Stripe webhook simulator.

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Storefront                     │
│                       (localhost:3000)                      │
└─────────────────┬─────────────────────────▲─────────────────┘
                  │                         │
      REST & Store API calls       Simulated Webhooks
                  │                         │
                  ▼                         │
┌───────────────────────────────────┐ ┌─────┴─────────────────┐
│     @wordpress/env (Docker)       │ │  Local Webhook Tool   │
│         (localhost:8888)          │ │ (simulate-stripe-     │
│                                   │ │      webhook.ts)      │
│  - WordPress 6.7 + WooCommerce    │ └───────────────────────┘
│  - mu-plugins mount (Snippets)    │
│  - Deterministic DB Seeding:      │
│    * Catalog (Normal, Low, OOS)   │
│    * Coupons (Valid, Exp, Limit)  │
│    * Tax (20% VAT) & Shipping     │
│    * API Keys: ck/cs_local_test   │
└───────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Container Architecture (`.wp-env.json`)
The configuration runs standard WordPress and WooCommerce in Docker, with custom PHP snippets mounted directly into `wp-content/mu-plugins/`:

```json
{
  "core": "WordPress/WordPress#6.7",
  "plugins": [
    "https://downloads.wordpress.org/plugin/woocommerce.latest-stable.zip"
  ],
  "port": 8888,
  "config": {
    "WP_DEBUG": true,
    "WP_DEBUG_LOG": true,
    "SCRIPT_DEBUG": true
  },
  "mappings": {
    "wp-content/mu-plugins/snippets": "./backend/wordpress/snippets",
    "wp-content/mu-plugins/headless-redirect.php": "./wordpress/mu-plugins/headless-redirect.php"
  }
}
```

**Key Advantages:**
* **Zero Database Synchronization**: Snippets execute automatically on container boot via WordPress's native `mu-plugins` loader without requiring Code Snippets database entries.
* **Drift-Free**: The exact PHP files in `backend/wordpress/snippets/` run locally.
* **Instant Refresh**: Code changes to snippets are immediately live inside Docker without restarting the container.

### 3.2 Deterministic Database Seeding (`backend/tools/seed-local-wp.ts`)
The bootstrap tool uses WP-CLI inside the container via `npx wp-env run cli` to deterministically set up:

1. **WooCommerce Base Configuration:**
   * Currency set to `GBP` (£).
   * Standard 20% VAT rate configured.
   * UK Shipping Zone with Free Delivery and 1st Class Delivery (£3.99, tax exempt).

2. **Deterministic REST API Credentials:**
   * Known keys created or injected: `ck_local_test` and `cs_local_test` with `read_write` permissions for user `admin`.
   * Automatic generation of local test environment file (`.env.test.local`).

3. **Edge-Case Fixture Data (`backend/fixtures/seed-catalog.json`):**
   * **In-Stock Product:** 25 units in stock, regular price £6.99.
   * **Low-Stock Product (< 5 units):** 2 units in stock, standard low-stock inquiry guard active.
   * **Verified Low-Stock Product:** 2 units in stock with `_bypass_low_stock_guard: "yes"` (testing DQP-4 bypass).
   * **Out-of-Stock Product:** 0 units in stock.
   * **Valid Coupon (`THANKYOU10`):** 10% discount, usage limit = 1 per user.
   * **Expired Coupon (`EXPIRED20`):** 20% discount, expiration date set in the past.
   * **Usage-Exhausted Coupon (`LIMITREACHED`):** 15% discount, global usage limit reached.
   * **Minimum-Spend Coupon (`MINSPEND50`):** £10 discount, minimum spend £50.

### 3.3 Zero-Dependency Local Stripe Webhook Simulator (`backend/tools/simulate-stripe-webhook.ts`)
A dedicated command-line utility allowing contributors to simulate signed Stripe webhook events without needing external Stripe CLI binaries or live Stripe accounts.

**Command Signature:**
```bash
npm run test:webhook -- --event=<event_type> [--orderId=<id>] [--pi=<pi_id>] [--amount=<pence>]
```

**Implementation Mechanism:**
1. Loads payload template for the target event (`payment_intent.succeeded`, `payment_intent.payment_failed`, etc.).
2. Injects custom order parameters and cart metadata.
3. Computes the real Stripe HMAC-SHA256 signature using the Node.js `crypto` module:
   ```ts
   const timestamp = Math.floor(Date.now() / 1000);
   const signature = crypto
     .createHmac("sha256", webhookSecret)
     .update(`${timestamp}.${payloadString}`)
     .digest("hex");
   const header = `t=${timestamp},v1=${signature}`;
   ```
4. Posts the payload to `http://localhost:3000/api/webhooks/stripe` with the `stripe-signature` header.
5. Logs the HTTP response status, execution time, and response body.

### 3.4 Contributor Runbook & Standardized NPM Scripts

#### Standardized Scripts (`package.json`)
```json
{
  "test:env:setup": "npm run test:env:start && npm run test:env:seed",
  "test:env:start": "wp-env start",
  "test:env:seed": "tsx backend/tools/seed-local-wp.ts",
  "test:env:stop": "wp-env stop",
  "test:env:clean": "wp-env clean all",
  "test:webhook": "tsx backend/tools/simulate-stripe-webhook.ts",
  "test:integration:local": "vitest run --config vitest.integration.config.mts"
}
```

#### Contributor Guide (`docs/testing.md`)
* Clear prerequisites: Node.js 20+ and Docker Desktop.
* Single-command setup instructions.
* How to run the local Next.js storefront against local WooCommerce.
* Common troubleshooting steps (e.g. port conflicts on 8888, Docker daemon not running, resetting dirty test databases).
* Linked prominently in repository `README.md`.

---

## 4. Verification & Testing Plan

1. **Clean Installation Test:** Clone repository to a temporary directory, run `npm run test:env:setup`, and verify container boots and seed data is populated.
2. **API Verification Test:** Verify REST API queries with `ck_local_test` / `cs_local_test` return seeded products and coupons with correct attributes.
3. **Snippet Execution Test:** Query WooCommerce REST API for verified stock product to confirm `002-verified-stock-guard-bypass.php` exposes `_bypass_low_stock_guard` field in rest response.
4. **Webhook Simulation Test:** Run `npm run test:webhook -- --event=payment_intent.succeeded` against Next.js local server and verify 200 OK response with valid signature.
5. **CI Compatibility:** Ensure existing CI pipeline remains green and fast.

---

## 5. Definition of Done

- [ ] `.wp-env.json` updated with WooCommerce and `mu-plugins` mapping.
- [ ] `backend/fixtures/seed-catalog.json` expanded with all edge-case products and coupons.
- [ ] `backend/tools/seed-local-wp.ts` fully implemented to execute automated configuration and seeding via WP-CLI.
- [ ] `backend/tools/simulate-stripe-webhook.ts` implemented and working via `npm run test:webhook`.
- [ ] `package.json` scripts added.
- [ ] `docs/testing.md` written and linked in `README.md`.
- [ ] All tests pass locally and in CI.
