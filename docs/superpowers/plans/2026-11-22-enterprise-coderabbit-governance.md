# Enterprise CodeRabbit Configuration & Cross-Repository Scope Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize enterprise CodeRabbit configurations across all 5 YQ Web Studio repositories with Jira Knowledge Base integration, strict out-of-scope non-blocking rules, tailored architectural domain instructions, and dual-gate approval documentation.

**Architecture:** Deploy a unified baseline `.coderabbit.yaml` across all repositories featuring `knowledge_base.jira` (supporting `DQP`, `MA`, `FMMS`, `YQWS`), `reviews.pre_merge_checks.issue_assessment.mode: warning`, and a high-priority `path_instructions` SCOPE RULE that blocks CodeRabbit from requesting changes on pre-existing code outside the PR diff. Tailor domain-specific overlays per stack (Mapbox/Adhan for Muslim Atlas, e-commerce idempotency for DQP, timetable JSON safety for FMMS), and publish canonical operational governance to Confluence Space `ENG`.

**Tech Stack:** YAML, CodeRabbit v2 integration schema, Atlassian Jira Cloud REST API, Atlassian Confluence Cloud REST API (Space: `ENG`).

**Spec:** [docs/superpowers/specs/2026-11-22-enterprise-coderabbit-governance-design.md](file:///c:/Development/DQP/discount-products-store/docs/superpowers/specs/2026-11-22-enterprise-coderabbit-governance-design.md)

## Global Constraints
- Target Repositories:
  - `c:\Development\DQP\discount-products-store`
  - `c:\Development\MosqueMap`
  - `c:\Development\muslim-atlas-website`
  - `c:\Development\Faizan-e-Madina\masjid-backend`
  - `c:\Development\Faizan-e-Madina\faizan-e-madina-website`
- CodeRabbit Schema: `https://coderabbit.ai/integrations/schema.v2.json`
- Jira Cloud ID: `28d4c972-e577-4ff2-b3b0-4590408ed2a5`
- Confluence Space: `ENG`
- Jira Ticket: `YQWS-1`

---

## File Structure Map

### DQP (`c:\Development\DQP\discount-products-store`)
- Modify: `.coderabbit.yaml` (Replace legacy config with baseline + DQP payment/WooCommerce overlay; remove stale `generateStaticParams` rule)
- Modify: `Coding.md` (Update Section 1 & Section 7: Document dual approval gate, ticket scoping, and CodeRabbit CLI pre-push verification)

### Muslim Atlas Mobile App (`c:\Development\MosqueMap`)
- Create: `.coderabbit.yaml` (Baseline + Mapbox performance, `expo-location` fallbacks, `adhan` prayer accuracy, offline resilience, listener cleanup)
- Modify: `AGENTS.md` (Document CodeRabbit review standard)

### Muslim Atlas Website (`c:\Development\muslim-atlas-website`)
- Create: `.coderabbit.yaml` (Baseline + Next.js App Router rules, responsive viewport, Turnstile form verification)

### FMMS Backend (`c:\Development\Faizan-e-Madina\masjid-backend`)
- Create: `.coderabbit.yaml` (Baseline + Strapi v5 TypeScript, timetable JSON stringification protection, PM2 reload safety, Playwright API test verification)

### FMMS Frontend (`c:\Development\Faizan-e-Madina\faizan-e-madina-website`)
- Create: `.coderabbit.yaml` (Baseline + React 19 / Vite rules, prayer times countdown / Friday Jummah logic, Swiper/Lightbox cleanup)

### Documentation & Confluence Space `ENG`
- Create Page: `CodeRabbit Review Governance & Multi-Repository Scope Standards` (Space: `ENG`)
- Update Page: `Projects Portfolio (DQP, MA, FMMS)` (Page ID: `1507541`)

---

## Tasks

### Task 1: Update DQP Storefront CodeRabbit Configuration & Coding.md

**Files:**
- Modify: `c:\Development\DQP\discount-products-store\.coderabbit.yaml`
- Modify: `c:\Development\DQP\discount-products-store\Coding.md:180-218`

**Interfaces:**
- Produces: Validated `.coderabbit.yaml` in DQP root with Jira KB integration, scope rule, and payment idempotency overlay.

- [x] **Step 1: Write updated `.coderabbit.yaml` in DQP**
  Update `c:\Development\DQP\discount-products-store\.coderabbit.yaml` with:
  ```yaml
  # yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
  # CodeRabbit Configuration for Discount Quality Products (DQP)
  language: "en-US"
  tone_instructions: "Be concise, rigorous, and direct. Focus on correctness, performance, security, and test quality."

  reviews:
    profile: "chill"
    request_changes_workflow: true
    high_level_summary: true
    poem: false
    review_status: true
    collapse_walkthrough: false
    auto_review:
      enabled: true
      drafts: false
      base_branches:
        - "main"
    pre_merge_checks:
      issue_assessment:
        mode: "warning"

  knowledge_base:
    jira:
      project_keys:
        - "DQP"
        - "MA"
        - "FMMS"
        - "YQWS"

  chat:
    auto_reply: true

  path_instructions:
    - path: "**/*"
      instructions: |
        You are an expert full-stack code reviewer for Discount Quality Products (Next.js 16 + WooCommerce).
        Enforce the following non-negotiable project rules:

        ### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
        1. Contextual Verification:
           - Cross-reference the PR title and description with the referenced Jira ticket.
           - Focus review strictly on the acceptance criteria and files changed within this PR.
        2. Zero Blocking on Pre-Existing Code:
           - You MUST NEVER request changes, post blocking inline comments, or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
           - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY under an informational section in the summary titled "Pre-existing issues (follow-up ticket)".
        3. Actionable Regressions Only:
           - Request changes ONLY if this PR's diff directly introduces a bug, regression, security vulnerability, broken test, or violates project architectural invariants.

        ### PROJECT ARCHITECTURAL INVARIANTS:
        1. Next.js Routing & Dynamic Boundaries:
           - Category and shop pages (`/categories/[slug]/page.tsx`, `/shop/page.tsx`) read `searchParams` and MUST remain dynamic. Do not suggest making them static.
           - Product PDPs (`/products/[slug]/page.tsx`) use on-demand ISR (`dynamicParams = true`, `revalidate = 2592000`).

        2. Payments & Order Integrity:
           - In payment and webhook routes (Stripe `/api/checkout/stripe/*` and PayPal `/api/checkout/paypal/*`), verify strict signature validation, idempotency guards, and duplicate order prevention.
           - Never cancel or downgrade a WooCommerce order that has been captured or completed.
           - Never expose secrets, live API keys, or credentials in client bundles.

        3. WordPress Logic & Versioning:
           - Any backend logic changes must be versioned in `backend/wordpress/snippets/` or `backend/migrations/`.
           - Direct unversioned WordPress changes without code files are not permitted.

        4. Test Quality:
           - Verify that every new feature or bug fix includes covering tests (Vitest / Playwright).
           - Bug fixes must include a regression test reproducing the issue.

        5. PR Title & Commit Convention:
           - PR titles must follow: `[DQP-XX] type(scope): description`.
  ```

- [x] **Step 2: Update `Coding.md` Section 1 and Section 7**
  Update `Coding.md` to document the Dual Approval Gate:
  1. Gate 1 (Automated Review): CodeRabbit AI approval.
  2. Gate 2 (Human Lead Review): Yusuf Qureshi.
  Document that CodeRabbit is scoped to ticket criteria, and explain how to run local verification before pushing.

- [x] **Step 3: Validate DQP formatting and test suite**
  Run in `c:\Development\DQP\discount-products-store`:
  ```bash
  npm run typecheck
  npm test -- order-lifecycle-invariants.test.ts
  ```

---

### Task 2: Create Muslim Atlas Mobile App (`MosqueMap`) CodeRabbit Configuration

**Files:**
- Create: `c:\Development\MosqueMap\.coderabbit.yaml`
- Modify: `c:\Development\MosqueMap\AGENTS.md`

**Interfaces:**
- Produces: `.coderabbit.yaml` in `c:\Development\MosqueMap` enforcing Mapbox performance, `expo-location` fallbacks, `adhan` prayer accuracy, offline resilience, and listener cleanup.

- [x] **Step 1: Create `.coderabbit.yaml` in MosqueMap**
  ```yaml
  # yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
  # CodeRabbit Configuration for Muslim Atlas Mobile App (MosqueMap)
  language: "en-US"
  tone_instructions: "Be concise, rigorous, and direct. Focus on correctness, mobile performance, memory management, and test quality."

  reviews:
    profile: "chill"
    request_changes_workflow: true
    high_level_summary: true
    poem: false
    review_status: true
    collapse_walkthrough: false
    auto_review:
      enabled: true
      drafts: false
      base_branches:
        - "main"
    pre_merge_checks:
      issue_assessment:
        mode: "warning"

  knowledge_base:
    jira:
      project_keys:
        - "DQP"
        - "MA"
        - "FMMS"
        - "YQWS"

  chat:
    auto_reply: true

  path_instructions:
    - path: "**/*"
      instructions: |
        You are an expert React Native, Expo, and Mapbox code reviewer for the Muslim Atlas mobile app.
        Enforce the following non-negotiable project rules:

        ### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
        1. Contextual Verification:
           - Cross-reference the PR title and description with the referenced Jira ticket ([MA-XX]).
           - Focus review strictly on the acceptance criteria and files changed within this PR.
        2. Zero Blocking on Pre-Existing Code:
           - You MUST NEVER request changes, post blocking inline comments, or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
           - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY under an informational section in the summary titled "Pre-existing issues (follow-up ticket)".
        3. Actionable Regressions Only:
           - Request changes ONLY if this PR's diff directly introduces a bug, regression, crash, memory leak, or broken test.

        ### MOBILE & ARCHITECTURAL INVARIANTS:
        1. Mapbox & Rendering Performance:
           - Memoize map pins, marker callouts, and cluster components (`React.memo`, `useMemo`, `useCallback`) to avoid canvas re-render lag on state updates.
           - Ensure Mapbox camera animations use proper bounding boxes and smooth easing.

        2. Location Permissions & Defensive Fallbacks:
           - Handle `expo-location` permissions defensively. Provide graceful fallback UI if location permission is denied or GPS is disabled (never crash or hang).

        3. Prayer Time Calculation Integrity:
           - Verify prayer time calculations using the `adhan` library account for device timezones, daylight saving time (DST), and selected calculation methods (e.g. London Unified, MWL, ISNA).

        4. Offline Resilience & Error Handling:
           - Prevent unhandled promise rejections on network dropouts; support offline cached mosque and halal place lookups.

        5. Memory & Lifecycle Cleanup:
           - Ensure sensor subscriptions (magnetometer/compass), location watchers, and interval timers are strictly cleaned up in `useEffect` return functions when screens unmount.

        6. PR Convention:
           - PR titles must follow: `[MA-XX] type(scope): description`.
  ```

- [x] **Step 2: Update `AGENTS.md` in MosqueMap**
  Add CodeRabbit Review Governance section documenting the dual approval gate.

---

### Task 3: Create Muslim Atlas Website CodeRabbit Configuration

**Files:**
- Create: `c:\Development\muslim-atlas-website\.coderabbit.yaml`

**Interfaces:**
- Produces: `.coderabbit.yaml` in `c:\Development\muslim-atlas-website` enforcing Next.js App Router rules, responsive viewport, and Turnstile form security.

- [x] **Step 1: Create `.coderabbit.yaml` in muslim-atlas-website**
  ```yaml
  # yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
  # CodeRabbit Configuration for Muslim Atlas Website
  language: "en-US"
  tone_instructions: "Be concise, rigorous, and direct. Focus on correctness, responsive design, performance, and accessibility."

  reviews:
    profile: "chill"
    request_changes_workflow: true
    high_level_summary: true
    poem: false
    review_status: true
    collapse_walkthrough: false
    auto_review:
      enabled: true
      drafts: false
      base_branches:
        - "main"
    pre_merge_checks:
      issue_assessment:
        mode: "warning"

  knowledge_base:
    jira:
      project_keys:
        - "DQP"
        - "MA"
        - "FMMS"
        - "YQWS"

  chat:
    auto_reply: true

  path_instructions:
    - path: "**/*"
      instructions: |
        You are an expert Next.js and frontend code reviewer for the Muslim Atlas website.
        Enforce the following non-negotiable project rules:

        ### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
        1. Contextual Verification:
           - Cross-reference the PR title and description with the referenced Jira ticket ([MA-XX]).
           - Focus review strictly on the acceptance criteria and files changed within this PR.
        2. Zero Blocking on Pre-Existing Code:
           - You MUST NEVER request changes, post blocking inline comments, or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
           - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY under an informational section in the summary titled "Pre-existing issues (follow-up ticket)".
        3. Actionable Regressions Only:
           - Request changes ONLY if this PR's diff directly introduces a bug, regression, broken test, or security vulnerability.

        ### FRONTEND & ARCHITECTURAL INVARIANTS:
        1. Form Security:
           - Validate public form submissions with Cloudflare Turnstile token verification.
        2. Responsive Design:
           - Ensure mobile-first responsive viewport layouts and smooth interaction.
        3. PR Convention:
           - PR titles must follow: `[MA-XX] type(scope): description`.
  ```

---

### Task 4: Create FMMS Backend (`masjid-backend`) CodeRabbit Configuration

**Files:**
- Create: `c:\Development\Faizan-e-Madina\masjid-backend\.coderabbit.yaml`

**Interfaces:**
- Produces: `.coderabbit.yaml` in `c:\Development\Faizan-e-Madina\masjid-backend` protecting timetable JSON lifecycle hooks, Strapi TypeScript conventions, and API smoke tests.

- [x] **Step 1: Create `.coderabbit.yaml` in masjid-backend**
  ```yaml
  # yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
  # CodeRabbit Configuration for Faizane Madina Masjid Southend Backend (Strapi v5)
  language: "en-US"
  tone_instructions: "Be concise, rigorous, and direct. Focus on Strapi v5 best practices, TypeScript safety, database integrity, and automated testing."

  reviews:
    profile: "chill"
    request_changes_workflow: true
    high_level_summary: true
    poem: false
    review_status: true
    collapse_walkthrough: false
    auto_review:
      enabled: true
      drafts: false
      base_branches:
        - "main"
    pre_merge_checks:
      issue_assessment:
        mode: "warning"

  knowledge_base:
    jira:
      project_keys:
        - "DQP"
        - "MA"
        - "FMMS"
        - "YQWS"

  chat:
    auto_reply: true

  path_instructions:
    - path: "**/*"
      instructions: |
        You are an expert Strapi v5, TypeScript, and PostgreSQL backend code reviewer for Faizane Madina Masjid Southend.
        Enforce the following non-negotiable project rules:

        ### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
        1. Contextual Verification:
           - Cross-reference the PR title and description with the referenced Jira ticket ([FMMS-XX]).
           - Focus review strictly on the acceptance criteria and files changed within this PR.
        2. Zero Blocking on Pre-Existing Code:
           - You MUST NEVER request changes, post blocking inline comments, or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
           - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY under an informational section in the summary titled "Pre-existing issues (follow-up ticket)".
        3. Actionable Regressions Only:
           - Request changes ONLY if this PR's diff directly introduces a bug, regression, database syntax issue, or broken test.

        ### BACKEND ARCHITECTURAL INVARIANTS:
        1. Timetable JSON Safeguard:
           - Ensure prayer timetable array data remains safely stringified before database write (`beforeCreate`, `beforeUpdate`) to prevent PostgreSQL JSON syntax crashes.
        2. Deployment Safety:
           - Changes must be compatible with PM2 reload (`ecosystem.config.js`) and the automated SSH deployment pipeline.
        3. API Smoke Testing:
           - Any content type or API schema changes must be covered by Playwright API smoke tests in `tests/api/`.
        4. PR Convention:
           - PR titles must follow: `[FMMS-XX] type(scope): description`.
  ```

---

### Task 5: Create FMMS Frontend (`faizan-e-madina-website`) CodeRabbit Configuration

**Files:**
- Create: `c:\Development\Faizan-e-Madina\faizan-e-madina-website\.coderabbit.yaml`

**Interfaces:**
- Produces: `.coderabbit.yaml` in `c:\Development\Faizan-e-Madina\faizan-e-madina-website` protecting timetable countdown math, Friday Jummah display logic, and component cleanliness.

- [x] **Step 1: Create `.coderabbit.yaml` in faizan-e-madina-website**
  ```yaml
  # yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
  # CodeRabbit Configuration for Faizane Madina Masjid Southend Website
  language: "en-US"
  tone_instructions: "Be concise, rigorous, and direct. Focus on React 19 best practices, prayer timetable accuracy, and component cleanliness."

  reviews:
    profile: "chill"
    request_changes_workflow: true
    high_level_summary: true
    poem: false
    review_status: true
    collapse_walkthrough: false
    auto_review:
      enabled: true
      drafts: false
      base_branches:
        - "main"
    pre_merge_checks:
      issue_assessment:
        mode: "warning"

  knowledge_base:
    jira:
      project_keys:
        - "DQP"
        - "MA"
        - "FMMS"
        - "YQWS"

  chat:
    auto_reply: true

  path_instructions:
    - path: "**/*"
      instructions: |
        You are an expert React 19, Vite, and Tailwind CSS code reviewer for the Faizane Madina Masjid Southend website.
        Enforce the following non-negotiable project rules:

        ### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
        1. Contextual Verification:
           - Cross-reference the PR title and description with the referenced Jira ticket ([FMMS-XX]).
           - Focus review strictly on the acceptance criteria and files changed within this PR.
        2. Zero Blocking on Pre-Existing Code:
           - You MUST NEVER request changes, post blocking inline comments, or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
           - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY under an informational section in the summary titled "Pre-existing issues (follow-up ticket)".
        3. Actionable Regressions Only:
           - Request changes ONLY if this PR's diff directly introduces a bug, regression, broken test, or visual defect.

        ### FRONTEND ARCHITECTURAL INVARIANTS:
        1. Prayer Timetable & Friday Logic:
           - Protect timetable countdown calculations, next-prayer timers, and Friday Jummah vs Dhuhr logic (`tests/unit/prayer-times.test.js`).
        2. Swiper & Modal Cleanup:
           - Ensure carousel and lightbox components properly manage event listeners and DOM references on unmount.
        3. PR Convention:
           - PR titles must follow: `[FMMS-XX] type(scope): description`.
  ```

---

### Task 6: Confluence Space `ENG` Documentation Publication

**Files / Tools:**
- Atlassian MCP: `createConfluenceContent`
- Atlassian MCP: `updateConfluenceContent`

**Interfaces:**
- Produces: New canonical handbook page in Confluence Space `ENG`: `CodeRabbit Review Governance & Multi-Repository Scope Standards`.
- Updates: `Projects Portfolio (DQP, MA, FMMS)` (Page ID: `1507541`).

- [x] **Step 1: Publish new canonical Confluence page**
  Title: `CodeRabbit Review Governance & Multi-Repository Scope Standards`
  Body: Detail the Dual Approval Gate, Jira ticket context resolution, non-blocking pre-existing code rules, and stack-specific review instructions.

- [x] **Step 2: Cross-link on Projects Portfolio page**
  Add direct reference on Page `1507541`.

---

### Task 7: Transition `YQWS-1` & Final Verification

**Files / Tools:**
- Atlassian MCP: `transitionJiraIssue`
- Atlassian MCP: `addOrEditJiraIssueComment`

- [x] **Step 1: Verify all 5 `.coderabbit.yaml` files exist and are valid**
- [x] **Step 2: Post completion comment on `YQWS-1` and transition to `Done`**
