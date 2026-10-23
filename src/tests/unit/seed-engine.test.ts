import { describe, it, expect } from 'vitest';
import {
  buildProductCliArgs,
  buildCouponCliArgs,
  buildEnvTestLocalContent,
  buildApiKeyPhpScript,
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
});
