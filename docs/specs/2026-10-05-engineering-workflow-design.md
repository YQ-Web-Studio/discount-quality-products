# Engineering Workflow Design (YQ Web Studio / Muslim Atlas)

- **Status:** Draft, awaiting owner review
- **Date:** 2026-10-05
- **Owner:** Yusuf (org owner, final approver)
- **First rollout target:** DQP (`YQ-Web-Studio/discount-quality-products`)
- **Final home:** `YQ-Web-Studio/engineering-handbook/docs/specs/` (moved there once that repo exists)

## 1. Goals and non-goals

### Goals
1. Use a professional, repeatable workflow across all projects: Jira ticket → branch → TDD → PR → CI → (review) → merge → deploy.
2. Contributors can onboard easily: one `CONTRIBUTING.md` and about 10 minutes to a running local environment.
3. **Development is agent-first for everyone.** Every step must be doable by an AI agent to a good standard, and every rule an agent could skip must also be enforced by a machine (CI, hooks or permissions).
4. Nobody except the owner can change production, and that includes the WordPress backend.
5. **Zero additional spend.** Only free tiers of tools already in use, or free tools.

### Non-goals
- Sprints, estimates or deadlines. The boards are Kanban only.
- Full test backfill of legacy code. Only high-risk paths get tests up front.
- A separate staging backend for every branch.
- Detailed rollout for projects other than DQP. They adopt the handbook later, each with its own plan.

## 2. Context (current state of DQP)

- Next.js 16 headless storefront on Vercel (Hobby plan). The backend is WordPress + WooCommerce on Bluehost (`admin.discountproducts.co.uk`).
- All work is committed straight to `main`. There are no tests, no CI, no PR or issue templates and no branch protection.
- Backend code changes are made in the WordPress admin through the **Code Snippets** plugin, so they never appear in any diff.
- Bluehost provides SSH access and one-click staging (not created yet).
- GitHub orgs `YQ-Web-Studio` and `Muslim-Atlas` are both on the **Free** plan. The DQP repo is **public**.

## 3. Organisation structure

### 3.1 Repositories

| Repo | Visibility | Purpose |
|---|---|---|
| `YQ-Web-Studio/engineering-handbook` | Public | **Master copy** of workflow docs, agent skills, reusable GitHub Actions workflows (`workflow_call`), templates, and this spec. Public so that repos in both orgs can call its workflows for free. Contains no project code or secrets. |
| `YQ-Web-Studio/.github` | Public | Default PR and issue templates, `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` for the YQ-Web-Studio org. Synced from the handbook. |
| `Muslim-Atlas/.github` | Private | The same files for the Muslim-Atlas org. Synced from the handbook. |
| Each project repo | Per project | Small `ci.yml` that calls the handbook workflows, `.agents/skills/` (synced), project `AGENTS.md`, `CLAUDE.md` → `@AGENTS.md`. |

Skill sync: a `sync-handbook` script (and GitHub Action in the handbook) opens a PR in each project repo whenever the master skills or templates change. Projects never edit synced files directly; they override behaviour in their own `AGENTS.md`.

### 3.2 Repository profiles

Each repo declares one profile in `AGENTS.md`. Upgrading to a paid plan later just means switching profile.

| Concern | **Public profile** (DQP) | **Private-free profile** (Muslim Atlas) |
|---|---|---|
| Who can see the code | Everyone | Org members + invited collaborators only |
| Contributor access | **Write** collaborator, pushes branches to the main repo | **Read** collaborator, works from a **fork** and opens PRs from it |
| Protecting `main` | GitHub **ruleset**: PR required, required checks, 1 approval, owner on bypass list | **Permissions:** contributors cannot push or merge at all. Only the owner merges. |
| Required CI | Enforced by the ruleset | Enforced by the owner's `merge` skill, which refuses to merge unless all checks are green |
| Production approval gate | GitHub Environment `production` with owner as required reviewer | Production credentials are **never on GitHub**; production deploys run from the owner's machine |
| CI minutes | Unlimited | 2,000 min/month: path filters, `concurrency` cancel, caching, e2e only on ready-for-review PRs |
| AI reviewer | CodeRabbit (free for public repos) | `ai-review` GitHub Action using **GitHub Models** (free quota, `GITHUB_TOKEN`, no training on data); CodeRabbit free gives PR summaries only |
| Hosting deploys | Vercel Git integration | Project-specific (Muslim Atlas uses Expo/EAS) |

## 4. Jira

- **Site:** `https://yqwebstudio.atlassian.net`, **space/project key:** `YQWEB`, so tickets are numbered `YQWEB-123`.
- **Boards:** one Kanban board per project (DQP, …). Boards filter by the **Team** field: each project has a Jira Team, and every ticket must have its Team set.
- **Columns / statuses:** `To Do → In Progress → In Review → Done`. Configuring these is part of rollout if they don't exist yet.
- **Agent access:** the Atlassian official Remote MCP server (`https://mcp.atlassian.com/v1/sse`) with OAuth. Each person connects their own account, so actions are recorded against the right user. No tokens are stored on disk.
- **GitHub link:** the free "GitHub for Jira" app, which shows branches, commits and PRs on tickets via the `YQWEB-n` key.
- **Status automation** (free Jira automation rules, or the skills move tickets through the MCP as a fallback):
  - branch created → In Progress
  - PR opened → In Review
  - PR merged → Done

### 4.1 Ticket template
| Field | Content |
|---|---|
| Type | Story / Bug / Task / Spike |
| Team | Project team (e.g. DQP). **Required.** |
| Summary | Imperative, ≤ 70 chars |
| Description | User story ("As a…, I want…, so that…") or, for bugs, steps to reproduce / expected / actual |
| Acceptance Criteria | Given/When/Then list; every item must be testable |
| Technical Implementation | Files/areas to change, approach, **plus backend changes**: snippet files, migration files, or manual runbook steps for the WordPress admin |
| Backend Changes | `none` / `snippet` / `migration` / `manual-runbook` |
| Test Plan | Unit / integration / e2e tests to add |
| Definition of Done | Standard checklist (§7.3) |

## 5. Git workflow (GitHub Flow)

- `main` is always deployable, and production deploys from `main`.
- **Branches:** `<type>/YQWEB-<n>-<short-slug>`, e.g. `fix/YQWEB-42-vat-exempt`. Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`.
- **Commits** (Conventional Commits with project tag and ticket key):
  ```
  [DQP] fix(checkout): exempt 1st class postage from VAT (YQWEB-42)
  ```
  The `[PROJECT]` tag must match the repo's project code. Enforced by `commitlint` (husky `commit-msg` hook) and checked again in CI.
- **PR title:** the same format, enforced by a CI check. PRs are **squash-merged**, so the PR title becomes the commit on `main`.
- **Branch retention:** branches are **not** deleted automatically. Branches cost nothing; Vercel builds a preview for every push whether a branch is new or reused.
  - Default: a new branch per ticket.
  - Reuse is allowed, but only after `git fetch && git reset --hard origin/main`. Otherwise squash-merged commits come back as phantom changes. The `start-ticket` skill does this automatically.
  - A monthly `branch-report` script lists merged or stale branches. It only reports; it never deletes.
- **Previews:** every PR gets a Vercel preview URL (public profile), and e2e tests run against it.

## 6. Environments and backend (WordPress)

### 6.1 Environments

| | Production | Local / Contributor Dev | CI Environment |
|---|---|---|---|
| WordPress/Woo | `admin.discountproducts.co.uk` (Client hosting) | `@wordpress/env` (Docker) on developer's machine | `@wordpress/env` running in GitHub Actions |
| What it reflects | Released `main` | Developer's active branch | Head commit under test |
| Who changes it | Owner-approved deploy script/action only | Developer | Automated test runners |
| Frontend | Vercel Production | `npm run dev` (reads live catalog for browsing, or local WP for checkout/admin tests) | Vercel Preview (mocked/test endpoints) |
| Payments | Stripe/PayPal **live** | Stripe **test mode**, PayPal **sandbox** | Mocked (MSW) or Stripe test mode |
| Email | Resend, real customers | Resend test key / dev trap | Mocked / dev trap |
| Data | Real live client data | Small committed seed fixture (~50 products, categories, shipping, coupons) | Fresh seeded fixture per run |
| Access | **Owner only** | Anyone locally | Ephemeral CI runner |

- **Zero footprint on client's Bluehost:** We do **NOT** create staging sites or extra databases on Bluehost. The client's host only runs production.
- **Frontend catalog reads:** Pure frontend UI/catalog work can read the public GraphQL catalog directly (`https://admin.discountproducts.co.uk/graphql`), which is public and read-only.
- **Backend / checkout / mutation work:** Any work involving orders, user sessions, coupons, or PHP code runs against local `@wordpress/env`. Contributors never receive live WooCommerce API credentials.
- **Security & isolation:** Contributors have zero access or network paths to Bluehost. All testing is fully reproducible on any machine with Docker.

### 6.2 WordPress changes as code
All backend changes live in the repo and show up in the PR diff:

| Kind | Example | Location | Mechanism |
|---|---|---|---|
| Code snippet | VAT filter, custom endpoint | `backend/wordpress/snippets/<slug>.php` with a header block (name, description, scope, ticket) | Synced to the Code Snippets plugin through its REST API (`/wp-json/code-snippets/v1/snippets`). Snippets are tagged `managed-by-git`. |
| Config/data migration | Shipping zone, Woo setting, coupon | `backend/migrations/NNNN-YQWEB-n-<slug>.ts` | Idempotent script using the WooCommerce/WordPress REST API. Applied migrations are recorded in a WP option, so none runs twice. |
| Manual runbook (last resort) | Settings that can't be scripted | `## Runbook` section in the ticket and PR | Done by hand: staging first, then the owner on production |

**Why the REST API rather than SSH:** Bluehost staging lives on the **same cPanel account** as production, so any SSH key for staging also gives access to production. Application passwords are **per WordPress site**, so a staging credential can't affect production. SSH stays an owner-only tool.

The existing snippets get exported from the plugin into `backend/wordpress/snippets/` and tagged `managed-by-git` (one migration ticket).

### 6.3 Backend deploy flow
```mermaid
flowchart LR
  A["PR adds snippet/migration file"] --> B["CI: php -l, PHPUnit on wp-env, migration dry-run"]
  B --> C["Merge to main"]
  C --> D{"Owner approves deploy"}
  D --> E["Apply to PRODUCTION via Code Snippets REST API / Script"]
```
- Snippets and migrations are validated first on local Docker `@wordpress/env`, then verified in CI.
- Deploying to production is gated strictly on **explicit owner approval**. The production application password is never shared with contributors or third-party bots.
- **Nightly drift check:** compares production snippets and the migration log against the repo. If they differ (e.g. someone edited a snippet directly in the WP admin), it opens a GitHub issue / Jira ticket.

## 7. Review policy

### 7.1 Who needs review
The rule depends only on **which GitHub account opens the PR**, never on whether an agent wrote the code (everyone is expected to use agents):
- **Owner's account** (the owner, or the owner's agent): no review; merge once CI is green.
- **Any other account:** **two reviewers**, the **AI reviewer** (automatic) and the **owner** (human approval).

### 7.2 AI reviewer
- Public profile: **CodeRabbit** free tier, configured with `.coderabbit.yaml` containing the project rules (performance rules, payment safety, WordPress change safety, test quality).
- Private-free profile: the `ai-review` reusable workflow (GitHub Models + the same rules), plus CodeRabbit summaries.
- Before approving, the owner can run the **`code-review` skill**, which reviews the PR against the Jira ticket's acceptance criteria. The bots can't do this because they can't see Jira.

### 7.3 Definition of Done
- [ ] Acceptance criteria met
- [ ] Tests written first (TDD) and passing; changed-line coverage ≥ 80%
- [ ] CI green; required reviews done (contributors)
- [ ] Backend changes validated locally on `@wordpress/env` and CI, then applied to production upon owner approval
- [ ] Docs / `AGENTS.md` updated if behaviour or conventions changed
- [ ] Jira ticket moved to Done with the PR linked

## 8. Testing strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Pure logic: VAT, coupons, shipping, stock rules, price formatting, mappers |
| Component | Vitest + React Testing Library | Cart, checkout form, product card states |
| Integration | Vitest + MSW | API routes with Woo/Stripe/PayPal mocked: webhook signature, idempotency, duplicate-order guards, revalidation |
| E2E | Playwright | Critical user journeys against the Vercel preview (→ staging): browse → cart → checkout with Stripe test card → success; out-of-stock blocked; search; login |
| Backend | `php -l`, PHPUnit on `@wordpress/env` | Snippets load without fatal errors; migrations are idempotent |

Rules:
- Every ticket uses TDD. Every bug fix includes a test that reproduces the bug.
- Coverage gate applies to **changed lines only** (≥ 80%). There is no whole-repo target.
- Tests never touch production services.
- The Stripe webhook is covered by integration tests that use signed test payloads. E2E checks the redirect to the success page.

**Initial backfill** (one ticket each): Stripe webhook route; coupon → Woo sync + 1st class postage VAT exemption; real-time stock check; Playwright checkout happy path + out-of-stock path.

## 9. CI/CD

The reusable workflows in the handbook, called by each project's `ci.yml`:
```mermaid
flowchart LR
  PR["PR opened/updated"] --> T["title + commit lint"]
  PR --> Q["eslint + tsc"]
  PR --> U["vitest + changed-line coverage"]
  PR --> B["next build"]
  PR --> W["backend checks (if backend/** changed)"]
  B --> V["Vercel preview ready"]
  V --> E["Playwright vs preview"]
  T & Q & U & E & W --> G["mergeable"]
```
- Local hooks (husky): `pre-commit` runs lint-staged; `commit-msg` runs commitlint; `pre-push` runs tsc + vitest (related tests).
- Dependabot runs weekly with grouped updates. `npm audit` runs in CI (fails on high/critical).
- GitHub secret scanning + push protection is on.
- Playwright traces and screenshots are uploaded as artifacts when a run fails.
- E2E against protected Vercel previews uses Vercel's "Protection Bypass for Automation" secret.

## 10. Agent skills

Master copies live in the handbook and are synced to `.agents/skills/` in every repo. `AGENTS.md` points every agent (Antigravity, Claude Code, Cursor, Copilot) at them.

| Skill | Responsibility |
|---|---|
| `jira-ticket` | Turns an idea or bug into a ticket using §4.1 (including technical implementation and backend changes). Shows the draft to the human, then creates it through the Atlassian MCP with Team set. |
| `start-ticket` | Fetches the ticket, creates or resets the branch, moves the ticket to In Progress, and comments the plan on Jira. |
| `implement` | TDD → implement → verify. Wraps the superpowers skills (test-driven-development, systematic-debugging, verification-before-completion) and enforces the project rules in `AGENTS.md`. |
| `wp-change` | Writes snippet/migration files, tests them on wp-env or staging, and documents any runbook steps. Never uses production credentials. |
| `open-pr` | Runs the full local check, opens the PR from the template (summary, ticket link, screenshots, backend checklist, test evidence, AI-usage note) and moves the ticket to In Review. |
| `code-review` | Reviews contributor PRs against the ticket's acceptance criteria, correctness, security, tests, performance rules and WordPress safety. Posts inline comments and a verdict; the owner gives final approval. |
| `merge` | Checks all checks are green and the required approvals are in, squash-merges, moves the ticket to Done and triggers or reminds about the production backend approval. |

## 11. Contributor onboarding
- `CONTRIBUTING.md`: prerequisites, clone/fork, `.env.example` (staging/test values), `npm ci && npm run dev`, connecting the Atlassian MCP, the workflow above and the Definition of Done.
- `AGENTS.md`: project profile, project code (`DQP`), architecture overview, hard rules (e.g. the existing performance rules).
- Issue and PR templates. CODEOWNERS = owner.

## 12. Security
- Production credentials are held by the owner only (and in a GitHub Environment for the public profile).
- Contributors get staging and test-mode credentials only.
- Push protection and secret scanning are on. `.env*` files stay gitignored.
- Least privilege throughout: staging WordPress users are Shop Managers; the staging app password belongs to a dedicated staging user.

## 13. Zero-cost check

| Tool | Cost | Notes |
|---|---|---|
| GitHub Free (public: rulesets, environments, unlimited Actions) | £0 | Private repos: permissions-based model, 2,000 min/month |
| Jira Free + automation + GitHub for Jira | £0 | Free plan limits (10 users) |
| Atlassian Remote MCP | £0 | Official Atlassian remote MCP |
| CodeRabbit (public) / GitHub Models (private) | £0 | |
| Vercel Hobby | £0 | Hobby terms are non-commercial. Existing risk for DQP; first item to pay for once there's budget |
| Vitest, Playwright, MSW, husky, commitlint, wp-env | £0 | Open source local Docker tools |

## 14. Rollout (sub-projects, in order)
Each sub-project gets its own implementation plan and Jira tickets.
1. **Jira + MCP:** connect the Atlassian MCP; confirm the Team field ID, statuses and board columns; set up the GitHub for Jira app and automation rules. *This creates the tickets for everything below.*
2. **Handbook repo:** create `engineering-handbook` + the `.github` repos; templates, CONTRIBUTING, skills (§10), reusable workflows (skeleton).
3. **DQP Git workflow:** husky + commitlint, PR template, ruleset, CodeRabbit config, `AGENTS.md` update.
4. **DQP test framework + CI:** Vitest/RTL/MSW/Playwright setup, `ci.yml`, coverage gate, initial backfill tests.
5. **Local WP environment & Seed:** `@wordpress/env` config, seed data fixtures, and environment switcher scripts for local dev.
6. **WordPress as code:** export snippets, sync tool, migrations runner, deploy workflows, drift check.
7. **Muslim Atlas adoption** (separate plan, private-free profile).

## 15. Things to verify early (spikes during rollout)
- The Atlassian MCP can set the **Team** field on create and move statuses (§4).
- Code Snippets REST API: the free version supports create/update with application passwords on Bluehost (§6.2).
- `@wordpress/env` setup and seed catalog load time (§6.1).
- Vercel "Protection Bypass for Automation" is available on Hobby (§9).
- GitHub Models free quota is enough for PR-sized diffs (private profile, §7.2).
