# Contributor-Friendly Local & CI Testing Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an isolated, 1-command reproducible local and CI test environment (`npm run test:env:setup`) featuring automated WooCommerce seeding, must-use snippets mounting, and a zero-dependency Stripe webhook simulator.

**Architecture:** Use `@wordpress/env` in Docker to run local WordPress 6.7 + WooCommerce with snippets directly mounted into `wp-content/mu-plugins/snippets` (zero database sync drift). Seed deterministic catalog edge-cases (low stock, verified low-stock bypass, out of stock, valid/expired/exhausted coupons) and deterministic API keys via WP-CLI. Provide a Node.js crypto-based Stripe webhook simulator CLI to test payment events locally without cloud accounts.

**Tech Stack:** `@wordpress/env`, Docker, WP-CLI, TypeScript, Node.js `crypto`, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-10-23-reproducible-testing-environment-design.md](file:///c:/Development/DQP/discount-products-store/docs/superpowers/specs/2026-10-23-reproducible-testing-environment-design.md)

## Global Constraints

- **Ticket Key:** `DQP-10`
- **Branch:** `test/DQP-10-reproducible-test-env`
- **Base Branch:** `main`
- **Commit Format:** `[DQP] type(scope): description (DQP-10)`
- **PR Format:** `[DQP] type(scope): description (DQP-10)`
- **Test Coverage:** Changed lines >= 80%.
- **Zero Production Risk:** No live client WordPress or payment gateways accessed; all tests use Docker or local mocks.

---

### Task 1: Container Architecture & Automatic Snippet Mounting

**Files:**
- Modify: `.wp-env.json`
- Test: `src/tests/unit/wpenv-config.test.ts`

**Interfaces:**
- Consumes: `backend/wordpress/snippets/` and `wordpress/mu-plugins/headless-redirect.php`
- Produces: Docker container with Must-Use plugins automatically mounted into `/var/www/html/wp-content/mu-plugins/`

- [ ] **Step 1: Write the failing test for .wp-env.json configuration**

Create `src/tests/unit/wpenv-config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('.wp-env.json configuration', () => {
  it('contains mandatory snippet mappings and debug settings', () => {
    const configPath = path.resolve(process.cwd(), '.wp-env.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config.mappings).toBeDefined();
    expect(config.mappings['wp-content/mu-plugins/snippets']).toBe('./backend/wordpress/snippets');
    expect(config.mappings['wp-content/mu-plugins/headless-redirect.php']).toBe('./wordpress/mu-plugins/headless-redirect.php');
    expect(config.config?.WP_DEBUG).toBe(true);
    expect(config.config?.SCRIPT_DEBUG).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/tests/unit/wpenv-config.test.ts`
Expected: FAIL (missing mappings / SCRIPT_DEBUG).

- [ ] **Step 3: Update .wp-env.json with correct mappings and configs**

Update `.wp-env.json`:
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/tests/unit/wpenv-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .wp-env.json src/tests/unit/wpenv-config.test.ts
git commit -m "[DQP] feat(test-env): configure mu-plugins mappings in wp-env (DQP-10)"
```

---

### Task 2: Edge-Case Seed Fixtures

**Files:**
- Modify: `backend/fixtures/seed-catalog.json`
- Test: `src/tests/unit/seed-fixtures.test.ts`

**Interfaces:**
- Consumes: None
- Produces: JSON fixture data consumed by `backend/tools/seed-local-wp.ts`

- [ ] **Step 1: Write failing test verifying seed-catalog.json contains all test cases**

Create `src/tests/unit/seed-fixtures.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('seed-catalog.json fixture data', () => {
  it('contains all required product and coupon edge cases', () => {
    const fixturePath = path.resolve(process.cwd(), 'backend/fixtures/seed-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Products check
    const slugs = catalog.products.map((p: any) => p.slug);
    expect(slugs).toContain('e27-vintage-edison-led-filament-bulb-4w-amber'); // normal stock
    expect(slugs).toContain('out-of-stock-replacement-lamp'); // 0 stock
    expect(slugs).toContain('low-stock-dimmable-spotlight-bulb'); // low stock (<5)
    expect(slugs).toContain('verified-low-stock-gu10-halogen-bulb'); // verified low stock bypass

    // Coupons check
    const codes = catalog.coupons.map((c: any) => c.code);
    expect(codes).toContain('THANKYOU10'); // valid coupon
    expect(codes).toContain('EXPIRED20');  // expired coupon
    expect(codes).toContain('LIMITREACHED'); // max usage reached
    expect(codes).toContain('MINSPEND50');  // min spend threshold
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/tests/unit/seed-fixtures.test.ts`
Expected: FAIL (missing product and coupon edge cases).

- [ ] **Step 3: Expand backend/fixtures/seed-catalog.json with edge-case products & coupons**

Update `backend/fixtures/seed-catalog.json` with all required catalog items (including `_bypass_low_stock_guard: "yes"` and specific coupon restrictions).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/tests/unit/seed-fixtures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/fixtures/seed-catalog.json src/tests/unit/seed-fixtures.test.ts
git commit -m "[DQP] feat(test-env): add comprehensive edge-case seed fixtures (DQP-10)"
```

---

### Task 3: Deterministic WP-CLI Seeding Engine

**Files:**
- Modify: `backend/tools/seed-local-wp.ts`
- Test: `src/tests/unit/seed-engine.test.ts`

**Interfaces:**
- Consumes: `backend/fixtures/seed-catalog.json`, `@wordpress/env` CLI
- Produces: Populated local WooCommerce database and local `.env.test.local` credentials

- [ ] **Step 1: Write unit test for seed engine helper functions**

Create `src/tests/unit/seed-engine.test.ts` testing argument builders, coupon transformation, and environment credential writer.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/tests/unit/seed-engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement seed engine in backend/tools/seed-local-wp.ts**

Implement:
1. Docker container connectivity check.
2. WP-CLI commands execution (`wp option update woocommerce_currency GBP`, tax configuration, shipping zone setup).
3. Creation/injection of deterministic API keys: `ck_local_test` and `cs_local_test`.
4. Deterministic upserting of categories, products, and coupons from `seed-catalog.json`.
5. Automatic generation of `.env.test.local`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/tests/unit/seed-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tools/seed-local-wp.ts src/tests/unit/seed-engine.test.ts
git commit -m "[DQP] feat(test-env): implement deterministic WP-CLI seeding engine (DQP-10)"
```

---

### Task 4: Zero-Dependency Local Stripe Webhook Simulator

**Files:**
- Create: `backend/tools/simulate-stripe-webhook.ts`
- Test: `src/tests/unit/simulate-stripe-webhook.test.ts`

**Interfaces:**
- Consumes: CLI flags (`--event`, `--orderId`, `--pi`, `--amount`, `--secret`)
- Produces: Signed HTTP POST request to `http://localhost:3000/api/webhooks/stripe`

- [ ] **Step 1: Write failing unit test for signature generator and payload builder**

Create `src/tests/unit/simulate-stripe-webhook.test.ts`:
Test that `buildSignedWebhookPayload(event, secret)` generates a valid Stripe signature matching Stripe's HMAC-SHA256 standard (`t=...,v1=...`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/tests/unit/simulate-stripe-webhook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement backend/tools/simulate-stripe-webhook.ts**

Implement:
1. Cryptographic HMAC-SHA256 signature calculation using `crypto.createHmac`.
2. Event templates for `payment_intent.succeeded` and `payment_intent.payment_failed`.
3. CLI argument parsing and HTTP dispatcher.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/tests/unit/simulate-stripe-webhook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tools/simulate-stripe-webhook.ts src/tests/unit/simulate-stripe-webhook.test.ts
git commit -m "[DQP] feat(test-env): add zero-dependency stripe webhook simulator (DQP-10)"
```

---

### Task 5: Contributor Runbook, NPM Scripts & Documentation

**Files:**
- Create: `docs/testing.md`
- Modify: `package.json`
- Modify: `README.md`
- Test: `src/tests/unit/scripts-doc.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4 deliverables
- Produces: Standardized npm scripts and developer runbook

- [ ] **Step 1: Write test verifying package.json scripts exist**

Create `src/tests/unit/scripts-doc.test.ts`:
Verify that `test:env:setup`, `test:env:start`, `test:env:seed`, `test:env:stop`, and `test:webhook` exist in `package.json`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/tests/unit/scripts-doc.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add scripts to package.json, write docs/testing.md, and update README.md**

1. Add npm scripts to `package.json`.
2. Write comprehensive `docs/testing.md` guide covering prerequisites, quickstart, manual testing, webhook simulation, and troubleshooting.
3. Link `docs/testing.md` in `README.md`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/tests/unit/scripts-doc.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full test suite and typecheck**

Run:
```bash
npm run typecheck
npm run test:coverage
```
Expected: All tests pass, changed line coverage >= 80%.

- [ ] **Step 6: Commit**

```bash
git add package.json docs/testing.md README.md src/tests/unit/scripts-doc.test.ts
git commit -m "[DQP] docs(testing): add contributor test runbook and npm scripts (DQP-10)"
```
