import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPaymentIntentsCreate = vi.fn();
const mockPaymentIntentsRetrieve = vi.fn();
const mockPaymentIntentsCancel = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/wordpress-auth.server', () => ({
  getCurrentWordPressSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      paymentIntents = {
        create: mockPaymentIntentsCreate,
        retrieve: mockPaymentIntentsRetrieve,
        cancel: mockPaymentIntentsCancel,
      };
      customers = {
        list: vi.fn().mockResolvedValue({ data: [] }),
      };
      paymentMethods = {
        list: vi.fn().mockResolvedValue({ data: [] }),
      };
    },
  };
});

import * as woocommerce from '@/lib/woocommerce';
import * as checkoutLib from '@/lib/checkout';
import * as stripeSync from '@/lib/stripe-sync';
import Stripe from 'stripe';

describe('Prevent duplicate orders and note lifecycle (DQP-14)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPaymentIntentsCreate.mockReset();
    mockPaymentIntentsRetrieve.mockReset();
    mockPaymentIntentsCancel.mockReset();
  });

  describe('Stripe create-intent lifecycle', () => {
    it('does not create a WooCommerce pending order when initializing PaymentIntent', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_123';
      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');
      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 33.98,
        discountAmount: 0,
        vat: 5.66,
        shippingCost: 0,
        finalTotal: 33.98,
        shippingTitle: 'Free Delivery',
      });

      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_test_intent_123',
        client_secret: 'pi_test_intent_123_secret_abc',
        metadata: {},
      });

      const { POST } = await import('@/app/api/checkout/stripe/create-intent/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: '101', quantity: 1 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'Ella',
            lastName: 'Savage',
            email: 'ella@example.com',
            address1: '1 High Street',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'GB',
          },
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.clientSecret).toBe('pi_test_intent_123_secret_abc');
      // CRITICAL: Must NOT pre-create an order in WooCommerce on page render
      expect(createOrderSpy).not.toHaveBeenCalled();
      expect(json.orderId).toBeUndefined();
    });
  });

  describe('PayPal create-order lifecycle', () => {
    it('does not pre-create a WooCommerce order when creating PayPal order', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-client';
      process.env.PAYPAL_CLIENT_SECRET = 'test-secret';

      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');
      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 33.98,
        discountAmount: 0,
        vat: 5.66,
        shippingCost: 0,
        finalTotal: 33.98,
        shippingTitle: 'Free Delivery',
      });

      vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 });
        }
        if (urlStr.includes('/v2/checkout/orders')) {
          return new Response(JSON.stringify({ id: 'PAYPAL-ORDER-999' }), { status: 201 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      const { POST } = await import('@/app/api/checkout/paypal/create-order/route');
      const req = new Request('http://localhost:3000/api/checkout/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: '101', quantity: 1 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'Ella',
            lastName: 'Savage',
            email: 'ella@example.com',
            address1: '1 High Street',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'GB',
          },
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.id).toBe('PAYPAL-ORDER-999');
      // CRITICAL: Must NOT pre-create a pending WooCommerce order when modal opens
      expect(createOrderSpy).not.toHaveBeenCalled();
      expect(json.wcOrderId).toBeUndefined();
    });
  });

  describe('PayPal capture-order note update and creation', () => {
    it('updates customer_note to confirm payment capture when promoting existing order', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-client';
      process.env.PAYPAL_CLIENT_SECRET = 'test-secret';

      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 33.98,
        discountAmount: 0,
        vat: 5.66,
        shippingCost: 0,
        finalTotal: 33.98,
        shippingTitle: 'Free Delivery',
      });

      const updateOrderSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
        id: 44448,
        status: 'processing',
      } as any);
      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 44448,
        status: 'processing',
        billing: { email: 'ella@example.com' },
      } as any);

      vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 });
        }
        if (urlStr.includes('/v2/checkout/orders/PAYPAL-123') && !urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              id: 'PAYPAL-123',
              purchase_units: [{ amount: { currency_code: 'GBP', value: '33.98' }, custom_id: '44448' }],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-ELLA' },
              purchase_units: [{ payments: { captures: [{ id: '4MK22817RM155125J' }] } }],
            }),
            { status: 201 }
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      const { POST } = await import('@/app/api/checkout/paypal/capture-order/route');
      const req = new Request('http://localhost:3000/api/checkout/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: 'PAYPAL-123',
          wcOrderId: 44448,
          items: [{ id: '101', quantity: 1 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'Ella',
            lastName: 'Savage',
            email: 'ella@example.com',
            address1: '1 High Street',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'GB',
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify that customer_note is updated and does NOT remain "Pending payment via PayPal."
      expect(updateOrderSpy).toHaveBeenCalledWith(
        44448,
        expect.objectContaining({
          status: 'processing',
          set_paid: true,
          transaction_id: '4MK22817RM155125J',
          customer_note: expect.stringContaining('Payment captured securely via PayPal. Capture ID: 4MK22817RM155125J'),
        })
      );
    });

    it('creates a processing order with transaction_id and note when no order was pre-created', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-client';
      process.env.PAYPAL_CLIENT_SECRET = 'test-secret';

      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 33.98,
        discountAmount: 0,
        vat: 5.66,
        shippingCost: 0,
        finalTotal: 33.98,
        shippingTitle: 'Free Delivery',
      });

      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder').mockResolvedValue({
        id: 44455,
        status: 'processing',
        total: '33.98',
      } as any);

      vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 });
        }
        if (urlStr.includes('/v2/checkout/orders/PAYPAL-456') && !urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              id: 'PAYPAL-456',
              purchase_units: [{ amount: { currency_code: 'GBP', value: '33.98' } }],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-NEW' },
              purchase_units: [{ payments: { captures: [{ id: '9AB12345CD6789' }] } }],
            }),
            { status: 201 }
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      const { POST } = await import('@/app/api/checkout/paypal/capture-order/route');
      const req = new Request('http://localhost:3000/api/checkout/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: 'PAYPAL-456',
          // Note: NO wcOrderId passed
          items: [{ id: '101', quantity: 1 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'Ella',
            lastName: 'Savage',
            email: 'ella@example.com',
            address1: '1 High Street',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'GB',
          },
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.orderId).toBe(44455);
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          set_paid: true,
          transaction_id: '9AB12345CD6789',
          customer_note: expect.stringContaining('Payment captured securely via PayPal. Capture ID: 9AB12345CD6789'),
        })
      );
    });
  });

  describe('Stripe webhook sparse metadata resilience', () => {
    it('creates a recovered order instead of dropping the payment when metadata is empty or sparse', async () => {
      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder').mockResolvedValue({
        id: 44452,
        status: 'processing',
        total: '8.99',
      } as any);

      const sparsePaymentIntent = {
        id: 'pi_3UUm394Tt6mIhQxV1599wkty',
        amount: 899,
        currency: 'gbp',
        status: 'succeeded',
        description: '1x 18W T8 Tube 3500k',
        metadata: {}, // Sparse metadata
      } as unknown as Stripe.PaymentIntent;

      const result = await stripeSync.processOrderFromPaymentIntent(
        sparsePaymentIntent,
        'ch_3UUm394Tt6mIhQxV1GbRGRM2'
      );

      expect(result).not.toBeNull();
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          set_paid: true,
          transaction_id: 'ch_3UUm394Tt6mIhQxV1GbRGRM2',
          customer_note: expect.stringContaining('ch_3UUm394Tt6mIhQxV1GbRGRM2'),
        })
      );
    });
  });
});
