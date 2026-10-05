import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCartTotals } from '@/lib/checkout';
import * as woocommerce from '@/lib/woocommerce';

describe('Real-Time Stock & Inventory Validation Guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createProduct = (overrides: Partial<woocommerce.MappedProduct> = {}): woocommerce.MappedProduct => ({
    id: 'post:201',
    databaseId: 201,
    name: 'Wireless Bluetooth Earbuds',
    slug: 'wireless-bluetooth-earbuds',
    price: '£25.00',
    regularPrice: '£25.00',
    salePrice: null,
    permalink: 'https://discountproducts.co.uk/products/wireless-bluetooth-earbuds',
    image: null,
    categories: [],
    attributes: [],
    stockStatus: 'instock',
    manageStock: true,
    stockQuantity: 15,
    ...overrides,
  });

  it('rejects checkout when item has stockStatus="outofstock"', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [
        createProduct({
          databaseId: 201,
          name: 'Noise Cancelling Headphones',
          stockStatus: 'outofstock',
          stockQuantity: 0,
        }),
      ],
      totalPages: 1,
      totalProducts: 1,
    });

    const result = await validateCartTotals(
      [{ id: '201', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'London', postcode: 'E1 6AN' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('"Noise Cancelling Headphones" is currently out of stock and cannot be purchased.');
  });

  it('rejects checkout when manageStock is true and stockQuantity is 0', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [
        createProduct({
          databaseId: 202,
          name: 'Smart Watch Series 5',
          stockStatus: 'instock',
          manageStock: true,
          stockQuantity: 0,
        }),
      ],
      totalPages: 1,
      totalProducts: 1,
    });

    const result = await validateCartTotals(
      [{ id: '202', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'London', postcode: 'E1 6AN' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('"Smart Watch Series 5" is currently out of stock and cannot be purchased.');
  });

  it('enforces customer enquiry guard when stock is strictly less than 5 units', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [
        createProduct({
          databaseId: 203,
          name: 'Mechanical Gaming Keyboard',
          stockStatus: 'instock',
          manageStock: true,
          stockQuantity: 4,
        }),
      ],
      totalPages: 1,
      totalProducts: 1,
    });

    const result = await validateCartTotals(
      [{ id: '203', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'Bristol', postcode: 'BS1 4PB' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('has limited stock (less than 5 remaining). Please contact us to check availability');
  });

  it('rejects checkout when requested quantity exceeds available stock', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [
        createProduct({
          databaseId: 204,
          name: 'USB-C Fast Charger',
          stockStatus: 'instock',
          manageStock: true,
          stockQuantity: 6,
        }),
      ],
      totalPages: 1,
      totalProducts: 1,
    });

    const result = await validateCartTotals(
      [{ id: '204', quantity: 10 }], // requesting 10 when 6 available
      'standard',
      { country: 'GB', city: 'Manchester', postcode: 'M2 3AA' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Only 6 of "USB-C Fast Charger" available in stock.');
  });

  it('gracefully handles and decodes base64-encoded WPGraphQL global IDs', async () => {
    // "cG9zdDoyMDU=" is base64 for "post:205"
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [
        createProduct({
          databaseId: 205,
          name: 'Decoded Item',
          stockQuantity: 10,
        }),
      ],
      totalPages: 1,
      totalProducts: 1,
    });

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json', Nonce: 'test-nonce' },
      });
    });

    const base64Id = Buffer.from('post:205').toString('base64');
    const result = await validateCartTotals(
      [{ id: base64Id, quantity: 2 }],
      'standard',
      { country: 'GB', city: 'London', postcode: 'SW1A 1AA' }
    );

    expect(result.isValid).toBe(true);
    expect(result.subtotal).toBe(50); // 2 * £25.00
  });

  it('returns an error if requested product is not found in backend catalogue', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [],
      totalPages: 0,
      totalProducts: 0,
    });

    const result = await validateCartTotals(
      [{ id: '9999', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'Liverpool', postcode: 'L1 1AA' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Product not found: 9999');
  });
});
