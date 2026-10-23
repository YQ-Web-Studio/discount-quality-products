import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('seed-catalog.json fixture data', () => {
  it('contains all required product and coupon edge cases', () => {
    const fixturePath = path.resolve(process.cwd(), 'backend/fixtures/seed-catalog.json');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const catalog = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Products check
    const slugs = catalog.products.map((p: any) => p.slug);
    expect(slugs).toContain('e27-vintage-edison-led-filament-bulb-4w-amber'); // normal stock
    expect(slugs).toContain('out-of-stock-replacement-lamp'); // 0 stock
    expect(slugs).toContain('low-stock-dimmable-spotlight-bulb'); // low stock (<5)
    expect(slugs).toContain('verified-low-stock-gu10-halogen-bulb'); // verified low stock bypass

    // Check verified low-stock bypass metadata
    const verifiedProduct = catalog.products.find((p: any) => p.slug === 'verified-low-stock-gu10-halogen-bulb');
    expect(verifiedProduct?.meta_data).toEqual(
      expect.arrayContaining([{ key: '_bypass_low_stock_guard', value: 'yes' }])
    );

    // Coupons check
    const codes = catalog.coupons.map((c: any) => c.code);
    expect(codes).toContain('THANKYOU10'); // valid coupon
    expect(codes).toContain('EXPIRED20'); // expired coupon
    expect(codes).toContain('LIMITREACHED'); // max usage reached
    expect(codes).toContain('MINSPEND50'); // min spend threshold
  });
});
