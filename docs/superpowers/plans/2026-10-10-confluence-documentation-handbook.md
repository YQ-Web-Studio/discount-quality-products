# Confluence Documentation & Engineering Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive, production-grade Confluence documentation space and page hierarchy for YQ Web Studio via the Atlassian MCP, covering agency culture, the 6-stage engineering lifecycle, core tech stack, deep-dive DQP architecture, project portfolio (DQP, MA, FMMS), and contributor onboarding.

**Architecture:** Initialize a dedicated Confluence space `ENG` ("YQ Web Studio Engineering") on `https://yqwebstudio.atlassian.net` (`cloudId: 28d4c972-e577-4ff2-b3b0-4590408ed2a5`). Create and publish 6 detailed, beautifully formatted pages using ADF-compliant HTML (panels, tables, code blocks, task lists, and lozenges) via `createConfluenceContent` and `executeWrite` (`createConfluenceSpace`).

**Tech Stack:** Atlassian MCP (`createConfluenceContent`, `createConfluenceSpace`, `getConfluenceSpace`, `searchConfluence`), Next.js 15, TypeScript, Zustand, WooCommerce Store API, Python 3 ingestion engine, Docker `@wordpress/env`, Vitest, Playwright.

**Spec:** [Engineering Workflow Design](file:///c:/Development/DQP/discount-products-store/docs/specs/2026-10-05-engineering-workflow-design.md) & [Coding Standards](file:///c:/Development/DQP/discount-products-store/Coding.md)

## Global Constraints
- Target Atlassian Cloud ID: `28d4c972-e577-4ff2-b3b0-4590408ed2a5` (`https://yqwebstudio.atlassian.net`).
- Target Space Key: `ENG` (Name: "YQ Web Studio Engineering").
- All Confluence page bodies must be author-ready HTML adhering to the Confluence ADF converter schema (panels with `data-type="panel-info"`, code blocks with `<pre><code class="language-...">`, tables with `<th>`/`<td>`, etc.).
- No placeholder content, "TODOs", or fictional APIs. All repository names, paths, Jira ticket keys (`DQP`, `MA`, `FMMS`), and snippet names must be concrete and accurate.
- Pages must cross-link to each other and to Jira project resources.

---

### Task 1: Create Confluence Space `ENG`
**Tools:** `executeWrite` (operation: `createConfluenceSpace`)
**Interfaces:**
- Consumes: `cloudId: "28d4c972-e577-4ff2-b3b0-4590408ed2a5"`, `name: "YQ Web Studio Engineering"`, `key: "ENG"`, `description: "Central engineering documentation, development workflow, architecture deep dives, and onboarding guide for YQ Web Studio."`
- Produces: `spaceId`, `homepageId`, Space URL.

- [ ] **Step 1: Execute `createConfluenceSpace`**
- [ ] **Step 2: Verify Space creation and capture `homepageId` & `spaceId`**

---

### Task 2: Author & Publish Page 1 — Space Homepage: `YQ Web Studio Engineering Handbook`
**Tools:** `updateConfluenceContent` or `createConfluenceContent` under `homepageId`
**Content:**
- Agency identity: YQ Web Studio, Lead/Owner: Yusuf Qureshi.
- Mission & Engineering philosophy (Agent-first, zero-spend efficiency, deterministic quality gates).
- Organization & Repository index (`YQ-Web-Studio/engineering-handbook`, `YQ-Web-Studio/.github`, `Muslim-Atlas/.github`, `DQP`, `MA`, `FMMS`).
- Documentation Roadmap & Navigation Table linking to sub-pages.

- [ ] **Step 1: Author rich HTML body for Handbook Homepage**
- [ ] **Step 2: Publish/Update Confluence Homepage**
- [ ] **Step 3: Verify content rendering and capture page ID**

---

### Task 3: Author & Publish Page 2 — `Engineering Workflow & Quality Lifecycle`
**Tools:** `createConfluenceContent` under `parent: { parentContentId: homepageId }`
**Content:**
- The 6-Stage Jira Lifecycle (`Backlog` → `Ready for Development` → `In Progress` → `Code Review` → `Awaiting Release` → `Released`).
- Strict Status Automation rules (ticket stays `In Progress` while CI/CodeRabbit runs; moves to `Code Review` only when green).
- Branch Naming Specification (`<type>/<TICKET-KEY>-<kebab-slug>`).
- Conventional Commit standards (`[PROJECT] <type>(<scope>): <description> (<TICKET>)`).
- PR standards, template structure, and squash-merge lifecycle with automatic branch cleanup.
- Dual Approval Gate: CodeRabbit (AI reviewer) + Yusuf Qureshi (Human Lead).
- The 6 Mandatory Human Hard-Gates for AI agents.

- [ ] **Step 1: Author rich HTML body for Engineering Workflow**
- [ ] **Step 2: Publish page via `createConfluenceContent`**
- [ ] **Step 3: Verify page creation and capture page ID**

---

### Task 4: Author & Publish Page 3 — `Core Tech Stack & Development Standards`
**Tools:** `createConfluenceContent` under `parent: { parentContentId: homepageId }`
**Content:**
- Frontend: Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS, Zustand.
- Backend: WordPress + WooCommerce, WooCommerce Store API, WP REST API, GraphQL, Code Snippets REST API.
- Testing: Vitest, React Testing Library, Playwright E2E, MSW, changed-line coverage gate (≥80%).
- The 4-Tier Enforcement Hierarchy (Scanner → Hook → Review → Prose).
- Architecture & Performance Rules: PDP static generation (`generateStaticParams` pre-rendering top slugs, never returning `[]`), dynamic `/categories` & `/shop` routes, 15s timeout on `wpFetch`, never calling `notFound()` in catch blocks, granular cache tagging.

- [ ] **Step 1: Author rich HTML body for Core Tech Stack & Standards**
- [ ] **Step 2: Publish page via `createConfluenceContent`**
- [ ] **Step 3: Verify page creation and capture page ID**

---

### Task 5: Author & Publish Page 4 — `DQP Architecture & E-Commerce Subsystems Deep Dive`
**Tools:** `createConfluenceContent` under `parent: { parentContentId: homepageId }`
**Content:**
- Headless Storefront & WooCommerce session model (`wc-session`, Store API nonces).
- Order creation & checkout security guard (`validateCartTotals`).
- Verified Low-Stock Guard & Bypass (`002-verified-stock-guard-bypass.php`): < 5 items enquiry gate, warehouse verification checkbox in product inventory and Quick Edit.
- Dynamic WooCommerce Coupon Engine: validation against Store API cart, percentage vs. fixed cart vs. fixed product discounts.
- Streamed eBay CSV Product Ingestion Engine (`tools/ingestion/engine.py`): row-by-row `DictReader`, Peek auto-detection, SKU image matching, MD5 attachment deduplication, dynamic term creation, 10% price reduction with Decimal.

- [ ] **Step 1: Author rich HTML body for DQP Deep Dive**
- [ ] **Step 2: Publish page via `createConfluenceContent`**
- [ ] **Step 3: Verify page creation and capture page ID**

---

### Task 6: Author & Publish Page 5 — `Projects Portfolio (DQP, MA, FMMS)`
**Tools:** `createConfluenceContent` under `parent: { parentContentId: homepageId }`
**Content:**
- Comprehensive breakdown table comparing all 3 projects.
- **DQP (Discount Quality Products):** E-commerce storefront, Vercel Hobby + Bluehost backend, public repo profile, Jira board `DQP`.
- **MA (Muslim Atlas):** Islamic lifestyle & companion platform, React Native / Expo + EAS + Next.js web, private-free repo profile, Jira board `MA`.
- **FMMS (Faizane Madina Masjid Southend):** Mosque community platform, timetable sync, events, donations, Jira board `FMMS`.

- [ ] **Step 1: Author rich HTML body for Projects Portfolio**
- [ ] **Step 2: Publish page via `createConfluenceContent`**
- [ ] **Step 3: Verify page creation and capture page ID**

---

### Task 7: Author & Publish Page 6 — `New Contributor Onboarding Guide (Zero to Running in 10 Mins)`
**Tools:** `createConfluenceContent` under `parent: { parentContentId: homepageId }`
**Content:**
- Prerequisites (Node.js 20+, Docker Desktop, Git, Atlassian MCP).
- 10-Minute Rapid Setup (Clone, `npm ci`, `.env.local` config, `@wordpress/env` startup).
- Seed Catalog loading & local WordPress credentials.
- Day-to-Day Developer Runbook: Picking a Jira ticket, creating branch, TDD workflow, running verification commands (`npm run typecheck`, `npm test`, `npm run test:e2e`).
- Opening PR, addressing CodeRabbit comments, and Definition of Done.
- Troubleshooting common errors (Store API 400 Bad Request, Bluehost 502/timeouts, Docker port collisions).

- [ ] **Step 1: Author rich HTML body for Contributor Onboarding**
- [ ] **Step 2: Publish page via `createConfluenceContent`**
- [ ] **Step 3: Verify page creation and capture page ID**

---

### Task 8: Interlink, Cross-Reference & Final Site Verification
**Tools:** `updateConfluenceContent`, `getConfluenceContent`, `searchConfluence`
**Content:**
- Update Home page navigation table with exact URLs and titles of the published child pages.
- Ensure all relative anchor links and child page references resolve cleanly.
- Verify page tree structure in Confluence space `ENG`.

- [ ] **Step 1: Update Homepage with direct links to all created pages**
- [ ] **Step 2: Verify complete space structure via `searchConfluence`**
- [ ] **Step 3: Present complete sitemap and URLs to the user**
