import { describe, it, expect } from 'vitest';
import {
  buildProductCliArgs,
  buildCouponCliArgs,
  buildEnvTestLocalContent,
  buildApiKeyPhpScript,
  findProjectCliContainer,
  buildWpCliInvocation,
  type FixtureProduct,
  type FixtureCoupon,
} from '../../../backend/tools/seed-local-wp';

describe('seed-local-wp helper functions', () => {
  describe('buildProductCliArgs', () => {
    it('builds CLI arguments for standard products with category mapping', () => {
      const product: FixtureProduct = {
        name: 'Standard Bulb 10W',
        slug: 'standard-bulb-10w',
        regular_price: '6.99',
        category_slug: 'lighting-bulbs',
        stock_quantity: 25,
        manage_stock: true,
        status: 'publish',
      };
      const categoryMap = { 'lighting-bulbs': 12 };

      const args = buildProductCliArgs(product, categoryMap);

      expect(args).toContain('--name=Standard Bulb 10W');
      expect(args).toContain('--slug=standard-bulb-10w');
      expect(args).toContain('--regular_price=6.99');
      expect(args).toContain('--manage_stock=true');
      expect(args).toContain('--stock_quantity=25');
      expect(args).toContain('--status=publish');
      expect(args).toContain('--categories=[{"id":12}]');
      expect(args).toContain('--user=admin');
    });

    it('handles meta_data and tags for verified low-stock bypass products', () => {
      const product: FixtureProduct = {
        name: 'Verified Low Stock Lamp',
        slug: 'verified-low-stock-lamp',
        regular_price: '4.99',
        category_slug: 'lighting-bulbs',
        stock_quantity: 2,
        manage_stock: true,
        status: 'publish',
        tags: ['verified-stock'],
        meta_data: [{ key: '_bypass_low_stock_guard', value: 'yes' }],
      };
      const categoryMap = { 'lighting-bulbs': 12 };

      const args = buildProductCliArgs(product, categoryMap);

      expect(args).toContain('--tags=[{"name":"verified-stock"}]');
      expect(args).toContain('--meta_data=[{"key":"_bypass_low_stock_guard","value":"yes"}]');
    });
  });

  describe('buildCouponCliArgs', () => {
    it('builds CLI arguments for percentage coupons with usage limit per user', () => {
      const coupon: FixtureCoupon = {
        code: 'THANKYOU10',
        amount: '10',
        discount_type: 'percent',
        description: '10% off entire order',
        usage_limit_per_user: 1,
        minimum_amount: '0.00',
      };

      const args = buildCouponCliArgs(coupon);

      expect(args).toContain('--code=THANKYOU10');
      expect(args).toContain('--amount=10');
      expect(args).toContain('--discount_type=percent');
      expect(args).toContain('--description=10% off entire order');
      expect(args).toContain('--usage_limit_per_user=1');
      expect(args).toContain('--minimum_amount=0.00');
      expect(args).toContain('--user=admin');
    });

    it('handles coupons with expiration and spend thresholds', () => {
      const coupon: FixtureCoupon = {
        code: 'EXPIRED20',
        amount: '20',
        discount_type: 'percent',
        description: 'Expired promo',
        date_expires: '2020-01-01T00:00:00',
        usage_limit: 0,
        minimum_amount: '50.00',
      };

      const args = buildCouponCliArgs(coupon);

      expect(args).toContain('--date_expires=2020-01-01T00:00:00');
      expect(args).toContain('--usage_limit=0');
      expect(args).toContain('--minimum_amount=50.00');
    });
  });

  describe('buildApiKeyPhpScript', () => {
    it('generates PHP script evaluating deterministic API credentials', () => {
      const script = buildApiKeyPhpScript('ck_local_test', 'cs_local_test', 'Test Key');

      expect(script).toContain('ck_local_test');
      expect(script).toContain('cs_local_test');
      expect(script).toContain('wc_api_hash');
      expect(script).toContain('woocommerce_api_keys');
    });
  });

  describe('buildEnvTestLocalContent', () => {
    it('generates standard local test environment configuration', () => {
      const content = buildEnvTestLocalContent({
        wpUrl: 'http://localhost:8888',
        consumerKey: 'ck_local_test',
        consumerSecret: 'cs_local_test',
        stripeWebhookSecret: 'whsec_test_secret',
      });

      expect(content).toContain('NEXT_PUBLIC_WORDPRESS_URL=http://localhost:8888');
      expect(content).toContain('WOOCOMMERCE_URL=http://localhost:8888');
      expect(content).toContain('WC_CONSUMER_KEY=ck_local_test');
      expect(content).toContain('WC_CONSUMER_SECRET=cs_local_test');
      expect(content).toContain('STRIPE_WEBHOOK_SECRET=whsec_test_secret');
    });
  });

  describe('findProjectCliContainer', () => {
    it('selects this project CLI container and rejects other wp-env containers', () => {
      const containerNames = [
        'wp-env-other-project-12345678-cli-1',
        'wp-env-other-project-12345678-wordpress-1',
        'wp-env-discount-products-store-8547e0e6-wordpress-1',
        'wp-env-discount-products-store-8547e0e6-cli-1',
        'wp-env-discount-products-store-8547e0e6-mysql-1',
      ];

      const result = findProjectCliContainer(containerNames);

      expect(result).toBe('wp-env-discount-products-store-8547e0e6-cli-1');
    });

    it('returns null if this project CLI container is not running', () => {
      const containerNames = [
        'wp-env-other-project-12345678-cli-1',
        'wp-env-discount-products-store-8547e0e6-wordpress-1',
      ];

      const result = findProjectCliContainer(containerNames);

      expect(result).toBeNull();
    });
  });

  describe('buildWpCliInvocation', () => {
    it('builds direct docker exec invocation when container is available', () => {
      const args = ['wp', 'wc', 'product', 'list', '--format=json'];
      const container = 'wp-env-discount-products-store-8547e0e6-cli-1';

      const invocation = buildWpCliInvocation(args, container);

      expect(invocation.command).toBe('docker');
      expect(invocation.args).toEqual([
        'exec',
        'wp-env-discount-products-store-8547e0e6-cli-1',
        'wp',
        'wc',
        'product',
        'list',
        '--format=json',
      ]);
    });

    it('builds array-based wp-env invocation preserving argument boundaries on fallback path', () => {
      const phpScript = 'global $wpdb; $res = $wpdb->get_results("SELECT * FROM wp_posts"); echo count($res);';
      const args = ['wp', 'eval', phpScript];

      const invocation = buildWpCliInvocation(args, null);

      const expectedNpx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      expect(invocation.command).toBe(expectedNpx);
      expect(invocation.args).toEqual([
        'wp-env',
        'run',
        'cli',
        'wp',
        'eval',
        phpScript,
      ]);
      // Verify phpScript is preserved intact as a single argument boundary without shell splitting
      expect(invocation.args[5]).toBe(phpScript);
    });
  });
});
