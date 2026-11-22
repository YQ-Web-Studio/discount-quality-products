# Ultra-Lean PR Template, Automated Playwright Visual Evidence & Agent PR Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize a bloat-free Ultra-Lean PR template across all 6 YQ Web Studio repositories, implement automated Playwright desktop/mobile visual capture, onboard `yqwebstudio` into studio governance, and author a global mandatory `automated-pr-creator` Antigravity skill.

**Architecture:** A lightweight Node/Playwright CLI script (`scripts/capture-pr-evidence.mjs`) detects UI file diffs and captures headless desktop & mobile snapshots into `.github/pr-evidence/`, outputting a pre-formatted markdown table. An Ultra-Lean 16-line `.github/pull_request_template.md` replaces legacy 60+ line boilerplate across all 6 repos. A global Antigravity skill (`automated-pr-creator`) orchestrates testing, visual capture, 100% pre-filled template assembly, Gate 3 human confirmation, and `gh pr create` invocation.

**Tech Stack:** Node.js (ESM), Playwright, GitHub CLI (`gh`), Git, Atlassian Jira Cloud REST API, Atlassian Confluence Cloud REST API (Space: `ENG`).

**Spec:** [docs/superpowers/specs/2026-11-22-pr-template-and-visual-automation-design.md](file:///c:/Development/DQP/discount-products-store/docs/superpowers/specs/2026-11-22-pr-template-and-visual-automation-design.md)

## Global Constraints
- Target Repositories (All 6):
  1. `c:\Development\DQP\discount-products-store`
  2. `c:\Development\MosqueMap`
  3. `c:\Development\muslim-atlas-website`
  4. `c:\Development\Faizan-e-Madina\masjid-backend`
  5. `c:\Development\Faizan-e-Madina\faizan-e-madina-website`
  6. `c:\Development\yq-digital-portfolio-main` (`yqwebstudio`)
- Mandatory Invariant: The `automated-pr-creator` skill MUST ALWAYS be used whenever any PR is made across all repositories. Manual or blank PRs are strictly forbidden.
- Jira Issue: `YQWS-2` (Story Points: 3, Assignee: Yusuf Qureshi).
- Cloud ID: `28d4c972-e577-4ff2-b3b0-4590408ed2a5`.
- Confluence Space: `ENG` (Space ID: `1507331`).

---

## File Structure Map

### DQP (`c:\Development\DQP\discount-products-store`)
- Create: `scripts/capture-pr-evidence.mjs` (Playwright visual capture runner)
- Modify: `package.json` (Add `"pr:evidence"` script)
- Modify: `.github/pull_request_template.md` (Replace with Ultra-Lean template)
- Modify: `Coding.md` (Document Mandatory PR Skill Rule)

### Muslim Atlas Mobile App (`c:\Development\MosqueMap`)
- Modify: `.github/pull_request_template.md` (Replace with Ultra-Lean template)
- Modify: `AGENTS.md` (Document Mandatory PR Skill Rule)

### Muslim Atlas Website (`c:\Development\muslim-atlas-website`)
- Modify: `.github/pull_request_template.md` (Replace with Ultra-Lean template)
- Modify: `AGENTS.md` (Document Mandatory PR Skill Rule)

### FMMS Backend (`c:\Development\Faizan-e-Madina\masjid-backend`)
- Modify: `.github/pull_request_template.md` (Replace with Ultra-Lean template)

### FMMS Frontend (`c:\Development\Faizan-e-Madina\faizan-e-madina-website`)
- Modify: `.github/pull_request_template.md` (Replace with Ultra-Lean template)

### YQ Web Studio Website (`c:\Development\yq-digital-portfolio-main`)
- Create: `.coderabbit.yaml` (Baseline + Next.js / Tailwind review rules)
- Create: `.github/pull_request_template.md` (Ultra-Lean template)
- Create: `scripts/capture-pr-evidence.mjs` (Playwright visual capture runner)
- Modify: `package.json` (Add `"pr:evidence"` script)
- Create: `AGENTS.md` (Governance rules, Dual Approval Gate, Mandatory PR Skill Rule)

### Global Antigravity Skill (`C:\Users\yusuf\.gemini\config\skills\automated-pr-creator`)
- Create: `SKILL.md` (Autonomous PR creation skill with mandatory trigger)

---

## Tasks

### Task 1: Jira Ticket `YQWS-2` Governance Setup

**Files / Tools:**
- Atlassian MCP: `createJiraIssue`
- Atlassian MCP: `editJiraIssue`
- Atlassian MCP: `transitionJiraIssue`

- [x] **Step 1: Create Jira ticket `YQWS-2`**
  Summary: `[YQWS] Standardize Ultra-Lean PR Template, Automated Playwright Visual Capture & Agent PR Creator`
  Project: `YQWS`
  IssueType: `Task`
  Priority: `High`

- [x] **Step 2: Assign Story Points (3) & Yusuf Qureshi**
  Set `customfield_10040: 3` via `editJiraIssue`.
  Assign to Yusuf Qureshi (`712020:98d9482e-abab-48e5-b320-a294cd61ea14`).

- [x] **Step 3: Transition `YQWS-2` to `In Progress`**
  Transition ID: `31` (`In Progress`).

---

### Task 2: Create Playwright Automated Visual Evidence Capture Script

**Files:**
- Create: `c:\Development\DQP\discount-products-store\scripts\capture-pr-evidence.mjs`
- Modify: `c:\Development\DQP\discount-products-store\package.json`

**Interfaces:**
- CLI Output: Markdown table with embedded image links or `N/A (backend-only)`.
- File Output: Screenshots saved in `.github/pr-evidence/`.

- [x] **Step 1: Write `scripts/capture-pr-evidence.mjs` in DQP**
  The script:
  1. Inspects git diff (`git diff --name-only origin/main...HEAD` or working tree) to detect modified UI routes or components.
  2. If visual files (`.tsx`, `.jsx`, `.css`, `app/`, `components/`) are modified:
     - Connects to local dev server or target route.
     - Launches Playwright Chromium headless.
     - Captures targeted screenshots of the specific altered UI/component (adapting viewport to where the fix/feature lives).
     - Saves optimized images to `.github/pr-evidence/`.
     - Returns markdown table detailing the change demonstrated.
  3. If no visual files are touched:
     - Prints `N/A (Backend/logic change - no UI modifications)`.

- [x] **Step 2: Add `"pr:evidence"` script to DQP `package.json`**
  ```json
  "scripts": {
    "pr:evidence": "node scripts/capture-pr-evidence.mjs"
  }
  ```

- [x] **Step 3: Test dry run of `capture-pr-evidence.mjs`**
  Run: `npm run pr:evidence`
  Verify expected output.

---

### Task 3: Rollout Ultra-Lean PR Template Across All 6 Repositories

**Files:**
- Modify/Create:
  1. `c:\Development\DQP\discount-products-store\.github\pull_request_template.md`
  2. `c:\Development\MosqueMap\.github\pull_request_template.md`
  3. `c:\Development\muslim-atlas-website\.github\pull_request_template.md`
  4. `c:\Development\Faizan-e-Madina\masjid-backend\.github\pull_request_template.md`
  5. `c:\Development\Faizan-e-Madina\faizan-e-madina-website\.github\pull_request_template.md`
  6. `c:\Development\yq-digital-portfolio-main\.github\pull_request_template.md`

- [x] **Step 1: Deploy Ultra-Lean PR template content**
  ```markdown
  ## Summary
  <!-- Concise bullet points on what was changed and why -->
  - 

  ## Linked Jira Ticket
  - Jira: [TICKET-KEY](https://yqwebstudio.atlassian.net/browse/TICKET-KEY)

  ## Visual Evidence
  <!-- Targeted visual proof showcasing the fix or new feature (or 'N/A') -->
  | Change Demonstrated | Preview |
  | :--- | :--- |
  | <!-- e.g. Coupon discount applied correctly at checkout --> | <!-- image / video link --> |

  ## Test Verification
  - [x] Unit / Integration Tests: `passed`
  ```

- [x] **Step 2: Verify all 6 template files exist and match**

---

### Task 4: Onboard `yqwebstudio` into Studio Governance

**Files:**
- Create: `c:\Development\yq-digital-portfolio-main\.coderabbit.yaml`
- Create: `c:\Development\yq-digital-portfolio-main\scripts\capture-pr-evidence.mjs`
- Create: `c:\Development\yq-digital-portfolio-main\AGENTS.md`
- Modify: `c:\Development\yq-digital-portfolio-main\package.json`

- [x] **Step 1: Create `c:\Development\yq-digital-portfolio-main\.coderabbit.yaml`**
  Deploy baseline with `knowledge_base.jira` (`DQP`, `MA`, `FMMS`, `YQWS`), out-of-scope non-blocking rule, and Next.js / Tailwind review guidelines.

- [x] **Step 2: Deploy `scripts/capture-pr-evidence.mjs` and npm script**
  Copy visual capture script and add `"pr:evidence"` to `package.json`.

- [x] **Step 3: Create `AGENTS.md` in `yqwebstudio`**
  Document the Dual Approval Gate and the Mandatory PR Skill Rule.

---

### Task 5: Author Global Antigravity Agent Skill (`automated-pr-creator`)

**Files:**
- Create: `C:\Users\yusuf\.gemini\config\skills\automated-pr-creator\SKILL.md`
- Modify: `c:\Development\DQP\discount-products-store\Coding.md`
- Modify: `c:\Development\MosqueMap\AGENTS.md`
- Modify: `c:\Development\muslim-atlas-website\AGENTS.md`

- [x] **Step 1: Write `C:\Users\yusuf\.gemini\config\skills\automated-pr-creator\SKILL.md`**
  Define the complete autonomous PR creation procedure:
  - Trigger: MANDATORY on any PR creation.
  - Step 1: Detect branch & Jira issue.
  - Step 2: Run test suite and extract results.
  - Step 3: Run `npm run pr:evidence` if UI files changed.
  - Step 4: Assemble 100% pre-filled Ultra-Lean PR markdown.
  - Step 5: Present Gate 3 review to Yusuf Qureshi.
  - Step 6: Execute `gh pr create` with base `main`.

- [x] **Step 2: Update repository guides with the Mandatory Invariant**
  In `Coding.md` and `AGENTS.md`, add:
  *"MANDATORY: Whenever any PR is created, the agent MUST invoke the automated-pr-creator skill. Manual or blank PRs are strictly forbidden."*

---

### Task 6: End-to-End Verification, Confluence & Ticket Completion

**Files / Tools:**
- Atlassian MCP: `updateConfluenceContent`
- Atlassian MCP: `addOrEditJiraIssueComment`
- Atlassian MCP: `transitionJiraIssue`

- [x] **Step 1: Test `capture-pr-evidence.mjs` and dry-run output**
- [x] **Step 2: Update Confluence Page `9732097` with the new Ultra-Lean PR standard and `automated-pr-creator` skill invariant**
- [x] **Step 3: Post completion comment on `YQWS-2` and transition to `Done`**
