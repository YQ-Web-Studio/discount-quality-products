import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/checkout/shipping-rates/route';
import * as checkoutLib from '@/lib/checkout';

describe('Shipping Rates API Route (/api/checkout/shipping-rates)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 if items or address are missing', async () => {
    const req = new Request('http://localhost/api/checkout/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing items or address in request.');
  });

  it('returns shippingRates fetched from fetchWooCommerceCartSession', async () => {
    const mockRates = [
      { id: 'standard', label: 'Standard Delivery', price: 0, eta: '3–5 working days' },
      { id: 'first_class', label: 'First Class Delivery', price: 2.0, eta: '1–2 working days' },
    ];

    vi.spyOn(checkoutLib, 'fetchWooCommerceCartSession').mockResolvedValue({
      shippingRates: mockRates,
      couponDiscount: 0,
      couponError: undefined,
    });

    const req = new Request('http://localhost/api/checkout/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: '101', quantity: 1 }],
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shippingRates).toEqual(mockRates);
  });

  it('returns 500 when fetchWooCommerceCartSession throws an error', async () => {
    vi.spyOn(checkoutLib, 'fetchWooCommerceCartSession').mockRejectedValue(
      new Error('WooCommerce API unavailable')
    );

    const req = new Request('http://localhost/api/checkout/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: '101', quantity: 1 }],
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('WooCommerce API unavailable');
  });

  it('passes couponCode to fetchWooCommerceCartSession and returns coupon results', async () => {
    const mockRates = [
      { id: 'free_shipping', label: 'Free Delivery', price: 0, eta: '3–5 working days' },
    ];

    const fetchSessionSpy = vi.spyOn(checkoutLib, 'fetchWooCommerceCartSession').mockResolvedValue({
      shippingRates: mockRates,
      couponDiscount: 15.5,
      couponError: undefined,
    });

    const req = new Request('http://localhost/api/checkout/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: '101', quantity: 1 }],
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA', email: 'customer@example.com' },
        couponCode: 'FREESHIP15',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shippingRates).toEqual(mockRates);
    expect(json.couponDiscount).toBe(15.5);
    expect(json.couponError).toBeUndefined();
    expect(fetchSessionSpy).toHaveBeenCalledWith(
      [{ id: '101', quantity: 1 }],
      { country: 'GB', city: 'London', postcode: 'SW1A 1AA', email: 'customer@example.com' },
      'FREESHIP15'
    );
  });

  it('rejects requests exceeding maximum allowed items (50)', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: String(i + 1), quantity: 1 }));
    const req = new Request('http://localhost/api/checkout/shipping-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        address: { country: 'GB', city: 'London', postcode: 'SW1A 1AA' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Cart exceeds maximum allowed items (50).');
  });
});
