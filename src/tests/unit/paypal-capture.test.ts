import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/checkout/paypal/capture-order/route';
import * as checkoutLib from '@/lib/checkout';

const validCart = {
  orderID: 'PAYPAL-ORDER-1',
  items: [{ id: '101', quantity: 1 }],
  shippingMethod: 'standard',
  form: { country: 'GB', city: 'London', postcode: 'SW1A 1AA', email: 'buyer@example.com' },
  couponCode: 'THANKYOU10',
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/checkout/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function paypalCaptureCalls(fetchSpy: ReturnType<typeof vi.spyOn>): unknown[][] {
  return fetchSpy.mock.calls.filter((call: unknown[]) => String(call[0]).includes('/capture'));
}

describe('PayPal capture-order: cart validation before funds are captured', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.PAYPAL_CLIENT_ID = 'test-client';
    process.env.PAYPAL_CLIENT_SECRET = 'test-secret';
  });

  it('rejects with 400 and never calls PayPal when basket items are omitted', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const validateSpy = vi.spyOn(checkoutLib, 'validateCartTotals');

    const res = await POST(makeRequest({ orderID: 'PAYPAL-ORDER-1' }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Missing basket items.');
    expect(validateSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects with 400 and never captures when cart validation fails (e.g. coupon rejected)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
      isValid: false,
      subtotal: 0, discountAmount: 0, vat: 0, shippingCost: 0, finalTotal: 0,
      error: 'Coupon usage limit has been reached.',
    });

    const res = await POST(makeRequest(validCart));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Coupon usage limit has been reached.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('captures funds only after the cart validates', async () => {
    vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
      isValid: true,
      subtotal: 100, discountAmount: 10, vat: 15, shippingCost: 0, finalTotal: 90,
      shippingTitle: 'Free Delivery',
    });
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'token' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          status: 'COMPLETED',
          payer: { payer_id: 'PAYER-1' },
          purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1' }] } }],
        }),
        { status: 201 }
      );
    });

    const res = await POST(makeRequest(validCart));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.captureId).toBe('CAPTURE-1');
    expect(paypalCaptureCalls(fetchSpy)).toHaveLength(1);
  });
});
