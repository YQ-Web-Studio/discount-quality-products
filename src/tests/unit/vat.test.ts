import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCartTotals } from '@/lib/checkout';
import * as woocommerce from '@/lib/woocommerce';

describe('VAT & Postage Calculation Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockProduct = (databaseId: number, name: string, price: string, stockQuantity = 20) => ({
    id: `post:${databaseId}`,
    databaseId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    price,
    regularPrice: price,
    salePrice: null,
    permalink: `https://discountproducts.co.uk/products/${databaseId}`,
    image: null,
    categories: [],
    attributes: [],
    stockStatus: 'instock',
    manageStock: true,
    stockQuantity,
  });

  it('calculates standard 20% VAT on goods and standard delivery (VAT = gross / 6)', async () => {
    // £60 product, Free Standard Delivery (subtotal >= £5)
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [mockProduct(101, 'Test Item 1', '£60.00')],
      totalPages: 1,
      total: 1,
    });

    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/wp-json/wc/store/v1/cart/update-customer')) {
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
          { status: 200, headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' } }
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' },
      });
    });

    const result = await validateCartTotals(
      [{ id: '101', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'London', postcode: 'SW1A 1AA' }
    );

    expect(result.isValid).toBe(true);
    expect(result.subtotal).toBe(60);
    expect(result.shippingCost).toBe(0);
    expect(result.shippingTitle).toBe('Free Delivery');
    expect(result.finalTotal).toBe(60);
    // UK VAT-inclusive: £60 / 6 = £10.00
    expect(result.vat).toBeCloseTo(10, 2);
  });

  it('exempts Royal Mail 1st Class postage from VAT (VAT applies ONLY to goods: netSubtotal / 6)', async () => {
    // £60 product + £2.00 1st Class postage
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [mockProduct(102, 'Test Item 2', '£60.00')],
      totalPages: 1,
      total: 1,
    });

    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/wp-json/wc/store/v1/cart/update-customer')) {
        return new Response(
          JSON.stringify({
            shipping_rates: [
              {
                shipping_rates: [
                  { rate_id: 'first_class', name: 'First Class Delivery', price: '200' },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' } }
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' },
      });
    });

    const result = await validateCartTotals(
      [{ id: '102', quantity: 1 }],
      'first_class',
      { country: 'GB', city: 'Manchester', postcode: 'M1 1AA' }
    );

    expect(result.isValid).toBe(true);
    expect(result.subtotal).toBe(60);
    expect(result.shippingCost).toBe(2);
    expect(result.shippingTitle).toBe('First Class Delivery');
    expect(result.finalTotal).toBe(62);
    // Royal Mail statutory exemption:
    // VAT must be calculated strictly on netSubtotal (£60 / 6 = £10.00), NOT finalTotal (£62 / 6 = £10.33)
    expect(result.vat).toBeCloseTo(10, 2);
    expect(result.vat).not.toBeCloseTo(62 / 6, 2);
  });

  it('correctly recalculates VAT when THANKYOU10 coupon code is applied', async () => {
    // £100 product, THANKYOU10 gives 10% off (£10 discount)
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [mockProduct(103, 'Discounted Item', '£100.00')],
      totalPages: 1,
      total: 1,
    });

    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/apply-coupon')) {
        return new Response(
          JSON.stringify({
            totals: { total_discount: '1000' } // £10.00 in minor units
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' } }
        );
      }
      if (urlStr.includes('/update-customer')) {
        return new Response(
          JSON.stringify({
            shipping_rates: [
              {
                shipping_rates: [
                  { rate_id: 'standard', name: 'Standard Delivery', price: '0' },
                ],
              },
            ],
            totals: { total_discount: '1000' }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' } }
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' },
      });
    });

    const result = await validateCartTotals(
      [{ id: '103', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'Birmingham', postcode: 'B1 1AA', email: 'freshbuyer@example.com' },
      'THANKYOU10'
    );

    expect(result.isValid).toBe(true);
    expect(result.subtotal).toBe(100);
    expect(result.discountAmount).toBe(10);
    expect(result.finalTotal).toBe(90);
    // Net subtotal £90 / 6 = £15.00 VAT
    expect(result.vat).toBeCloseTo(15, 2);
  });

  it('rejects checkout when WooCommerce API returns coupon validation error (e.g. usage limit reached)', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [mockProduct(104, 'Test Item', '£50.00')],
      totalPages: 1,
      total: 1,
    });

    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/apply-coupon')) {
        return new Response(
          JSON.stringify({
            message: 'Coupon usage limit has been reached.'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' } }
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json', Nonce: 'mock-nonce' },
      });
    });

    const result = await validateCartTotals(
      [{ id: '104', quantity: 1 }],
      'standard',
      { country: 'GB', city: 'Leeds', postcode: 'LS1 1AA', email: 'used@discountproducts.co.uk' },
      'THANKYOU10'
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Coupon usage limit has been reached.');
  });

  it('rejects checkout when destination country is outside the United Kingdom', async () => {
    vi.spyOn(woocommerce, 'fetchWooCommerceProductsDirect').mockResolvedValue({
      products: [mockProduct(105, 'Test Item', '£30.00')],
      totalPages: 1,
      total: 1,
    });

    const result = await validateCartTotals(
      [{ id: '105', quantity: 1 }],
      'standard',
      { country: 'US', city: 'New York', postcode: '10001' }
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Shipping is strictly restricted to the United Kingdom');
  });
});
