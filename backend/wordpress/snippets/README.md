# WordPress as Code: Snippets Directory

All PHP modifications and custom functions targeting WordPress/WooCommerce must be stored as version-controlled files in this directory before being deployed to any environment.

## File Naming Convention

Format: `NNN-kebab-case-description.php` (e.g., `001-vat-first-class-exemption.php`).

## Header Standard

Every snippet file MUST declare the following header comment:

```php
<?php
/**
 * Snippet Name: Verified Low Stock Guard Bypass Checkbox
 * Description: Adds a 1-click checkbox to WooCommerce product inventory settings and quick edit.
 * Scope: admin
 * Ticket: DQP-4
 */
```

## Supported Scopes
- `global`: Runs in both front-end and WordPress admin.
- `front-end`: Runs only when rendering customer-facing pages.
- `admin`: Runs only inside `/wp-admin`.
- `single-use`: Meant for one-off maintenance or backfill migrations.

## Safety & Deployment Procedures
1. **Never edit snippets directly in the live Bluehost wp-admin without git versioning.**
2. All snippets must first be validated locally or in CI (`php -l` and functional verification).
3. **Production Deployment Procedure:**
   - **Current Phase (Manual Runbook):** Prior to rollout of the automated sync script in subproject 6, operators must follow the step-by-step manual activation runbook in the PR/ticket to create and activate the snippet via Code Snippets on `admin.discountproducts.co.uk` after Gate 6 approval.
   - **Automated Phase (Post Subproject 6):** Deployments will transition to `npm run wp:sync-snippets -- --env=production` once the sync tooling is deployed.
4. **Drift Monitoring:** Production snippet drift will be monitored via `npm run wp:drift-check` once the sync tool is active.
