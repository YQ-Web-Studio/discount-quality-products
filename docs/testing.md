# Local & CI Testing Environment Runbook

Welcome to the Discount Products Store testing environment guide. This document details how to spin up a fully isolated, reproducible local WordPress & WooCommerce instance with deterministic seed data and simulate Stripe payment events without external cloud dependencies.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Local Host                            │
│                                                             │
│   ┌────────────────────────┐       ┌────────────────────┐   │
│   │ Next.js Storefront App │       │ Stripe Webhook CLI │   │
│   │ (npm run dev, port 3000)       │ (npm run test:webhook) │
│   └───────────┬────────────┘       └─────────┬──────────┘   │
│               │                              │              │
│               │ REST API                     │ Signed POST  │
│               │ (ck_local_test)              │ (HMAC-SHA256)│
│               ▼                              ▼              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Docker Container (@wordpress/env, port 8888)        │   │
│   │                                                     │   │
│   │  - WordPress 7.1.3 + WooCommerce                    │   │
│   │  - Snippets Auto-Mounted (wp-content/mu-plugins/)   │   │
│   │  - Deterministic REST API Keys (ck_ / cs_local_test)│   │
│   │  - Edge-case Seed Catalog & Coupons                 │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **Zero Database Drift**: PHP snippets in `backend/wordpress/snippets/` are auto-mounted into `/wp-content/mu-plugins/snippets/` via `.wp-env.json`. Any code change to snippets is active immediately inside Docker.
- **Deterministic Seeding**: `backend/tools/seed-local-wp.ts` provisions known API credentials (`ck_local_test` / `cs_local_test`), currency (GBP), tax, and edge-case products/coupons.
- **Zero-Dependency Webhook Simulator**: `backend/tools/simulate-stripe-webhook.ts` generates valid HMAC-SHA256 Stripe signatures (`t=...,v1=...`) to test payment webhooks locally.

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js**: v20 or higher
- **Docker Desktop** (or Docker Engine): Running and accessible from your terminal

---

## Quickstart (Single-Command Setup)

To launch the Docker container and populate all fixtures in one command:

```bash
npm run test:env:setup
```

This runs:
1. `wp-env start` (downloads and boots WordPress + WooCommerce in Docker on `http://localhost:8888`)
2. `tsx backend/tools/seed-local-wp.ts` (configures settings, API keys, categories, products, coupons, and writes `.env.test.local`)

---

## Running the Storefront Against Local WordPress

Once the test environment is running:

1. Copy `.env.test.local` values into your `.env.local` or run:
   ```bash
   cp .env.test.local .env.local
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` to browse seeded products and test the checkout flow.

---

## Seed Fixtures Catalog

The environment provisions deterministic edge cases from `backend/fixtures/seed-catalog.json`:

| Item Slug / Code | Type | Characteristics & Purpose |
| :--- | :--- | :--- |
| `e27-vintage-edison-led-filament-bulb-4w-amber` | Product | Normal stock (25 units), £6.99. |
| `low-stock-dimmable-spotlight-bulb` | Product | Low stock (2 units), triggers low-stock warning. |
| `verified-low-stock-gu10-halogen-bulb` | Product | Low stock (2 units) with `_bypass_low_stock_guard: "yes"` (DQP-4 bypass). |
| `out-of-stock-replacement-lamp` | Product | 0 units in stock, tests out-of-stock checkout guards. |
| `THANKYOU10` | Coupon | 10% discount, 1 use per user (used in DQP-10 incident reproduction). |
| `WELCOME5` | Coupon | £5 fixed discount, £0 minimum spend. |
| `MINSPEND50` | Coupon | £10 fixed discount, strictly requires £50 minimum cart value. |
| `LIMITREACHED` | Coupon | Global usage limit set to 0 (exhausted). |
| `EXPIRED20` | Coupon | Expiration date set in the past. |

---

## Simulating Stripe Webhooks

You do not need a live Stripe account or the external Stripe CLI to test webhook flows. Use the built-in simulator:

### 1. Simulate Payment Success
```bash
npm run test:webhook -- --event=payment_intent.succeeded --orderId=1001 --amount=8902
```

### 2. Simulate Payment Failure
```bash
npm run test:webhook -- --event=payment_intent.payment_failed --orderId=1001 --amount=8902
```

### CLI Options

| Flag | Default | Description |
| :--- | :--- | :--- |
| `--event` | `payment_intent.succeeded` | Event type (`payment_intent.succeeded` or `payment_intent.payment_failed`) |
| `--orderId` | `1001` | Target WooCommerce order ID |
| `--amount` | `8902` | Transaction amount in pence (£89.02) |
| `--pi` | `pi_simulated_<timestamp>` | Payment Intent ID |
| `--secret` | `whsec_test_secret` | Webhook signing secret |
| `--url` | `http://localhost:3000/api/webhooks/stripe` | Destination endpoint |

---

## Stopping and Resetting the Environment

- **Stop containers** (preserves database state):
  ```bash
  npm run test:env:stop
  ```
- **Re-seed fixtures**:
  ```bash
  npm run test:env:seed
  ```
- **Completely clean database and containers**:
  ```bash
  npm run test:env:clean
  ```

---

---

## Historical Stripe Order Reconciliation Runbook (DQP-5)

When a customer is charged in Stripe but order processing failed or timed out (e.g. the 9 Oct 2026 incident with Andrew Cook `acook@fiveacresgarage.co.uk`), use the reconciliation CLI to audit and restore orphan charges.

### 1. Audit / Dry-Run Mode (Safe)
Audits Stripe charges against WooCommerce without modifying any orders or charging cards:

```bash
# Audit all Stripe charges since a specific ISO date
npm run reconcile:stripe -- --since=2026-10-01

# Audit a specific PaymentIntent or Charge
npm run reconcile:stripe -- --pi=pi_3UOeBh4Tt6mIhQxV1cNLUZOX
```

### 2. Live Recovery Execution
Once verified in dry-run mode, pass `--execute` to create missing orders in WooCommerce in `processing` status with full line items, delivery metadata, and transaction IDs:

```bash
# Recover specific missing order
npm run reconcile:stripe -- --pi=pi_3UOeBh4Tt6mIhQxV1cNLUZOX --execute

# Recover all orphans since an incident date
npm run reconcile:stripe -- --since=2026-10-01 --execute
```

---

## Troubleshooting

### 1. Port 8888 is already in use
If another service is using port 8888, check running containers with `docker ps` or stop conflicting processes.

### 2. Docker daemon is not running
If `wp-env start` fails with `Cannot connect to the Docker daemon`, start Docker Desktop and ensure the engine has fully booted.

### 3. Missing REST API keys or Unauthorized (401)
Run `npm run test:env:seed` to reinject `ck_local_test` and `cs_local_test` into the WooCommerce database and regenerate `.env.test.local`.

