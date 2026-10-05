## Description

<!-- Provide a concise summary of what this PR changes and why. -->

## Linked Jira Ticket
- Jira Ticket: [DQP-](https://yqwebstudio.atlassian.net/browse/DQP-)

## Type of Change
- [ ] `feat`: New feature or capability
- [ ] `fix`: Bug fix
- [ ] `perf`: Performance improvement
- [ ] `refactor`: Code refactoring without behavior changes
- [ ] `test`: Adding or updating test cases
- [ ] `docs`: Documentation updates
- [ ] `ci`: CI/CD pipeline or workflow changes
- [ ] `chore`: Maintenance / tooling updates

## Backend / WordPress Changes
<!-- Does this PR require changes to WordPress/WooCommerce? -->
- [ ] **None** (Pure frontend / Next.js changes)
- [ ] **PHP Snippet** (Added in `backend/wordpress/snippets/`)
- [ ] **Database Migration** (Added in `backend/migrations/`)
- [ ] **Manual Runbook** (Requires manual admin action - documented below)

### Runbook Steps (if applicable)
<!-- Describe exact settings to configure in WP Admin -->

## Test Verification & Evidence
<!-- TDD is required. Provide test command output and/or screenshots -->
- [ ] Unit / Integration Tests (`npm run test:coverage`):
```text
<!-- Paste Vitest summary output here -->
```
- [ ] E2E Tests (`npm run test:e2e`):
```text
<!-- Paste Playwright summary output here -->
```

## AI Agent Usage
<!-- Specify if an AI assistant was used -->
- [ ] Built with AI Agent assistance (e.g. Antigravity, Claude Code, Cursor)
- Agent Model: 
- Human Verification Performed:

## Definition of Done Checklist
- [ ] PR title follows convention: `[DQP] type(scope): description (DQP-n)`
- [ ] Acceptance criteria from Jira ticket are met
- [ ] Tests written first (TDD) and passing
- [ ] Changed-line test coverage >= 80%
- [ ] Next.js performance rules adhered to (`generateStaticParams` never returns `[]`)
- [ ] No secrets or sensitive keys exposed in diff
- [ ] Tested locally against `@wordpress/env` (Docker) if backend changes included
