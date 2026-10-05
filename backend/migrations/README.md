# Backend Migrations Directory

This directory stores reversible data migration scripts and runbooks for WooCommerce/WordPress database changes.

## Migration Structure
- Format: `YYYYMMDD_HHMMSS_description.ts`
- Each migration must export `up()` and `down()` operations.
- Must execute safely in local Docker first (`npm run wp:start`) before deployment.
- Zero Bluehost disruption: no direct SQL execution on live production without explicit user hard-gate approval.
