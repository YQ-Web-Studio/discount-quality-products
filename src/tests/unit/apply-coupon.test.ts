import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/checkout/apply-coupon/route';
import * as checkoutLib from '@/lib/checkout';

describe('Apply Coupon API Route (/api/checkout/apply-coupon)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when items or couponCode are missing', async () => {
    const req = new Request('http://localhost/api/checkout/apply-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing items or coupon code.');
  });

  it('validates custom WooCommerce coupon code (e.g. SUMMER20) and returns discount', async () => {
    vi.spyOn(checkoutLib, 'fetchWooCommerceCartSession').mockResolvedValue({
      couponDiscount: 20,
      couponError: undefined,
      shippingRates: [
        { id: 'standard', label: 'Standard Delivery', price: 0, eta: '3–5 working days' },
      ],
    });

    const req = new Request('http://localhost/api/checkout/apply-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: '101', quantity: 1 }],
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA' },
        couponCode: 'SUMMER20',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isValid).toBe(true);
    expect(json.couponCode).toBe('SUMMER20');
    expect(json.couponDiscount).toBe(20);
    expect(json.shippingRates).toHaveLength(1);
  });

  it('returns 400 with couponError if WooCommerce rejects the coupon', async () => {
    vi.spyOn(checkoutLib, 'fetchWooCommerceCartSession').mockResolvedValue({
      couponDiscount: 0,
      couponError: 'Coupon code "EXPIRED" has expired.',
      shippingRates: [],
    });

    const req = new Request('http://localhost/api/checkout/apply-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: '101', quantity: 1 }],
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA' },
        couponCode: 'EXPIRED',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.isValid).toBe(false);
    expect(json.error).toBe('Coupon code "EXPIRED" has expired.');
  });

  it('rejects carts exceeding maximum allowed items (50)', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: String(i + 1), quantity: 1 }));
    const req = new Request('http://localhost/api/checkout/apply-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA' },
        couponCode: 'SUMMER20',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Cart exceeds maximum allowed items (50).');
  });
});
