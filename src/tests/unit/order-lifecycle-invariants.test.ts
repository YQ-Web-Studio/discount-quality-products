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
import {
  transitionOrderStatus,
  IllegalOrderStateTransitionError,
  isAllowedStatusTransition,
  OrderStatus,
} from '@/lib/order-lifecycle';

describe('Enterprise Order Lifecycle Invariants (DQP-16)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPaymentIntentsCreate.mockReset();
    mockPaymentIntentsRetrieve.mockReset();
    mockPaymentIntentsCancel.mockReset();
    mockPaymentIntentsUpdate.mockReset();
  });

  describe('Order State Machine Transition Invariants', () => {
    it('allows legal forward transitions according to enterprise lifecycle matrix', () => {
      // Pending transitions
      expect(isAllowedStatusTransition('pending', 'processing')).toBe(true);
      expect(isAllowedStatusTransition('pending', 'on-hold')).toBe(true);
      expect(isAllowedStatusTransition('pending', 'cancelled')).toBe(true);
      expect(isAllowedStatusTransition('pending', 'failed')).toBe(true);

      // Processing transitions
      expect(isAllowedStatusTransition('processing', 'completed')).toBe(true);
      expect(isAllowedStatusTransition('processing', 'refunded')).toBe(true);

      // On-hold transitions
      expect(isAllowedStatusTransition('on-hold', 'processing')).toBe(true);
      expect(isAllowedStatusTransition('on-hold', 'cancelled')).toBe(true);

      // Completed transitions
      expect(isAllowedStatusTransition('completed', 'refunded')).toBe(true);
    });

    it('strictly forbids destructive downgrades of paid orders (processing -> cancelled/failed)', () => {
      expect(isAllowedStatusTransition('processing', 'cancelled')).toBe(false);
      expect(isAllowedStatusTransition('processing', 'failed')).toBe(false);
      expect(isAllowedStatusTransition('processing', 'pending')).toBe(false);
      expect(isAllowedStatusTransition('completed', 'cancelled')).toBe(false);
      expect(isAllowedStatusTransition('completed', 'failed')).toBe(false);
      expect(isAllowedStatusTransition('completed', 'processing')).toBe(false);
    });

    it('transitionOrderStatus throws IllegalOrderStateTransitionError when trying to cancel a processing order', async () => {
      const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({});
      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 44503,
        status: 'processing',
        total: '5.98',
        transaction_id: 'ch_test_123',
      });

      await expect(
        transitionOrderStatus(44503, 'cancelled', {
          reason: 'Checkout session replaced by new payment intent.',
        })
      ).rejects.toThrow(IllegalOrderStateTransitionError);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('transitionOrderStatus allows transitioning a pending order to cancelled with audit note', async () => {
      const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
        id: 44504,
        status: 'cancelled',
      });
      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 44504,
        status: 'pending',
        total: '10.00',
      });

      const result = await transitionOrderStatus(44504, 'cancelled', {
        customerNote: 'Customer abandoned checkout.',
      });

      expect(updateSpy).toHaveBeenCalledWith(44504, expect.objectContaining({
        status: 'cancelled',
        customer_note: 'Customer abandoned checkout.',
      }));
      expect(result.status).toBe('cancelled');
    });

    it('transitionOrderStatus allows promoting a pending order to processing upon payment capture', async () => {
      const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
        id: 44505,
        status: 'processing',
      });
      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 44505,
        status: 'pending',
        total: '25.00',
      });

      const result = await transitionOrderStatus(44505, 'processing', {
        transactionId: 'ch_capture_999',
        setPaid: true,
      });

      expect(updateSpy).toHaveBeenCalledWith(44505, expect.objectContaining({
        status: 'processing',
        set_paid: true,
        transaction_id: 'ch_capture_999',
      }));
      expect(result.status).toBe('processing');
    });

    it('persists options (transactionId, setPaid, notes) even when order is already in the target status', async () => {
      const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
        id: 44506,
        status: 'processing',
      });
      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 44506,
        status: 'processing',
        total: '30.00',
      });

      const result = await transitionOrderStatus(44506, 'processing', {
        transactionId: 'ch_existing_capture_888',
        setPaid: true,
        customerNote: 'Confirmed payment receipt.',
      });

      expect(updateSpy).toHaveBeenCalledWith(44506, expect.objectContaining({
        set_paid: true,
        transaction_id: 'ch_existing_capture_888',
        customer_note: 'Confirmed payment receipt.',
      }));
      // Status itself doesn't need to be set if already matching
      expect(result.status).toBe('processing');
    });
  });

  describe('create-intent endpoint purity & regression invariants', () => {
    it('rejects empty or invalid cart immediately with 400 before touching Stripe or WooCommerce', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: false,
        error: 'Your basket is empty.',
        subtotal: 0,
        discountAmount: 0,
        vat: 0,
        shippingCost: 0,
        finalTotal: 0,
      });

      const retrieveSpy = mockPaymentIntentsRetrieve;
      const updateOrderSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder');

      const { POST } = await import('@/app/api/checkout/stripe/create-intent/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [],
          shippingMethod: 'standard',
          previousPaymentIntentId: 'pi_3UcjrA4Tt6mIhQxV1xQO373C',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Your basket is empty.');

      // Zero side-effects must have occurred
      expect(retrieveSpy).not.toHaveBeenCalled();
      expect(updateOrderSpy).not.toHaveBeenCalled();
    });

    it('REGRESSION (Order #44503 Incident): Never cancels a paid order or succeeded PI during create-intent', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 5.98,
        discountAmount: 0,
        vat: 1.00,
        shippingCost: 0,
        finalTotal: 5.98,
        shippingTitle: 'Free Delivery',
      });

      // Old PI is ALREADY SUCCEEDED and linked to Order #44503 in processing
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_3UcjrA4Tt6mIhQxV1xQO373C',
        status: 'succeeded',
        metadata: {
          orderId: '44503',
          wc_order_id: '44503',
        },
      });

      vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue({
        id: 44503,
        status: 'processing',
        total: '5.98',
        transaction_id: 'ch_3UcjrA4Tt6mIhQxV1ANGaxfB',
      });

      const updateOrderSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder');
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_new_99999',
        client_secret: 'pi_new_secret_999',
        metadata: {},
      });

      const { POST } = await import('@/app/api/checkout/stripe/create-intent/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: '483', quantity: 2 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'David',
            lastName: 'Blair',
            email: 'farmtanycoed@gmail.com',
            address1: 'Farm',
            city: 'Brecon',
            postcode: 'LD3 8RR',
            country: 'GB',
          },
          previousPaymentIntentId: 'pi_3UcjrA4Tt6mIhQxV1xQO373C',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // CRITICAL INVARIANT: Succeeded PI must NEVER be cancelled
      expect(mockPaymentIntentsCancel).not.toHaveBeenCalledWith('pi_3UcjrA4Tt6mIhQxV1xQO373C');

      // CRITICAL INVARIANT: Order #44503 must NEVER be cancelled
      expect(updateOrderSpy).not.toHaveBeenCalledWith(44503, expect.objectContaining({
        status: 'cancelled',
      }));
    });

    it('cancels uncompleted Stripe PI on Stripe when retrying, but never touches WooCommerce', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 10.00,
        discountAmount: 0,
        vat: 1.67,
        shippingCost: 0,
        finalTotal: 10.00,
        shippingTitle: 'Free Delivery',
      });

      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_uncompleted_123',
        status: 'requires_payment_method',
        metadata: {},
      });

      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_new_234',
        client_secret: 'pi_new_secret_234',
        metadata: {},
      });

      const updateOrderSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder');

      const { POST } = await import('@/app/api/checkout/stripe/create-intent/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: '101', quantity: 1 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
            address1: '123 High St',
            city: 'London',
            postcode: 'E1 6AN',
            country: 'GB',
          },
          previousPaymentIntentId: 'pi_uncompleted_123',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Stripe PI cancel is invoked to keep Stripe dashboard tidy
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith('pi_uncompleted_123');
      // But ZERO order updates happen
      expect(updateOrderSpy).not.toHaveBeenCalled();
    });

    it('does NOT cancel previous payment intent if status is requires_action (preserves in-flight 3DS)', async () => {
      vi.spyOn(checkoutLib, 'validateCartTotals').mockResolvedValue({
        isValid: true,
        subtotal: 10.00,
        discountAmount: 0,
        vat: 1.67,
        shippingCost: 0,
        finalTotal: 10.00,
        shippingTitle: 'Free Delivery',
      });
      mockPaymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_3ds_in_flight',
        status: 'requires_action',
        metadata: {},
      });
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: 'pi_new_3ds_test',
        client_secret: 'pi_new_secret_3ds',
        metadata: {},
      });
      mockPaymentIntentsCancel.mockClear();

      const { POST } = await import('@/app/api/checkout/stripe/create-intent/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: '101', name: 'Bulb', price: 9.99, quantity: 1 }],
          shippingMethod: 'standard',
          form: {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
            address1: '123 High St',
            city: 'London',
            postcode: 'E1 6AN',
            country: 'GB',
          },
          previousPaymentIntentId: 'pi_3ds_in_flight',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Payment intent in requires_action MUST NOT be cancelled
      expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();
    });
  });

  describe('WordPress Backend Domain Invariant Snippet (005-order-state-machine-guard.php)', () => {
    const fs = require('fs');
    const path = require('path');
    const snippetPath = path.resolve(
      process.cwd(),
      'backend/wordpress/snippets/005-order-state-machine-guard.php'
    );

    it('exists and defines standard WordPress snippet header comments', () => {
      expect(fs.existsSync(snippetPath)).toBe(true);
      const content = fs.readFileSync(snippetPath, 'utf-8');

      expect(content).toContain('Snippet Name: Order Lifecycle State Machine & Immutable Paid Order Guard');
      expect(content).toContain('Scope: global');
      expect(content).toContain('Ticket: DQP-16');
      expect(content).toContain('if (!defined(\'ABSPATH\'))');
    });

    it('implements woocommerce_rest_pre_insert_shop_order_object filter and woocommerce_order_status_changed action', () => {
      const content = fs.readFileSync(snippetPath, 'utf-8');

      expect(content).toContain("add_filter('woocommerce_rest_pre_insert_shop_order_object'");
      expect(content).toContain("add_action('woocommerce_order_status_changed'");
      expect(content).toContain("'processing'");
      expect(content).toContain("'completed'");
      expect(content).toContain("'cancelled'");
      expect(content).toContain("'failed'");
      expect(content).toContain('rest_forbidden_status_transition');
      expect(content).toContain('403');
    });
  });
});

