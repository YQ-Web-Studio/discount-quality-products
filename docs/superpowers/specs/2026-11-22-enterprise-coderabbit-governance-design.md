# Enterprise CodeRabbit Configuration & Cross-Repository Scope Guard Design Spec

- **Jira Issue:** [YQWS-1](https://yqwebstudio.atlassian.net/browse/YQWS-1) *(Supersedes DQP-6)*
- **Organization:** YQ Web Studio
- **Status:** Approved
- **Authors:** Yusuf Qureshi, Antigravity AI
- **Date:** 2026-11-22

---

## 1. Executive Summary & Problem Statement

### 1.1 Context & Problems Addressed
1. **Unbounded Code Review Scope & Review Bloat**:
   - CodeRabbit frequently requests changes on pull requests across active repositories (`DQP`, `MA`, `FMMS`), flagging issues that pre-date the PR or lie entirely outside the ticket's scope.
   - This bloats PR discussions, causes repeated review cycles on existing legacy code, and blocks tickets from advancing in Jira.
2. **Missing Jira Knowledge Base Integration**:
   - CodeRabbit currently evaluates PR diffs in a vacuum without reading the Jira ticket's explicit acceptance criteria, problem statement, or technical implementation plan.
3. **Stale & Conflicting Repository Rules**:
   - In `discount-products-store`, the legacy `.coderabbit.yaml` contains contradictory instructions (e.g. `generateStaticParams MUST NEVER return an empty array []`), which directly conflicted with the DQP-16 architectural fix that decoupled build-time Bluehost timeouts using on-demand ISR.
4. **Missing Review Infrastructure Across Other Repositories**:
   - Four out of five YQ Web Studio repositories (`MosqueMap`, `muslim-atlas-website`, `masjid-backend`, `faizan-e-madina-website`) currently lack `.coderabbit.yaml` files, resulting in inconsistent code quality standards and unvetted AI reviews.
5. **Workflow Invariance: The Dual Approval Gate**:
   - Human Lead review (Yusuf Qureshi) must never be burdened by unvetted PRs. CodeRabbit must first approve the PR; human code review only begins once CodeRabbit's automated review is green.

### 1.2 Target Objectives
1. **Standardize Universal CodeRabbit Baseline**:
   - Deploy an enterprise-grade `.coderabbit.yaml` across all YQ Web Studio repositories with unified tone, Jira ticket resolution (`DQP`, `MA`, `FMMS`, `YQWS`), `profile: "chill"`, and `reviews.pre_merge_checks.issue_assessment.mode: warning`.
2. **Enforce Mandatory Ticket Scope Rule**:
   - Strictly prohibit CodeRabbit from requesting changes or blocking approval on pre-existing code outside the PR diff. Pre-existing issues are categorized as non-blocking summary notes under *"Pre-existing issues (follow-up ticket)"*.
3. **Repository-Specific Domain Overlays**:
   - Provide tailored, accurate instructions for each repository's real architecture (e.g. Mapbox performance and adhan calculation integrity for Muslim Atlas; payment idempotency and webhook verification for DQP; timetable JSON protection for FMMS).
4. **Formalize Governance in Documentation**:
   - Update `Coding.md` across repositories and publish the canonical standard to Confluence Space `ENG`.

---

## 2. Core Architecture & Universal Baseline

Every repository inherits the following shared configuration foundation:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
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
```

### 2.1 The Mandatory Scope & Pre-Existing Code Rule
Included at the top of every repository's `path_instructions`:

```markdown
### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
1. Contextual Verification:
   - Cross-reference the PR title and description with the referenced Jira ticket.
   - Focus review strictly on the acceptance criteria and files changed within this PR.
2. Zero Blocking on Pre-Existing Code:
   - You MUST NEVER request changes, post blocking inline comments, or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
   - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY under an informational section in the summary titled "Pre-existing issues (follow-up ticket)".
3. Actionable Regressions Only:
   - Request changes ONLY if this PR's diff directly introduces a bug, regression, security vulnerability, broken test, or violates project architectural invariants.
```

---

## 3. Repository-Specific Stack Overlays

### 3.1 Discount Quality Products Storefront (`c:\Development\DQP\discount-products-store`)
- **Stack**: Next.js 16 (App Router), TypeScript, WooCommerce Store API, Stripe, PayPal, Vitest, Playwright.
- **Specific Rules**:
  - **Removed**: Stale rule `generateStaticParams MUST NEVER return an empty array []`.
  - **Payment & Order Invariants**: Verify strict signature validation, idempotency guards, and zero duplicate orders across Stripe (`order-sync`) and PayPal (`capture-order`).
  - **WordPress Logic**: Any backend modifications must be versioned in `backend/wordpress/snippets/` or `backend/migrations/`.
  - **Test Quality**: Require Vitest unit/integration tests and Playwright E2E coverage for new or modified checkout/order flows.
  - **PR Convention**: `[DQP-XX] type(scope): description`.

### 3.2 Muslim Atlas Mobile App (`c:\Development\MosqueMap`)
- **Stack**: React Native, Expo, Mapbox GL / Maps SDK, `adhan` library, Jest.
- **Specific Rules**:
  - **Mapbox & Rendering Performance**: Memoize map pins, marker callouts, and cluster components (`React.memo`, `useMemo`, `useCallback`) to avoid canvas re-render lag.
  - **Location Permissions & Fallback**: Handle `expo-location` permissions defensively. Provide graceful fallback UI if location permission is denied or GPS is disabled.
  - **Prayer Calculation Integrity**: Verify prayer time calculations using `adhan` account for timezones, daylight saving time (DST), and selected calculation methods (e.g. London Unified, MWL, ISNA).
  - **Offline Resilience & Error Handling**: Prevent unhandled promise rejections on network dropouts; support offline cached mosque and halal place lookups.
  - **Lifecycle Cleanup**: Ensure sensor subscriptions (magnetometer/compass), location watchers, and interval timers are strictly cleaned up on screen unmount.
  - **PR Convention**: `[MA-XX] type(scope): description`.

### 3.3 Muslim Atlas Website (`c:\Development\muslim-atlas-website`)
- **Stack**: Next.js (App Router), React, Tailwind CSS, TypeScript.
- **Specific Rules**:
  - **Form Security**: Validate public form submissions with Cloudflare Turnstile token verification.
  - **Responsive Design**: Ensure mobile-first responsive viewport layouts.
  - **PR Convention**: `[MA-XX] type(scope): description`.

### 3.4 Faizane Madina Southend Backend (`c:\Development\Faizan-e-Madina\masjid-backend`)
- **Stack**: Strapi v5, TypeScript, PostgreSQL, PM2, Playwright (API).
- **Specific Rules**:
  - **Timetable JSON Safeguard**: Ensure prayer timetable array data remains safely stringified before database write to prevent PostgreSQL JSON syntax crashes.
  - **Zero-Downtime Deployment**: Changes must be compatible with PM2 reload and the automated SSH deployment pipeline.
  - **API Smoke Testing**: Any content type changes must be covered by Playwright API smoke tests.
  - **PR Convention**: `[FMMS-XX] type(scope): description`.

### 3.5 Faizane Madina Southend Frontend (`c:\Development\Faizan-e-Madina\faizan-e-madina-website`)
- **Stack**: React 19, Vite, Tailwind CSS, Vitest, Playwright (E2E).
- **Specific Rules**:
  - **Prayer & Friday Logic**: Protect timetable countdown math and Friday Jummah display logic.
  - **Component Hygiene**: Ensure Swiper carousel and Lightbox instances properly clean up event listeners on unmount.
  - **PR Convention**: `[FMMS-XX] type(scope): description`.

---

## 4. Workflow Governance & Approval Gates

```mermaid
flowchart LR
    A["Developer / Agent opens PR with [KEY-XX]"] --> B["Automated CI Scanners (Lint, Typecheck, Test, Build)"]
    B -->|Passed| C["CodeRabbit Review (Jira Ticket Scoped)"]
    B -->|Failed| A
    C -->|Changes Requested on PR diff| A
    C -->|Approved (No Blockers)| D["Move Ticket to Code Review"]
    D --> E["Human Lead Review (Yusuf Qureshi)"]
    E -->|Approved| F["Squash & Merge to main"]
```

1. **Gate 1: CI Verification**: Scanners must pass green (`lint`, `typecheck`, `test`, `build`).
2. **Gate 2: CodeRabbit Automated Approval**: CodeRabbit evaluates the diff against the Jira ticket. It requests changes only on regressions introduced by the PR. Once green, it issues an approval.
3. **Gate 3: Human Lead Review**: Yusuf Qureshi conducts the final review and merges the PR. Under no circumstances is a PR reviewed or merged without prior CodeRabbit approval.

---

## 5. Documentation Updates

1. **`Coding.md` (`discount-products-store`)**:
   - Update Section 1 & Section 7 with the revised CodeRabbit governance and Jira ticket context integration.
2. **Confluence Space `ENG`**:
   - Publish a dedicated operational handbook: *CodeRabbit Review Governance & Cross-Repository Scope Standards*.
   - Cross-link in the *Projects Portfolio* page.
