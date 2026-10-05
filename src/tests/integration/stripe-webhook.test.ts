import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as stripeSync from '@/lib/stripe-sync';
import * as woocommerce from '@/lib/woocommerce';
import * as email from '@/lib/email';
import Stripe from 'stripe';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock email sending
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
}));

describe('Stripe Webhook & Order Idempotency Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createMockPaymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent => ({
    id: 'pi_test_123456789',
    object: 'payment_intent',
    amount: 5000,
    currency: 'gbp',
    status: 'succeeded',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    client_secret: 'pi_test_123456789_secret_xyz',
    metadata: {
      cart_items: JSON.stringify([{ i: 201, q: 2 }]),
      cart_shipping: 'standard',
      cart_shipping_cost: '0',
      cart_shipping_title: 'Free Delivery',
      cart_form: JSON.stringify({
        fn: 'Jane',
        ln: 'Doe',
        em: 'jane.doe@example.com',
        a1: '10 Downing Street',
        ct: 'London',
        pc: 'SW1A 2AA',
      }),
      wc_order_id: '9001',
    },
    ...overrides,
  } as Stripe.PaymentIntent);

  describe('Webhook Endpoint Security & Validation', () => {
    it('returns 400 when stripe-signature header is absent', async () => {
      // Set test webhook secret
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_123';

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const req = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing signature.');
    });

    it('returns 400 when stripe-signature fails cryptographic verification', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_123';

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const req = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=123456,v1=tampered_signature_payload',
        },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Webhook signature invalid');
    });
  });

  describe('Order Processing Idempotency Guards', () => {
    it('Path A: skips duplicate updates and emails when order is already in "processing" status', async () => {
      const mockPI = createMockPaymentIntent({
        metadata: {
          cart_items: JSON.stringify([{ i: 201, q: 1 }]),
          cart_form: JSON.stringify({ fn: 'John', ln: 'Doe', em: 'john@example.com', a1: 'High St', ct: 'London', pc: 'E1 1AA' }),
          wc_order_id: '8888',
        },
      });

      // Existing order is already processing
      const fetchSpy = vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 8888,
        number: '8888',
        status: 'processing',
        total: '50.00',
        billing: { email: 'john@example.com', first_name: 'John' },
      } as unknown as Record<string, unknown>);

      const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder');
      const emailSpy = vi.spyOn(email, 'sendEmail');

      const result = await stripeSync.processOrderFromPaymentIntent(mockPI, 'ch_charge_123');

      expect(fetchSpy).toHaveBeenCalledWith(8888);
      // Crucial: Must NOT update again
      expect(updateSpy).not.toHaveBeenCalled();
      // Crucial: Must NOT send duplicate confirmation email
      expect(emailSpy).not.toHaveBeenCalled();
      expect(result.id).toBe(8888);
      expect(result.status).toBe('processing');
    });

    it('Path A: promotes pending order to processing and captures Stripe metadata', async () => {
      const mockPI = createMockPaymentIntent({
        metadata: {
          cart_items: JSON.stringify([{ i: 201, q: 1 }]),
          cart_shipping: 'standard',
          cart_shipping_cost: '0',
          cart_shipping_title: 'Free Delivery',
          cart_form: JSON.stringify({ fn: 'Alice', ln: 'Smith', em: 'alice@example.com', a1: 'Baker St', ct: 'London', pc: 'NW1 6XE' }),
          wc_order_id: '7777',
        },
      });

      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 7777,
        number: '7777',
        status: 'pending',
        total: '45.00',
        billing: { email: 'alice@example.com', first_name: 'Alice' },
      } as unknown as Record<string, unknown>);

      const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
        id: 7777,
        number: '7777',
        status: 'processing',
        total: '45.00',
        date_created: new Date().toISOString(),
        billing: { email: 'alice@example.com', first_name: 'Alice' },
      } as unknown as Record<string, unknown>);

      const result = await stripeSync.processOrderFromPaymentIntent(mockPI, 'ch_charge_999');

      expect(updateSpy).toHaveBeenCalledWith(
        7777,
        expect.objectContaining({
          status: 'processing',
          set_paid: true,
          transaction_id: 'ch_charge_999',
          meta_data: expect.arrayContaining([
            { key: '_stripe_intent_id', value: 'pi_test_123456789' },
            { key: '_stripe_charge_id', value: 'ch_charge_999' },
            { key: '_stripe_charge_captured', value: 'yes' },
          ]),
        })
      );
      expect(result.id).toBe(7777);
    });

    it('Path B Deduplication: avoids duplicate creation if order already exists by PaymentIntent search', async () => {
      // Payment intent with NO pre-existing wc_order_id
      const mockPI = createMockPaymentIntent({
        id: 'pi_unlinked_999',
        metadata: {
          cart_items: JSON.stringify([{ i: 301, q: 1 }]),
          cart_form: JSON.stringify({ fn: 'Bob', ln: 'Taylor', em: 'bob@example.com', a1: 'King St', ct: 'York', pc: 'YO1 1AA' }),
        },
      });

      const searchSpy = vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockResolvedValue({
        id: 6543,
        number: '6543',
        status: 'processing',
      } as unknown as Record<string, unknown>);

      const createSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');

      const result = await stripeSync.processOrderFromPaymentIntent(mockPI, 'ch_charge_unlinked');

      expect(searchSpy).toHaveBeenCalledWith('pi_unlinked_999');
      // Crucial: Must NOT create a second order
      expect(createSpy).not.toHaveBeenCalled();
      expect(result.id).toBe(6543);
    });

    it('fails safely and returns null if existing order update encounters an error (triggers webhook retry without duplicates)', async () => {
      const mockPI = createMockPaymentIntent({
        metadata: {
          cart_items: JSON.stringify([{ i: 201, q: 1 }]),
          cart_form: JSON.stringify({ fn: 'Dan', ln: 'Evans', em: 'dan@example.com', a1: 'Queen St', ct: 'Bath', pc: 'BA1 1AA' }),
          wc_order_id: '5555',
        },
      });

      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 5555,
        number: '5555',
        status: 'pending',
      } as unknown as Record<string, unknown>);

      vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockRejectedValue(new Error('WooCommerce 503 Service Unavailable'));
      const createSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder');

      const result = await stripeSync.processOrderFromPaymentIntent(mockPI, 'ch_fail');

      // Crucial: Returns null to trigger webhook 500 retry, NEVER falls through to Path B createWooCommerceOrder
      expect(result).toBeNull();
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
