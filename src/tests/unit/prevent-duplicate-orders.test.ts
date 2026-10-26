import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockPaymentIntentsCreate,
  mockPaymentIntentsRetrieve,
  mockPaymentIntentsCancel,
  mockPaymentIntentsUpdate,
} = vi.hoisted(() => ({
  mockPaymentIntentsCreate: vi.fn(),
  mockPaymentIntentsRetrieve: vi.fn(),
  mockPaymentIntentsCancel: vi.fn(),
  mockPaymentIntentsUpdate: vi.fn().mockResolvedValue({}),
}));

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
        update: mockPaymentIntentsUpdate,
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
import * as wpAuth from '@/lib/wordpress-auth.server';
import Stripe from 'stripe';

describe('Prevent duplicate orders and note lifecycle (DQP-14)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPaymentIntentsCreate.mockReset();
    mockPaymentIntentsRetrieve.mockReset();
    mockPaymentIntentsCancel.mockReset();
    stripeSync._resetInFlightPaymentIntents();
    vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockResolvedValue(null);
    vi.spyOn(stripeSync, 'sendConfirmationEmailForOrder').mockResolvedValue(undefined as any);
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

    it('applies promotion fee_lines when discountAmount > 0 and no couponCode is provided', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-client';
      process.env.PAYPAL_CLIENT_SECRET = 'test-secret';

      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 50.00,
        discountAmount: 10.00,
        vat: 6.67,
        shippingCost: 0,
        finalTotal: 40.00,
        shippingTitle: 'Free Delivery',
      });

      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder').mockResolvedValue({
        id: 44456,
        status: 'processing',
        total: '40.00',
      } as any);

      vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 });
        }
        if (urlStr.includes('/v2/checkout/orders/PAYPAL-DISC') && !urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              id: 'PAYPAL-DISC',
              purchase_units: [{ amount: { currency_code: 'GBP', value: '40.00' } }],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-DISC' },
              purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-DISC-1' }] } }],
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
          orderID: 'PAYPAL-DISC',
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
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fee_lines: [
            expect.objectContaining({
              name: 'Promotion Discount',
              total: '-8.33', // 10.00 / 1.2
              tax_status: 'taxable',
            }),
          ],
        })
      );
    });

    it('assigns customerId from WordPress session when authenticated user captures PayPal order', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-client';
      process.env.PAYPAL_CLIENT_SECRET = 'test-secret';

      vi.spyOn(wpAuth, 'getCurrentWordPressSession').mockResolvedValue({
        user: { id: 789, name: 'Ella Savage', email: 'ella@example.com' },
      } as any);

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
        id: 44457,
        status: 'processing',
        total: '33.98',
      } as any);

      vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 });
        }
        if (urlStr.includes('/v2/checkout/orders/PAYPAL-AUTH') && !urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              id: 'PAYPAL-AUTH',
              purchase_units: [{ amount: { currency_code: 'GBP', value: '33.98' } }],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-AUTH' },
              purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-AUTH-1' }] } }],
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
          orderID: 'PAYPAL-AUTH',
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
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 789,
        })
      );
    });

    it('does not create a duplicate order when an existing order matches PayPal capture', async () => {
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

      vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockResolvedValue({
        id: 44458,
        status: 'processing',
      } as any);

      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');

      vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('/oauth2/token')) {
          return new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 });
        }
        if (urlStr.includes('/v2/checkout/orders/PAYPAL-DEDUP') && !urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              id: 'PAYPAL-DEDUP',
              purchase_units: [{ amount: { currency_code: 'GBP', value: '33.98' } }],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes('/capture')) {
          return new Response(
            JSON.stringify({
              status: 'COMPLETED',
              payer: { payer_id: 'PAYER-DEDUP' },
              purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-DEDUP-1' }] } }],
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
          orderID: 'PAYPAL-DEDUP',
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
      expect(json.orderId).toBe(44458);
      expect(createOrderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Stripe webhook sparse metadata resilience and deduplication', () => {
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

    it('does not create a second order when an existing order references the PaymentIntent', async () => {
      vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockResolvedValue({
        id: 44460,
        status: 'processing',
      } as any);
      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');

      const result = await stripeSync.processOrderFromPaymentIntent(
        { id: 'pi_existing_123', amount: 899, currency: 'gbp', metadata: {} } as unknown as Stripe.PaymentIntent,
        'ch_existing_123'
      );

      expect(result.id).toBe(44460);
      expect(createOrderSpy).not.toHaveBeenCalled();
    });

    it('handles concurrent processOrderFromPaymentIntent calls safely with in-flight mutex', async () => {
      let createCallCount = 0;
      vi.spyOn(woocommerce, 'createWooCommerceOrder').mockImplementation(async () => {
        createCallCount++;
        // Simulate network latency in order creation
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          id: 44461,
          status: 'processing',
          total: '8.99',
        } as any;
      });

      const sparsePaymentIntent = {
        id: 'pi_concurrent_999',
        amount: 899,
        currency: 'gbp',
        status: 'succeeded',
        description: '1x 18W T8 Tube 3500k',
        metadata: {},
      } as unknown as Stripe.PaymentIntent;

      // Invoke processOrderFromPaymentIntent concurrently for the same PaymentIntent
      const [orderA, orderB] = await Promise.all([
        stripeSync.processOrderFromPaymentIntent(sparsePaymentIntent, 'ch_concurrent_999'),
        stripeSync.processOrderFromPaymentIntent(sparsePaymentIntent, 'ch_concurrent_999'),
      ]);

      expect(createCallCount).toBe(1);
      expect(orderA).not.toBeNull();
      expect(orderB).not.toBeNull();
      expect(orderA.id).toBe(44461);
      expect(orderB.id).toBe(44461);
    });

    it('prevents duplicate orders across independent execution contexts when existing order is discovered', async () => {
      let createdOrder: any = null;
      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder').mockImplementation(async () => {
        createdOrder = {
          id: 44462,
          status: 'processing',
          total: '8.99',
        };
        return createdOrder;
      });

      // Context 1: search returns null initially, so context 1 creates the order
      const searchSpy = vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockImplementation(async () => {
        return createdOrder;
      });

      const paymentIntentContext1 = {
        id: 'pi_cross_instance_1',
        amount: 899,
        currency: 'gbp',
        status: 'succeeded',
        description: '1x 18W T8 Tube 3500k',
        metadata: {},
      } as unknown as Stripe.PaymentIntent;

      const orderInstance1 = await stripeSync.processOrderFromPaymentIntent(paymentIntentContext1, 'ch_1');
      expect(orderInstance1.id).toBe(44462);
      expect(createOrderSpy).toHaveBeenCalledTimes(1);

      // Context 2: Independent serverless instance (separate in-memory map).
      // Now search returns the created order from WooCommerce.
      const paymentIntentContext2 = {
        id: 'pi_cross_instance_1',
        amount: 899,
        currency: 'gbp',
        status: 'succeeded',
        description: '1x 18W T8 Tube 3500k',
        metadata: {},
      } as unknown as Stripe.PaymentIntent;

      const orderInstance2 = await stripeSync.processOrderFromPaymentIntent(paymentIntentContext2, 'ch_1');
      expect(orderInstance2.id).toBe(44462);
      // createWooCommerceOrder should still have only been called once!
      expect(createOrderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stripe order-status endpoint read-only behavior', () => {
    it('is strictly read-only and returns pending without creating an order even if fallback=true is requested', async () => {
      process.env.WOOCOMMERCE_URL = 'https://admin.example.com';
      process.env.WOOCOMMERCE_CONSUMER_KEY = 'ck_test';
      process.env.WOOCOMMERCE_CONSUMER_SECRET = 'cs_test';

      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        // Return empty orders array from WooCommerce search
        return new Response(JSON.stringify([]), { status: 200 });
      });

      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');

      const { GET } = await import('@/app/api/checkout/stripe/order-status/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/order-status?pi=pi_test_123&fallback=true');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ pending: true });
      expect(createOrderSpy).not.toHaveBeenCalled();
    });

    it('returns orderId when WooCommerce search finds an existing order', async () => {
      process.env.WOOCOMMERCE_URL = 'https://admin.example.com';
      process.env.WOOCOMMERCE_CONSUMER_KEY = 'ck_test';
      process.env.WOOCOMMERCE_CONSUMER_SECRET = 'cs_test';

      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify([{ id: 44463, number: '44463' }]), { status: 200 });
      });

      const { GET } = await import('@/app/api/checkout/stripe/order-status/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/order-status?pi=pi_test_123');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ orderId: '44463' });
    });
  });
});
