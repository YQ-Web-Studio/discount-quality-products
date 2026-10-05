# WordPress as Code: Snippets Directory

All PHP modifications and custom functions targeting WordPress/WooCommerce must be stored as version-controlled files in this directory before being deployed to any environment.

## File Naming Convention

Format: `NNN-kebab-case-description.php` (e.g., `001-vat-first-class-exemption.php`).

## Header Standard

Every snippet file MUST declare the following header comment:

```php
<?php
/**
 * Snippet Name: VAT Exemption for 1st Class Shipping
 * Description: Prevents standard VAT from applying to Royal Mail 1st Class postage.
 * Scope: global
 * Ticket: DQP-1
 */
```

## Supported Scopes
- `global`: Runs in both front-end and WordPress admin.
- `front-end`: Runs only when rendering customer-facing pages.
- `admin`: Runs only inside `/wp-admin`.
- `single-use`: Meant for one-off maintenance or backfill migrations.

## Safety & Hard Gates
1. **Never edit snippets directly in the live Bluehost wp-admin.**
2. All snippets must first be tested in the local Docker environment (`npm run wp:start`).
3. Deployments to production must be executed via `npm run wp:sync-snippets -- --env=production` after approval at Human Confirmation Gate 6.
4. Drift between production snippets and this directory is monitored via `npm run wp:drift-check`.
