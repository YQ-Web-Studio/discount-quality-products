# Ultra-Lean PR Template, Automated Playwright Visual Evidence & Agent PR Automation Design

**Author:** Yusuf Qureshi (Lead Engineer)  
**Date:** 2026-11-22  
**Status:** In Review  
**Jira Issue:** `YQWS-2` (Proposed, 3 Story Points)  
**Target Scope:** All 6 YQ Web Studio Repositories:
1. `c:\Development\DQP\discount-products-store` (`DQP`)
2. `c:\Development\MosqueMap` (`MA` App)
3. `c:\Development\muslim-atlas-website` (`MA` Web)
4. `c:\Development\Faizan-e-Madina\masjid-backend` (`FMMS` Strapi)
5. `c:\Development\Faizan-e-Madina\faizan-e-madina-website` (`FMMS` Web)
6. `c:\Development\yq-digital-portfolio-main` (`YQWS` Website)

---

## 1. Problem Statement & Motivation

1. **Current PR Template Bloat**: The existing `.github/pull_request_template.md` contains 61 lines of verbose boilerplate, including obsolete rules (e.g. `generateStaticParams never returns []`), AI agent disclosure questionnaires, manual type-of-change checkboxes, runbook placeholders, and duplicate checklists that developers and agents often leave empty or fill inconsistently.
2. **Missing Visual Evidence**: Reviewing UI changes requires visual validation (desktop & mobile screenshots / video). Currently, developers must manually open a browser, take screenshots, crop them, save them, and upload them, which is friction-heavy and often skipped.
3. **Manual PR Creation Friction**: When agents or developers create PRs, templates are either unpopulated or require extensive manual markdown editing.
4. **Scope Gap (`yqwebstudio`)**: The agency website repository (`YQ-Web-Studio/yqwebstudio`) lacks standard PR templates and CodeRabbit configuration.

---

## 2. Architectural Design & Deliverables

### 2.1 The Ultra-Lean PR Template (`.github/pull_request_template.md`)

A unified 16-line template with zero fluff, designed for 100% automated population:

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
- [x] Unit / Integration Tests: `passed` (e.g. 12/12 passed)
- [x] E2E / Smoke Tests: `passed`
```

---

### 2.2 Automated Visual Evidence Capture with Playwright

For web applications (`DQP`, `Muslim Atlas Web`, `FMMS Frontend`, `yqwebstudio`), a lightweight script `scripts/capture-pr-evidence.mjs` will be deployed:

1. **Change-Focused Evidence Strategy**:
   - The primary goal of visual evidence is **showcasing the fix or new feature in action**, rather than capturing generic boilerplate pages across arbitrary viewports.
   - The capture script inspects `git diff --name-only origin/main...HEAD` to identify the specific modified routes, components, or screens.
   - Viewport is tailored to where the change takes place (e.g., mobile viewport for mobile layout fixes, desktop for wide dashboard changes, or both only when responsive behavior is specifically altered).
   - Captures targeted screenshots/recordings of the altered UI state, saving clean WebP/PNG assets into `.github/pr-evidence/`.
   - Automatically populates the markdown table with a concise description of what the screenshot demonstrates.
   - If only backend logic, API endpoints, migrations, or configurations are changed, it emits `N/A (Backend/Logic change - no UI modifications)` without spinning up browsers.
2. **Mobile App (`MosqueMap`)**:
   - Detects React Native UI changes (`src/components/`, `src/screens/`).
   - Uses device/emulator capture or component snapshot output to demonstrate the mobile fix.

---

### 2.3 Global Antigravity Agent Skill (`automated-pr-creator`)

Installed at `C:\Users\yusuf\.gemini\config\skills\automated-pr-creator\SKILL.md`:

#### MANDATORY USAGE INVARIANT (HARD-GATE):
> **The `automated-pr-creator` skill MUST ALWAYS be used whenever any Pull Request is created across all repositories.**  
> Manual or ad-hoc PR creation without this skill is strictly prohibited. Every PR opened in the organization must pass through this skill to guarantee:
> 1. Complete Ultra-Lean template population (zero empty placeholders).
> 2. Automated visual evidence (Playwright screenshots for UI changes, or explicit backend N/A tag).
> 3. Verification test metrics attached.
> 4. Mandatory Gate 3 human review confirmation before executing `gh pr create`.

Whenever an agent completes a task or is instructed to open a PR:
1. **Context Extraction**:
   - Extracts ticket key (`DQP-XX`, `MA-XX`, `FMMS-XX`, `YQWS-XX`) from the git branch name.
   - Queries Jira issue metadata (summary, acceptance criteria) via Atlassian MCP.
2. **Testing**:
   - Runs the repository's test command (`npm test`) and parses test metrics.
3. **Visual Capture**:
   - Executes `node scripts/capture-pr-evidence.mjs`.
4. **Draft PR Payload**:
   - Compiles the Ultra-Lean PR body, fully pre-filled with real summary bullets, Jira link, visual table, and test results.
5. **Gate 3 Human Confirmation**:
   - Displays the PR title, branch, and formatted body to Yusuf Qureshi for approval.
6. **Execution**:
   - Commits any new visual evidence to the feature branch.
   - Calls `gh pr create --title "..." --body "..." --base main`.
   - Reports the live PR URL.

---

### 2.4 Onboarding `yqwebstudio` into Portfolio Governance
1. Deploy `.coderabbit.yaml` to `c:\Development\yq-digital-portfolio-main` with:
   - `knowledge_base.jira` (`DQP`, `MA`, `FMMS`, `YQWS`).
   - `reviews.pre_merge_checks.issue_assessment.mode: warning`.
   - Strict out-of-scope non-blocking rule.
   - Next.js & Tailwind architectural guidelines.
2. Deploy the Ultra-Lean `.github/pull_request_template.md`.
3. Add `scripts/capture-pr-evidence.mjs` and npm script `npm run pr:evidence`.

---

## 3. Implementation Plan & Work Breakdown

- **Phase 1 (Jira & Governance)**:
  - Create Jira ticket `YQWS-2` with 3 Story Points and assign to Yusuf Qureshi.
- **Phase 2 (Playwright Capture Script)**:
  - Develop `scripts/capture-pr-evidence.mjs` in DQP.
  - Test UI detection, dev server connection, screenshot capture, and markdown output.
- **Phase 3 (Template Rollout Across All 6 Repos)**:
  - Deploy Ultra-Lean `.github/pull_request_template.md` to DQP, MosqueMap, Muslim Atlas Web, FMMS Backend, FMMS Frontend, and yqwebstudio.
  - Deploy `.coderabbit.yaml` to `yqwebstudio`.
- **Phase 4 (Global Antigravity Skill)**:
  - Author `C:\Users\yusuf\.gemini\config\skills\automated-pr-creator\SKILL.md`.
  - Add npm script helpers (`npm run pr:create` / `npm run pr:evidence`) to web repositories.
- **Phase 5 (Verification & Documentation)**:
  - Run end-to-end dry run creating a test PR payload.
  - Update Confluence Space `ENG` documentation.
  - Transition `YQWS-2` to `Done`.
