# Engineering Workflow Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an industry-standard, £0-cost engineering workflow across the organization, deploying it first to the DQP project with dedicated Jira Kanban integration (`DQP`), pre-commit hooks, automated testing (Vitest, RTL, MSW, Playwright), isolated local WordPress (`@wordpress/env`), and human-gated agent workflows.

**Architecture:** 
1. Jira project `DQP` managed via official Atlassian Remote MCP (`https://mcp.atlassian.com/v1/sse`) with 4-column flow (`To Do → In Progress → In Review → Done`).
2. Central `YQ-Web-Studio/engineering-handbook` repository hosting reusable GitHub Actions workflows, agent skills, and templates.
3. Local pre-commit guards (`husky` + `commitlint`) enforcing `[DQP] type(scope): message (DQP-n)` and blocking direct push to `main`.
4. Testing pyramid with Vitest, MSW, RTL, and Playwright with changed-line coverage gate (>=80%).
5. Isolated local `@wordpress/env` (Docker) for backend mutations, leaving client's Bluehost hosting untouched.
6. Mandatory Human Confirmation Gates on all state-changing agent actions.

**Tech Stack:** Next.js 16, TypeScript, Vitest, React Testing Library, Mock Service Worker (MSW), Playwright, Husky, Commitlint, `@wordpress/env` (Docker), GitHub Actions, Atlassian Remote MCP.

**Spec:** [`docs/specs/2026-10-05-engineering-workflow-design.md`](file:///c:/Development/DQP/discount-products-store/docs/specs/2026-10-05-engineering-workflow-design.md)

## Global Constraints

- Zero additional financial spend (£0.00) across all services and tooling.
- Zero extra resource creation on client's Bluehost account (no Bluehost staging).
- Mandatory Human Confirmation Gates on all external actions (Jira changes, branch pushes, PRs, reviews, merges, production deploys).
- Commit format strictly enforced: `[DQP] type(scope): description (DQP-n)`.
- Test-Driven Development (TDD) mandatory for all code tasks with changed-line coverage >= 80%.

---

### Task 1: Connect & Verify Atlassian Remote MCP in Agent Configuration

**Files:**
- Modify: `C:\Users\yusuf\.gemini\antigravity-ide\mcp_config.json` (or active MCP settings)
- Test: Execute MCP call to list projects and verify `DQP`

**Interfaces:**
- Consumes: Atlassian Remote MCP URL `https://mcp.atlassian.com/v1/sse`
- Produces: Live Atlassian MCP tools available in IDE session for Jira issue management

- [ ] **Step 1: Inspect current MCP configuration**

Read MCP config file to check for existing Jira/Atlassian servers.
Run: Check `C:\Users\yusuf\.gemini\antigravity-ide\mcp_config.json` or query MCP server registry.

- [ ] **Step 2: Add official Atlassian Remote MCP to config**

Configure the official SSE endpoint:
```json
{
  "mcpServers": {
    "atlassian": {
      "url": "https://mcp.atlassian.com/v1/sse"
    }
  }
}
```

- [ ] **Step 3: Trigger OAuth sign-in and authenticate**

Prompt user to authorize with `https://yqwebstudio.atlassian.net` in the browser tab.

- [ ] **Step 4: Verify connection against project `DQP`**

Use MCP tool to query project `DQP`:
Verify: Project exists, issue types (Task, Bug, Story) are available, and board statuses (`To Do`, `In Progress`, `In Review`, `Done`) are returned.

- [ ] **Step 5: Create tracking Jira ticket for Workflow Rollout**

Create initial ticket:
`[DQP-1] Implement organization engineering workflow and testing framework`
Verify: Ticket appears in `To Do` on the DQP Kanban board.

---

### Task 2: Git Pre-Commit Hooks & Commit Conventions (`husky` + `commitlint`)

**Files:**
- Create: `commitlint.config.js`
- Create: `.husky/commit-msg`
- Create: `.husky/pre-push`
- Modify: `package.json`

**Interfaces:**
- Consumes: Git hooks triggered during `git commit` and `git push`
- Produces: Hard rejection of invalid commit messages and blocks direct pushes to `main`

- [ ] **Step 1: Install dev dependencies**

Run: `npm install --save-dev @commitlint/cli @commitlint/config-conventional husky`

- [ ] **Step 2: Create `commitlint.config.js`**

Create `commitlint.config.js` enforcing project prefix:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[([A-Z]+)\]\s+(\w+)(?:\(([^)]+)\))?:\s+(.+)$/,
      headerCorrespondence: ['project', 'type', 'scope', 'subject']
    }
  },
  rules: {
    'header-match-project': [2, 'always']
  },
  plugins: [
    {
      rules: {
        'header-match-project': (parsed) => {
          const { project } = parsed;
          if (!project || project !== 'DQP') {
            return [false, 'Commit header must start with [DQP] (e.g. "[DQP] feat(checkout): add feature (DQP-1)")'];
          }
          return [true];
        }
      }
    }
  ]
};
```

- [ ] **Step 3: Initialize husky and configure `commit-msg` hook**

Run: `npx husky init`
Write `.husky/commit-msg`:
```bash
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 4: Configure `pre-push` hook to block direct push to `main`**

Write `.husky/pre-push`:
```bash
#!/bin/sh
branch="$(git symbolic-ref --short HEAD 2>/dev/null)"

if [ "$branch" = "main" ]; then
  echo "❌ Direct push to 'main' is blocked. Please branch off and open a Pull Request."
  exit 1
fi

npm run lint && npm run typecheck
```

- [ ] **Step 5: Add npm scripts in `package.json`**

Ensure `package.json` includes:
```json
"scripts": {
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 6: Test invalid commit message rejection**

Run test commit with bad format: `git commit -m "invalid commit format"`
Expected: Commit fails with commitlint error.

- [ ] **Step 7: Test valid commit message**

Run valid commit:
```bash
git add commitlint.config.js .husky package.json package-lock.json
git commit -m "[DQP] chore(git): configure commitlint and husky hooks for branch safety (DQP-1)"
```
Expected: Commit succeeds.

---

### Task 3: Pull Request Template & Contributor Standards

**Files:**
- Create: `.github/pull_request_template.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.coderabbit.yaml`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: GitHub PR creation UI & CodeRabbit AI review bot
- Produces: Standardized PR submissions with test evidence, AI usage, and automated review checklist

- [ ] **Step 1: Create `.github/pull_request_template.md`**

Write comprehensive PR template covering:
- Linked Jira Ticket (`DQP-n`)
- Summary of Changes
- Type of Change (feat/fix/refactor/perf/test/docs)
- Backend Changes Checklist (None / PHP Snippet / DB Migration / Runbook)
- Test Evidence (Vitest output & Playwright screenshots)
- AI Agent Usage Declaration
- Definition of Done verification checklist

- [ ] **Step 2: Create `.coderabbit.yaml` configuration**

Create `.coderabbit.yaml` with custom review instructions tailored to DQP:
- Enforce performance rules: `generateStaticParams` in `/products/[slug]/page.tsx` must never return empty array `[]`.
- Enforce security rules: Stripe webhook idempotency, no exposed secrets.
- Enforce test coverage requirements.
- Skip reviewing third-party / generated files.

- [ ] **Step 3: Update `AGENTS.md` with Project Profile and Human Confirmation Gates**

Embed Section 10.2 Mandatory Human Confirmation Gates and project rules directly into `AGENTS.md`.

- [ ] **Step 4: Commit templates and agent guidance**

```bash
git add .github/ .coderabbit.yaml AGENTS.md
git commit -m "[DQP] docs(workflow): add PR template, CodeRabbit configuration, and AGENTS guidance (DQP-1)"
```

---

### Task 4: Unit & Integration Testing Infrastructure (Vitest + RTL + MSW)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/tests/setup.ts`
- Create: `src/tests/mocks/server.ts`
- Create: `src/tests/mocks/handlers.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Frontend utilities, API routes, and components
- Produces: Fast in-memory unit/integration test runner with mocked external endpoints

- [ ] **Step 1: Install Vitest and testing libraries**

Run: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom msw`

- [ ] **Step 2: Create `vitest.config.ts`**

Configure Vitest for Next.js App Router:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts', 'src/tests/**/*'],
    },
  },
});
```

- [ ] **Step 3: Create `src/tests/setup.ts` and MSW mock server**

Set up global DOM matchers and MSW network lifecycle:
```typescript
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 4: Add npm test scripts to `package.json`**

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

- [ ] **Step 5: Write smoke test to verify setup**

Create `src/tests/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Testing Infrastructure Smoke Test', () => {
  it('correctly executes assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run test suite to verify passes**

Run: `npm run test`
Expected: 1 test passes.

- [ ] **Step 7: Commit test infrastructure**

```bash
git add vitest.config.ts src/tests/ package.json package-lock.json
git commit -m "[DQP] test(infra): configure Vitest, RTL, and MSW testing harness (DQP-1)"
```

---

### Task 5: High-Risk Logic Backfill Tests (VAT, Coupons, Stock, Webhooks)

**Files:**
- Create: `src/tests/unit/vat.test.ts`
- Create: `src/tests/unit/stock.test.ts`
- Create: `src/tests/integration/stripe-webhook.test.ts`

**Interfaces:**
- Consumes: Checkout calculations, stock validation logic, and Stripe webhook handler
- Produces: Regression protection over high-risk financial and inventory paths

- [ ] **Step 1: Write unit tests for VAT & 1st Class postage rules**

Write `src/tests/unit/vat.test.ts`:
- Test that 1st class postage is exempted from standard VAT calculations.
- Test standard product VAT calculation (20% standard UK rate).
- Test coupon discount application before/after VAT apportionment.

- [ ] **Step 2: Run VAT tests**

Run: `npx vitest run src/tests/unit/vat.test.ts`
Expected: PASS.

- [ ] **Step 3: Write unit tests for Real-Time Stock verification**

Write `src/tests/unit/stock.test.ts`:
- Test that out-of-stock items reject purchase attempts.
- Test that purchasing items with stock quantity = 0 triggers inventory revalidation.
- Test edge case where requested quantity exceeds available stock.

- [ ] **Step 4: Run Stock tests**

Run: `npx vitest run src/tests/unit/stock.test.ts`
Expected: PASS.

- [ ] **Step 5: Write integration tests for Stripe Webhook duplicate prevention**

Write `src/tests/integration/stripe-webhook.test.ts`:
- Mock Stripe signature verification.
- Test idempotency guard: repeated `checkout.session.completed` events must not create duplicate WooCommerce orders.
- Test handling of invalid signature (returns 400).

- [ ] **Step 6: Run Stripe Webhook integration tests**

Run: `npx vitest run src/tests/integration/stripe-webhook.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit high-risk test suite**

```bash
git add src/tests/
git commit -m "[DQP] test(core): backfill automated tests for VAT, stock guards, and Stripe webhook idempotency (DQP-1)"
```

---

### Task 6: End-to-End Testing Harness (Playwright)

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/checkout-flow.spec.ts`
- Create: `e2e/product-browsing.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Running Next.js server (local or Vercel preview)
- Produces: Full browser journey verification (Search → Cart → Checkout validation)

- [ ] **Step 1: Install Playwright test runner**

Run: `npm install --save-dev @playwright/test`
Run: `npx playwright install --with-deps chromium`

- [ ] **Step 2: Create `playwright.config.ts`**

Configure Playwright with webServer command and failure artifact collection (trace, screenshot):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

- [ ] **Step 3: Write E2E test for Product Search & Browsing**

Write `e2e/product-browsing.spec.ts`:
- Navigate to homepage.
- Perform product search query.
- Verify search results render without client-side errors.

- [ ] **Step 4: Write E2E test for Cart & Checkout Guard**

Write `e2e/checkout-flow.spec.ts`:
- Add in-stock product to cart.
- Verify cart counter updates.
- Navigate to checkout page.
- Verify turnstile/checkout form components mount cleanly.

- [ ] **Step 5: Run Playwright test suite locally**

Run: `npx playwright test`
Expected: PASS.

- [ ] **Step 6: Add npm script and commit Playwright harness**

Update `package.json` with `"test:e2e": "playwright test"`:
```bash
git add playwright.config.ts e2e/ package.json package-lock.json
git commit -m "[DQP] test(e2e): configure Playwright browser testing harness and core journey specs (DQP-1)"
```

---

### Task 7: GitHub Actions CI Pipeline with Changed-Code Coverage Gate

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Pull Requests and pushes to `main`
- Produces: Automated verification status checks (lint, typecheck, vitest, build, playwright)

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

Write GitHub Actions workflow:
```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: Lint, Typecheck & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint commit message
        if: github.event_name == 'pull_request'
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose

      - name: ESLint
        run: npm run lint

      - name: TypeScript Check
        run: npm run typecheck

      - name: Unit & Integration Tests (Coverage)
        run: npm run test:coverage

      - name: Next.js Production Build
        run: npm run build
        env:
          NEXT_PUBLIC_WORDPRESS_API_URL: https://admin.discountproducts.co.uk
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: mock-site-key
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_mock

  e2e:
    name: Playwright E2E Tests
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_WORDPRESS_API_URL: https://admin.discountproducts.co.uk

      - name: Upload Playwright Artifacts on Failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit GitHub Actions workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "[DQP] ci: add automated GitHub Actions pipeline with build and test checks (DQP-1)"
```

---

### Task 8: Isolated Local WordPress Docker Environment (`@wordpress/env`)

**Files:**
- Create: `.wp-env.json`
- Create: `backend/fixtures/seed-catalog.json`
- Create: `backend/tools/seed-local-wp.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Local Docker daemon
- Produces: Instant local WordPress + WooCommerce environment for backend testing with zero Bluehost impact

- [ ] **Step 1: Install `@wordpress/env`**

Run: `npm install --save-dev @wordpress/env`

- [ ] **Step 2: Create `.wp-env.json`**

Configure local WordPress with WooCommerce and Code Snippets pre-installed:
```json
{
  "core": "WordPress/WordPress#6.7",
  "plugins": [
    "https://downloads.wordpress.org/plugin/woocommerce.latest-stable.zip",
    "https://downloads.wordpress.org/plugin/code-snippets.latest-stable.zip"
  ],
  "port": 8888,
  "config": {
    "WP_DEBUG": true,
    "WP_DEBUG_LOG": true
  }
}
```

- [ ] **Step 3: Create seed script for local test catalog**

Write `backend/tools/seed-local-wp.ts` that populates 50 sample products, 5 categories, 2 test coupons, and shipping zones via WooCommerce REST API.

- [ ] **Step 4: Add npm scripts for local backend**

Update `package.json`:
```json
"scripts": {
  "wp:start": "wp-env start",
  "wp:stop": "wp-env stop",
  "wp:seed": "tsx backend/tools/seed-local-wp.ts"
}
```

- [ ] **Step 5: Verify wp-env configuration**

Run syntax and typecheck validation on `backend/tools/seed-local-wp.ts`.

- [ ] **Step 6: Commit local WordPress configuration**

```bash
git add .wp-env.json backend/ package.json package-lock.json
git commit -m "[DQP] feat(backend): configure local @wordpress/env Docker harness and seed fixtures (DQP-1)"
```

---

### Task 9: WordPress as Code Deployment Tools & Drift Detection

**Files:**
- Create: `backend/wordpress/snippets/`
- Create: `backend/migrations/`
- Create: `backend/tools/sync-snippets.ts`
- Create: `backend/tools/drift-check.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Local PHP snippet files and Code Snippets REST API
- Produces: Git-controlled snippet synchronization and drift detection alerts

- [ ] **Step 1: Create snippet directory structure with README**

Create `backend/wordpress/snippets/README.md` defining snippet file header convention:
```php
<?php
/**
 * Snippet Name: VAT Exemption for 1st Class Shipping
 * Description: Prevents standard VAT from applying to Royal Mail 1st Class postage.
 * Scope: global
 * Ticket: DQP-42
 */
```

- [ ] **Step 2: Implement `sync-snippets.ts`**

Write TypeScript CLI script to read local snippet files and update/create them via Code Snippets REST API (`/wp-json/code-snippets/v1/snippets`):
- Accepts `--env=local` or `--env=production`.
- Gated by mandatory confirmation if `--env=production` is passed.
- Checks if snippet already exists by name; updates if present, creates if missing.

- [ ] **Step 3: Implement `drift-check.ts`**

Write script that fetches active snippets from WordPress and compares their code hashes against local repository files:
- Exits 0 if clean.
- Exits 1 and prints diff if snippets were modified out-of-band in WP admin.

- [ ] **Step 4: Add npm scripts**

Update `package.json`:
```json
"scripts": {
  "wp:sync-snippets": "tsx backend/tools/sync-snippets.ts",
  "wp:drift-check": "tsx backend/tools/drift-check.ts"
}
```

- [ ] **Step 5: Commit WordPress as code tools**

```bash
git add backend/ package.json package-lock.json
git commit -m "[DQP] feat(backend): add git-controlled snippet sync tool and drift check runner (DQP-1)"
```

---

### Task 10: Final Review, End-to-End Verification & Merge to Main

**Files:**
- Verify: Full test suite, linting, formatting, and build

- [ ] **Step 1: Run complete verification suite**

Run:
```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```
Verify: All checks pass cleanly with zero warnings or errors.

- [ ] **Step 2: Present PR Payload for Human Confirmation Gate (Gate 3)**

Present to user:
- PR Title: `[DQP] feat(core): implement company-standard engineering workflow and testing framework (DQP-1)`
- PR Summary of changes across testing, git hooks, and backend tools.
- Request user approval to push branch and open Pull Request.

- [ ] **Step 3: Push branch and open Pull Request**

Upon user confirmation:
```bash
git push -u origin docs/engineering-workflow-spec
gh pr create --title "[DQP] feat(core): implement company-standard engineering workflow and testing framework (DQP-1)" --body-file .github/pull_request_template.md
```

- [ ] **Step 4: Verify CI run on Pull Request**

Check `gh pr checks` and confirm all jobs pass.

- [ ] **Step 5: Present Merge Summary for Human Confirmation Gate (Gate 5)**

Confirm CI is green and request user confirmation to squash-merge.

- [ ] **Step 6: Squash-merge to `main`**

Upon user confirmation:
```bash
gh pr merge --squash --delete-branch=false
git checkout main
git pull origin main
```
