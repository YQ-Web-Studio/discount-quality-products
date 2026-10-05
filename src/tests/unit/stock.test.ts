import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCartTotals } from '@/lib/checkout';
import * as woocommerce from '@/lib/woocommerce';
import { GET as getStockRoute } from '@/app/api/products/stock/route';

describe('Real-Time Stock & Inventory Validation Guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/wp-json/wc/store/v1/')) {
        return new Response(
          JSON.stringify({
            shipping_rates: [
              {
                shipping_rates: [
                  { rate_id: 'standard', name: 'Standard Delivery', price: '0' },
                ],
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });
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
      total: 1,
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
      total: 1,
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
      total: 1,
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
      total: 1,
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
      total: 1,
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
      total: 0,
    });

    const result = await validateCartTotals(
      [{ id: '9999', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'Liverpool', postcode: 'L1 1AA' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Product not found: 9999');
  });

  describe('Verified Stock Guard Bypass (_bypass_low_stock_guard / tag: verified-stock)', () => {
    it('allows checkout when low-stock item (< 5 units) has bypassLowStock enabled', async () => {
      vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
        products: [
          createProduct({
            databaseId: 301,
            name: 'Rare Vintage Lightbulb',
            stockStatus: 'instock',
            manageStock: true,
            stockQuantity: 2, // low stock < 5
            bypassLowStock: true, // verified by merchant!
          }),
        ],
        totalPages: 1,
        total: 1,
      });

      const result = await validateCartTotals(
        [{ id: '301', quantity: 2 }],
        'standard',
        { country: 'GB', city: 'London', postcode: 'EC1A 1BB' }
      );

      expect(result.isValid).toBe(true);
      expect(result.subtotal).toBe(50);
    });

    it('rejects checkout when bypassLowStock is enabled but requested quantity exceeds available stock', async () => {
      vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
        products: [
          createProduct({
            databaseId: 302,
            name: 'Rare Vintage Lightbulb',
            stockStatus: 'instock',
            manageStock: true,
            stockQuantity: 2,
            bypassLowStock: true,
          }),
        ],
        totalPages: 1,
        total: 1,
      });

      const result = await validateCartTotals(
        [{ id: '302', quantity: 3 }], // requesting 3 when only 2 available
        'standard',
        { country: 'GB', city: 'London', postcode: 'EC1A 1BB' }
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Only 2 of "Rare Vintage Lightbulb" available in stock.');
    });

    it('still rejects checkout when bypassLowStock is enabled but item is completely out of stock', async () => {
      vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
        products: [
          createProduct({
            databaseId: 303,
            name: 'Sold Out Item',
            stockStatus: 'outofstock',
            manageStock: true,
            stockQuantity: 0,
            bypassLowStock: true,
          }),
        ],
        totalPages: 1,
        total: 1,
      });

      const result = await validateCartTotals(
        [{ id: '303', quantity: 1 }],
        'standard',
        { country: 'GB', city: 'London', postcode: 'EC1A 1BB' }
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('is currently out of stock and cannot be purchased.');
    });

    it('correctly maps bypassLowStock from WooCommerce tags (verified-stock)', () => {
      const rawWithTag = {
        id: 401,
        name: 'Tagged Item',
        slug: 'tagged-item',
        price: '10.00',
        regular_price: '10.00',
        stock_status: 'instock',
        manage_stock: true,
        stock_quantity: 3,
        tags: [{ id: 55, name: 'Verified Stock', slug: 'verified-stock' }],
      } as unknown as woocommerce.WooProductRaw;

      const mapped = woocommerce.mapProduct(rawWithTag);
      expect(mapped.bypassLowStock).toBe(true);
    });

    it('correctly maps bypassLowStock from WooCommerce meta_data (_bypass_low_stock_guard)', () => {
      const rawWithMeta = {
        id: 402,
        name: 'Meta Item',
        slug: 'meta-item',
        price: '15.00',
        regular_price: '15.00',
        stock_status: 'instock',
        manage_stock: true,
        stock_quantity: 2,
        meta_data: [{ id: 99, key: '_bypass_low_stock_guard', value: 'yes' }],
      } as unknown as woocommerce.WooProductRaw;

      const mapped = woocommerce.mapProduct(rawWithMeta);
      expect(mapped.bypassLowStock).toBe(true);
    });

    it('maps bypassLowStock as false when neither tag nor meta_data is present', () => {
      const rawNormal = {
        id: 403,
        name: 'Normal Item',
        slug: 'normal-item',
        price: '20.00',
        regular_price: '20.00',
        stock_status: 'instock',
        manage_stock: true,
        stock_quantity: 2,
      } as unknown as woocommerce.WooProductRaw;

      const mapped = woocommerce.mapProduct(rawNormal);
      expect(mapped.bypassLowStock).toBe(false);
    });

    it('returns bypassLowStock: true in /api/products/stock when product has verified low-stock bypass', async () => {
      vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
        products: [
          createProduct({
            databaseId: 501,
            slug: 'verified-low-stock-item',
            stockStatus: 'instock',
            manageStock: true,
            stockQuantity: 2,
            bypassLowStock: true,
          }),
        ],
        totalPages: 1,
        total: 1,
      });

      const req = new Request('http://localhost:3000/api/products/stock?id=501');
      const res = await getStockRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.bypassLowStock).toBe(true);
      expect(data.stockQuantity).toBe(2);
      expect(data.manageStock).toBe(true);
    });

    it('returns bypassLowStock: false in /api/products/stock when product does not have bypass', async () => {
      vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
        products: [
          createProduct({
            databaseId: 502,
            slug: 'standard-low-stock-item',
            stockStatus: 'instock',
            manageStock: true,
            stockQuantity: 2,
            bypassLowStock: false,
          }),
        ],
        totalPages: 1,
        total: 1,
      });

      const req = new Request('http://localhost:3000/api/products/stock?slug=standard-low-stock-item');
      const res = await getStockRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.bypassLowStock).toBe(false);
      expect(data.stockQuantity).toBe(2);
    });
  });
});

