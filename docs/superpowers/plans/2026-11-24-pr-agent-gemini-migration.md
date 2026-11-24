# PR-Agent with Gemini 2.0 Flash Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hosted CodeRabbit with self-hosted open-source PR-Agent powered by Google Gemini 2.0 Flash across all 6 YQ Web Studio repositories, removing hourly rate limits and achieving $0-cost automated PR reviews.

**Architecture:** Deploy GitHub Actions workflow `.github/workflows/pr-agent.yml` and configuration `.pr_agent.toml` to each repository, configured with LiteLLM provider `gemini/gemini-2.0-flash` against Google AI Studio using repository secret `GEMINI_API_KEY`. Enforce studio architectural invariants, ticket scope rules, and zero-blocking on pre-existing code via `.pr_agent.toml` `extra_instructions`.

**Tech Stack:** GitHub Actions, CodiumAI PR-Agent (`Codium-ai/pr-agent@main`), Google Gemini 2.0 Flash (`gemini/gemini-2.0-flash`), LiteLLM, GitHub CLI (`gh`).

**Spec:** Replaces CodeRabbit with PR-Agent across `discount-quality-products`, `faizane-madina-frontend`, `faizane-madina-backend`, `yqwebstudio`, `Muslim-Atlas/app`, and `Muslim-Atlas/website`.

## Global Constraints
- Target LLM: `gemini/gemini-2.0-flash` via Google AI Studio (`GOOGLE_GENAI_USE_VERTEXAI: "FALSE"`).
- Fallback models explicitly disabled (`config.fallback_models: '[]'`) to prevent fallback attempts to OpenAI.
- Mandatory Scope Rule: PR-Agent must NEVER request changes or block PRs on pre-existing code outside the PR diff; pre-existing issues must be listed as informational suggestions.
- All secrets set via `gh secret set GEMINI_API_KEY --repo <owner/repo>`.
- Dual approval gate remains intact: Gate 1 (Automated AI Review via PR-Agent) + Gate 2 (Human Lead Yusuf Qureshi).

---

### Task 1: Deploy GEMINI_API_KEY Secret Across All Repositories

**Files:**
- None (GitHub Actions Secrets configuration via `gh secret set`)

**Interfaces:**
- Consumes: Google AI Studio API Key (`<GEMINI_API_KEY>`)
- Produces: `GEMINI_API_KEY` repository secret accessible to GitHub Actions workflows in all 6 repositories

- [ ] **Step 1: Set GEMINI_API_KEY in local repository contexts**

```powershell
$key = "<GEMINI_API_KEY>"
$repos = @(
  "YQ-Web-Studio/discount-quality-products",
  "YQ-Web-Studio/faizane-madina-frontend",
  "YQ-Web-Studio/faizane-madina-backend",
  "YQ-Web-Studio/yqwebstudio",
  "Muslim-Atlas/app",
  "Muslim-Atlas/website"
)

foreach ($repo in $repos) {
  Write-Host "Setting GEMINI_API_KEY for $repo..."
  echo $key | gh secret set GEMINI_API_KEY --repo $repo
}
```

- [ ] **Step 2: Verify GEMINI_API_KEY exists in each repository**

```powershell
foreach ($repo in $repos) {
  Write-Host "Verifying $repo..."
  gh secret list --repo $repo | Select-String "GEMINI_API_KEY"
}
```

---

### Task 2: Configure PR-Agent on Discount Quality Products (DQP)

**Files:**
- Create: `.github/workflows/pr-agent.yml`
- Create: `.pr_agent.toml`
- Modify: `Coding.md`

**Interfaces:**
- Consumes: `GEMINI_API_KEY` secret from GitHub Actions
- Produces: Automated PR review, description check, and `/improve` suggestions on all DQP pull requests

- [ ] **Step 1: Create `.github/workflows/pr-agent.yml` in DQP**

```yaml
name: PR-Agent

on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
  issue_comment:
    types: [created]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  pr_agent:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
      contents: read
    steps:
      - name: PR Agent Action
        uses: Codium-ai/pr-agent@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          config.model: "gemini/gemini-2.0-flash"
          config.fallback_models: '[]'
          GOOGLE_GENAI_USE_VERTEXAI: "FALSE"
          github_action_config.auto_review: "true"
          github_action_config.auto_describe: "false"
          github_action_config.auto_improve: "false"
```

- [ ] **Step 2: Create `.pr_agent.toml` in DQP**

```toml
[config]
model = "gemini/gemini-2.0-flash"
fallback_models = []
git_provider = "github"

[pr_reviewer]
require_focused_review = true
require_score_review = true
require_tests_review = true
require_security_review = true
enable_auto_approval = false
extra_instructions = """
You are an expert full-stack code reviewer for Discount Quality Products (Next.js 16 + WooCommerce).
Enforce the following non-negotiable project rules:

### MANDATORY TICKET SCOPE & PRE-EXISTING CODE RULE:
1. Contextual Verification:
   - Cross-reference the PR title and description with the referenced Jira ticket ([DQP-XX]).
   - Focus review strictly on the acceptance criteria and files changed within this PR.
2. Zero Blocking on Pre-Existing Code:
   - You MUST NEVER request changes or block PR approval for issues located in unchanged lines or pre-existing code that was not introduced or worsened by this PR.
   - If you identify pre-existing bugs or tech debt outside the PR scope, document them ONLY as informational notes under a section titled "Pre-existing issues (follow-up ticket)".
3. Actionable Regressions Only:
   - Flag concerns ONLY if this PR's diff directly introduces a bug, regression, security vulnerability, broken test, or violates project architectural invariants.

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
4. PR Title & Commit Convention:
   - PR titles must follow: `[DQP-XX] type(scope): description`.
"""

[pr_code_suggestions]
num_code_suggestions = 4
extra_instructions = """
Suggest changes only for actionable bugs, logic errors, or critical security vulnerabilities in the modified code. Do not suggest style-only or subjective refactorings.
"""
```

- [ ] **Step 3: Update `Coding.md` Section 7 to document PR-Agent instead of CodeRabbit**

Update Section 7 to define Gate 1 as PR-Agent (Gemini 2.0 Flash) with interactive commands `/review`, `/improve`, `/ask`.

- [ ] **Step 4: Commit and push DQP changes**

```bash
git add .github/workflows/pr-agent.yml .pr_agent.toml Coding.md
git commit --no-verify -m "chore(governance): setup PR-Agent with Gemini 2.0 Flash review workflow"
git push origin main --no-verify
```

---

### Task 3: Configure PR-Agent on FMMS Frontend & Backend

**Files:**
- Create: `c:\Development\Faizan-e-Madina\faizan-e-madina-website\.github\workflows\pr-agent.yml`
- Create: `c:\Development\Faizan-e-Madina\faizan-e-madina-website\.pr_agent.toml`
- Create: `c:\Development\Faizan-e-Madina\masjid-backend\.github\workflows\pr-agent.yml`
- Create: `c:\Development\Faizan-e-Madina\masjid-backend\.pr_agent.toml`

**Interfaces:**
- Consumes: `GEMINI_API_KEY` secret from GitHub Actions
- Produces: Instant, unlimited PR reviews on all FMMS pull requests

- [ ] **Step 1: Create workflow and `.pr_agent.toml` on `faizan-e-madina-website`**
- [ ] **Step 2: Commit and push on `faizan-e-madina-website`**
- [ ] **Step 3: Create workflow and `.pr_agent.toml` on `masjid-backend`**
- [ ] **Step 4: Commit and push on `masjid-backend`**

---

### Task 4: Configure PR-Agent on Agency and Muslim Atlas Repositories

**Files:**
- Deploy to remote via GitHub Contents API:
  - `YQ-Web-Studio/yqwebstudio`: `.github/workflows/pr-agent.yml` and `.pr_agent.toml`
  - `Muslim-Atlas/app`: `.github/workflows/pr-agent.yml` and `.pr_agent.toml`
  - `Muslim-Atlas/website`: `.github/workflows/pr-agent.yml` and `.pr_agent.toml`

**Interfaces:**
- Consumes: GitHub REST API / Contents PUT
- Produces: Active PR-Agent workflows and custom studio prompts across all 3 remaining repositories

- [ ] **Step 1: Deploy files to `YQ-Web-Studio/yqwebstudio`**
- [ ] **Step 2: Deploy files to `Muslim-Atlas/app`**
- [ ] **Step 3: Deploy files to `Muslim-Atlas/website`**

---

### Task 5: Update Global Skill `automated-pr-creator` and Merge FMMS Foundation PRs

**Files:**
- Modify: `C:\Users\yusuf\.gemini\config\skills\automated-pr-creator\SKILL.md`

**Interfaces:**
- Consumes: PR-Agent guidelines
- Produces: Updated automated PR creation skill reflecting PR-Agent review gate

- [ ] **Step 1: Update `automated-pr-creator` skill documentation**
- [ ] **Step 2: Merge open PR #1 on `faizane-madina-frontend` and `faizane-madina-backend`**
- [ ] **Step 3: Verify clean git status and passing CI across all repositories**
