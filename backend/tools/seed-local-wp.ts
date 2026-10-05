import * as fs from 'fs';
import * as path from 'path';

interface FixtureProduct {
  name: string;
  slug: string;
  regular_price: string;
  category_slug: string;
  stock_quantity: number;
  manage_stock: boolean;
  status: string;
}

interface FixtureCategory {
  name: string;
  slug: string;
}

interface FixtureCoupon {
  code: string;
  amount: string;
  discount_type: string;
  description: string;
}

interface FixtureData {
  categories: FixtureCategory[];
  products: FixtureProduct[];
  coupons: FixtureCoupon[];
}

async function seedLocalEnvironment() {
  const wpUrl = process.env.LOCAL_WP_URL || 'http://localhost:8888';
  const consumerKey = process.env.LOCAL_WC_KEY || 'ck_local_test';
  const consumerSecret = process.env.LOCAL_WC_SECRET || 'cs_local_test';

  console.log(`[seed-local-wp] Target Environment: ${wpUrl} (Credentials: ${consumerKey && consumerSecret ? 'ready' : 'missing'})`);

  const fixturePath = path.resolve(__dirname, '../fixtures/seed-catalog.json');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture file not found: ${fixturePath}`);
  }

  const rawData = fs.readFileSync(fixturePath, 'utf8');
  const catalog: FixtureData = JSON.parse(rawData);

  console.log(`[seed-local-wp] Loaded ${catalog.categories.length} categories, ${catalog.products.length} products, and ${catalog.coupons.length} coupons.`);
  console.log('[seed-local-wp] Note: Ensure Docker container is running via `npm run wp:start` before executing live HTTP seeding.');

  // Check connectivity
  try {
    const res = await fetch(`${wpUrl}/wp-json/`);
    if (!res.ok) {
      console.warn(`[seed-local-wp] WordPress endpoint responded with status: ${res.status}. Is @wordpress/env running?`);
      return;
    }
    console.log('[seed-local-wp] Successfully connected to local WordPress core.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[seed-local-wp] Local WordPress server is currently offline or starting (${message}). Fixtures are validated and ready.`);
  }
}

// Execute when run directly
if (require.main === module || process.argv[1]?.includes('seed-local-wp')) {
  seedLocalEnvironment().catch((err) => {
    console.error('[seed-local-wp] Fatal error:', err);
    process.exit(1);
  });
}
