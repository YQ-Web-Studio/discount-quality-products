import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';
import * as woocommerce from '../../../src/lib/woocommerce';
import {
  parsePaymentIntentMetadata,
  buildRecoveryOrderPayload,
  matchChargeWithOrders,
  parseReconcileCliArgs,
  isEligibleReconciliationOrder,
  runReconciliation,
} from '../../../backend/tools/reconcile-stripe-orders';

describe('reconcile-stripe-orders engine', () => {
  describe('parsePaymentIntentMetadata', () => {
    it('decodes snake_case metadata (cart_items, delivery_address, cart_coupon, cart_discount)', () => {
      const metadata = {
        cart_items: JSON.stringify([{ i: 38338, q: 9 }]),
        cart_form: JSON.stringify({
          fn: 'Andrew',
          ln: 'Cook',
          em: 'acook@fiveacresgarage.co.uk',
          a1: 'Five Acres Garage',
          ct: 'Coleford',
          pc: 'GL16 7QN',
        }),
        delivery_address: JSON.stringify({
          firstName: 'Andrew',
          lastName: 'Cook',
          address1: 'Five Acres Garage',
          address2: 'Five Acres',
          city: 'Coleford',
          county: 'Gloucestershire',
          postcode: 'GL16 7QN',
          country: 'GB',
          phone: '01594832000',
        }),
        cart_coupon: 'THANKYOU10',
        cart_discount: '9.891',
      };

      const parsed = parsePaymentIntentMetadata(metadata);

      expect(parsed.items).toEqual([{ id: 38338, quantity: 9 }]);
      expect(parsed.customer.firstName).toBe('Andrew');
      expect(parsed.customer.lastName).toBe('Cook');
      expect(parsed.customer.email).toBe('acook@fiveacresgarage.co.uk');
      expect(parsed.customer.address2).toBe('Five Acres');
      expect(parsed.customer.county).toBe('Gloucestershire');
      expect(parsed.customer.postcode).toBe('GL16 7QN');
      expect(parsed.customer.phone).toBe('01594832000');
      expect(parsed.couponCode).toBe('THANKYOU10');
      expect(parsed.discountAmount).toBe(9.891);
    });

    it('decodes camelCase metadata (cartItems, cartForm, couponCode)', () => {
      const metadata = {
        cartItems: JSON.stringify([{ i: 10840, q: 1 }]),
        cartForm: JSON.stringify({
          fn: 'Priya',
          ln: 'Uppal',
          em: 'priyauppal@hotmail.com',
          a1: '3 Ormesby Bank',
          ct: 'Middlesbrough',
          co: 'England',
          pc: 'TS7 9HH',
          ph: '+447562458521',
        }),
      };

      const parsed = parsePaymentIntentMetadata(metadata);

      expect(parsed.items).toEqual([{ id: 10840, quantity: 1 }]);
      expect(parsed.customer.firstName).toBe('Priya');
      expect(parsed.customer.lastName).toBe('Uppal');
      expect(parsed.customer.email).toBe('priyauppal@hotmail.com');
      expect(parsed.customer.postcode).toBe('TS7 9HH');
    });

    it('falls back to databaseIds when cart_items JSON is missing', () => {
      const metadata = {
        databaseIds: '38338',
        cart_form: JSON.stringify({
          fn: 'Andrew',
          ln: 'Cook',
          em: 'acook@fiveacresgarage.co.uk',
        }),
      };

      const parsed = parsePaymentIntentMetadata(metadata);

      expect(parsed.items).toEqual([{ id: 38338, quantity: 1 }]);
      expect(parsed.customer.email).toBe('acook@fiveacresgarage.co.uk');
    });
  });

  describe('buildRecoveryOrderPayload', () => {
    it('constructs a valid WooCommerce processing order payload with voucher fee lines', () => {
      const payload = buildRecoveryOrderPayload({
        chargeId: 'ch_3UOeBh4Tt6mIhQxV1b5sx7M7',
        paymentIntentId: 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX',
        amountPence: 8902,
        customer: {
          firstName: 'Andrew',
          lastName: 'Cook',
          email: 'acook@fiveacresgarage.co.uk',
          address1: 'Five Acres Garage',
          city: 'Coleford',
          county: 'Gloucestershire',
          postcode: 'GL16 7QN',
          country: 'GB',
        },
        items: [{ id: 38338, quantity: 9 }],
        couponCode: 'THANKYOU10',
        discountAmount: 9.891,
      });

      expect(payload.status).toBe('processing');
      expect(payload.set_paid).toBe(true);
      expect(payload.currency).toBe('GBP');
      expect(payload.transaction_id).toBe('ch_3UOeBh4Tt6mIhQxV1b5sx7M7');
      expect(payload.billing.email).toBe('acook@fiveacresgarage.co.uk');
      expect(payload.line_items).toEqual([{ product_id: 38338, quantity: 9 }]);
      expect(payload.meta_data).toEqual(
        expect.arrayContaining([
          { key: '_stripe_charge_id', value: 'ch_3UOeBh4Tt6mIhQxV1b5sx7M7' },
          { key: '_stripe_payment_intent_id', value: 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX' },
          { key: '_stripe_intent_id', value: 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX' },
          { key: '_stripe_source_id', value: 'ch_3UOeBh4Tt6mIhQxV1b5sx7M7' },
          { key: '_recovered_coupon_code', value: 'THANKYOU10' },
        ])
      );
      // Fee line for discount without throwing rest_cannot_apply_coupon
      expect(payload.fee_lines).toEqual([
        {
          name: 'Voucher Discount (THANKYOU10)',
          total: '-8.24',
          tax_status: 'taxable',
        },
      ]);
    });

    it('does not produce fee_lines when discountAmount is 0, negative, or non-numeric', () => {
      const baseParams = {
        chargeId: 'ch_test',
        paymentIntentId: 'pi_test',
        amountPence: 5000,
        customer: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        items: [{ id: 101, quantity: 1 }],
      };

      const payloadZero = buildRecoveryOrderPayload({ ...baseParams, discountAmount: 0 });
      expect(payloadZero.fee_lines).toBeUndefined();

      const payloadNegative = buildRecoveryOrderPayload({ ...baseParams, discountAmount: -5 });
      expect(payloadNegative.fee_lines).toBeUndefined();

      const payloadNaN = buildRecoveryOrderPayload({ ...baseParams, discountAmount: NaN as any });
      expect(payloadNaN.fee_lines).toBeUndefined();

      const payloadNonNumeric = buildRecoveryOrderPayload({ ...baseParams, discountAmount: 'invalid' as any });
      expect(payloadNonNumeric.fee_lines).toBeUndefined();
    });
  });

  describe('matchChargeWithOrders', () => {
    it('returns order ID when transaction_id matches charge ID', () => {
      const orders = [
        { id: 1001, transaction_id: 'ch_previous_111' },
        { id: 1002, transaction_id: 'ch_3UOeBh4Tt6mIhQxV1b5sx7M7' },
      ];

      const match = matchChargeWithOrders('ch_3UOeBh4Tt6mIhQxV1b5sx7M7', 'pi_test', orders);
      expect(match).toBe(1002);
    });

    it('returns order ID when _stripe_payment_intent_id matches in meta_data', () => {
      const orders = [
        {
          id: 1003,
          meta_data: [{ key: '_stripe_payment_intent_id', value: 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX' }],
        },
      ];

      const match = matchChargeWithOrders('ch_other', 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX', orders);
      expect(match).toBe(1003);
    });

    it('returns order ID when _stripe_intent_id matches in meta_data (Sep 26 recovered pattern)', () => {
      const orders = [
        {
          id: 43351,
          meta_data: [{ key: '_stripe_intent_id', value: 'pi_3UBFQx4Tt6mIhQxV1nhdo4eJ' }],
        },
      ];

      const match = matchChargeWithOrders('ch_other', 'pi_3UBFQx4Tt6mIhQxV1nhdo4eJ', orders);
      expect(match).toBe(43351);
    });

    it('returns order ID when customer email and exact amount match', () => {
      const orders = [
        {
          id: 43350,
          total: '11.99',
          billing: { email: 'jaded_femme@hotmail.com' },
        },
      ];

      const match = matchChargeWithOrders('ch_untracked', 'pi_untracked', orders, 1199, 'jaded_femme@hotmail.com');
      expect(match).toBe(43350);
    });

    it('skips already claimed orders so duplicate charges cannot reuse them', () => {
      const orders = [
        {
          id: 43350,
          total: '11.99',
          billing: { email: 'jaded_femme@hotmail.com' },
        },
      ];
      const claimed = new Set<number>([43350]);

      const match = matchChargeWithOrders('ch_second', 'pi_second', orders, 1199, 'jaded_femme@hotmail.com', claimed);
      expect(match).toBeNull();
    });

    it('adds matched order ID to claimedOrderIds set', () => {
      const orders = [
        {
          id: 43350,
          total: '11.99',
          billing: { email: 'jaded_femme@hotmail.com' },
        },
      ];
      const claimed = new Set<number>();

      const match = matchChargeWithOrders('ch_first', 'pi_first', orders, 1199, 'jaded_femme@hotmail.com', claimed);
      expect(match).toBe(43350);
      expect(claimed.has(43350)).toBe(true);
    });

    it('skips cancelled, failed, and refunded orders', () => {
      const orders = [
        { id: 101, status: 'cancelled', total: '11.99', billing: { email: 'user@example.com' } },
        { id: 102, status: 'failed', total: '11.99', billing: { email: 'user@example.com' } },
        { id: 103, status: 'refunded', total: '11.99', billing: { email: 'user@example.com' } },
      ];

      const match = matchChargeWithOrders('ch_untracked', 'pi_untracked', orders, 1199, 'user@example.com');
      expect(match).toBeNull();
    });

    it('skips orders whose transaction_id or meta_data contains a conflicting Stripe ID', () => {
      const orders = [
        {
          id: 104,
          transaction_id: 'ch_different_stripe_charge',
          total: '11.99',
          billing: { email: 'user@example.com' },
        },
        {
          id: 105,
          total: '11.99',
          billing: { email: 'user@example.com' },
          meta_data: [{ key: '_stripe_charge_id', value: 'ch_another_different_charge' }],
        },
      ];

      const match = matchChargeWithOrders('ch_current', 'pi_current', orders, 1199, 'user@example.com');
      expect(match).toBeNull();
    });

    it('returns null on negative matching cases (different email, delta >= 0.05, missing fields)', () => {
      const orders = [
        {
          id: 43350,
          total: '11.99',
          billing: { email: 'user@example.com' },
        },
      ];

      // Different email
      expect(matchChargeWithOrders('ch_1', 'pi_1', orders, 1199, 'different@example.com')).toBeNull();

      // Amount difference of 0.05 or more
      expect(matchChargeWithOrders('ch_2', 'pi_2', orders, 1205, 'user@example.com')).toBeNull();
      expect(matchChargeWithOrders('ch_3', 'pi_3', orders, 1193, 'user@example.com')).toBeNull();

      // Missing customerEmail
      expect(matchChargeWithOrders('ch_4', 'pi_4', orders, 1199, undefined)).toBeNull();
      expect(matchChargeWithOrders('ch_5', 'pi_5', orders, 1199, '')).toBeNull();

      // Missing chargeAmountPence
      expect(matchChargeWithOrders('ch_6', 'pi_6', orders, undefined, 'user@example.com')).toBeNull();
    });

    it('prioritizes a later exact Stripe ID match over an earlier heuristic email/amount match', () => {
      const orders = [
        {
          id: 101,
          total: '11.99',
          billing: { email: 'customer@example.com' },
        },
        {
          id: 102,
          transaction_id: 'ch_exact_match_999',
          total: '11.99',
          billing: { email: 'customer@example.com' },
        },
      ];

      const claimed = new Set<number>();
      const match = matchChargeWithOrders(
        'ch_exact_match_999',
        'pi_exact_match_999',
        orders,
        1199,
        'customer@example.com',
        claimed
      );

      // Must select the exact match (102), not the earlier heuristic match (101)
      expect(match).toBe(102);
      expect(claimed.has(102)).toBe(true);
      expect(claimed.has(101)).toBe(false);
    });

    it('validates isEligibleReconciliationOrder rejects cancelled, failed, and refunded statuses', () => {
      expect(isEligibleReconciliationOrder({ id: 1, status: 'cancelled' })).toBe(false);
      expect(isEligibleReconciliationOrder({ id: 2, status: 'failed' })).toBe(false);
      expect(isEligibleReconciliationOrder({ id: 3, status: 'refunded' })).toBe(false);
      expect(isEligibleReconciliationOrder({ id: 4, status: 'processing' })).toBe(true);
      expect(isEligibleReconciliationOrder({ id: 5, status: 'completed' })).toBe(true);
      expect(isEligibleReconciliationOrder({ id: 6, status: 'pending' })).toBe(true);
      expect(isEligibleReconciliationOrder(null)).toBe(false);
    });

    it('returns null when charge is an orphan missing from WooCommerce', () => {
      const orders = [{ id: 1001, transaction_id: 'ch_unrelated' }];
      const match = matchChargeWithOrders('ch_3UOeBh4Tt6mIhQxV1b5sx7M7', 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX', orders);
      expect(match).toBeNull();
    });
  });

  describe('parseReconcileCliArgs', () => {
    it('parses --execute and --since flags correctly', () => {
      const argv = ['--since=2026-10-01', '--execute', '--pi=pi_specific_123'];
      const parsed = parseReconcileCliArgs(argv);

      expect(parsed.execute).toBe(true);
      expect(parsed.targetPi).toBe('pi_specific_123');
      expect(parsed.sinceTimestamp).toBe(Math.floor(new Date('2026-10-01').getTime() / 1000));
    });

    it('defaults to dry-run and 26 Sep 2026 when flags are omitted', () => {
      const parsed = parseReconcileCliArgs([]);

      expect(parsed.execute).toBe(false);
      expect(parsed.sinceTimestamp).toBe(Math.floor(new Date('2026-09-26T00:00:00Z').getTime() / 1000));
    });

    it('scans from 1 Sep 2026 with --include-pre-sep26 or --all unless --since is set', () => {
      const sep1Timestamp = Math.floor(new Date('2026-09-01T00:00:00Z').getTime() / 1000);

      expect(parseReconcileCliArgs(['--include-pre-sep26']).sinceTimestamp).toBe(sep1Timestamp);
      expect(parseReconcileCliArgs(['--all']).sinceTimestamp).toBe(sep1Timestamp);

      // Explicit --since takes precedence
      expect(parseReconcileCliArgs(['--all', '--since=2026-10-01']).sinceTimestamp).toBe(
        Math.floor(new Date('2026-10-01').getTime() / 1000)
      );
      expect(parseReconcileCliArgs(['--include-pre-sep26', '--since=2026-10-05']).sinceTimestamp).toBe(
        Math.floor(new Date('2026-10-05').getTime() / 1000)
      );
    });
  });

  describe('runReconciliation error and status handling', () => {
    const originalArgv = process.argv;
    const originalStripeKey = process.env.STRIPE_SECRET_KEY;

    beforeEach(() => {
      vi.restoreAllMocks();
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_secret_key_123';
      process.argv = ['node', 'reconcile-stripe-orders.ts', '--since=2026-10-01'];
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.argv = originalArgv;
      if (originalStripeKey !== undefined) {
        process.env.STRIPE_SECRET_KEY = originalStripeKey;
      } else {
        delete process.env.STRIPE_SECRET_KEY;
      }
    });

    it('does not call createWooCommerceOrder when live WooCommerce lookup throws', async () => {
      const mockCharge = {
        id: 'ch_error_charge_123',
        status: 'succeeded',
        payment_intent: 'pi_error_pi_123',
        amount: 2500,
        created: 1727740800,
        billing_details: { email: 'network-error@example.com', name: 'Network Error' },
      };

      const mockStripe = {
        charges: {
          list: vi.fn().mockResolvedValue({
            data: [mockCharge],
            has_more: false,
          }),
        },
        paymentIntents: {
          retrieve: vi.fn(),
        },
      } as unknown as Stripe;

      vi.spyOn(woocommerce, 'fetchWooCommerceOrders').mockResolvedValue([]);
      vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockRejectedValue(
        new Error('WooCommerce API 503 Service Unavailable')
      );
      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder').mockResolvedValue({ id: 9999 } as any);

      await runReconciliation(mockStripe);

      expect(createOrderSpy).not.toHaveBeenCalled();
    });

    it('does not call createWooCommerceOrder when live lookup finds an ineligible order (cancelled/failed/refunded)', async () => {
      const mockCharge = {
        id: 'ch_cancelled_charge_123',
        status: 'succeeded',
        payment_intent: 'pi_cancelled_pi_123',
        amount: 3000,
        created: 1727740800,
        billing_details: { email: 'cancelled@example.com', name: 'Cancelled Customer' },
      };

      const mockStripe = {
        charges: {
          list: vi.fn().mockResolvedValue({
            data: [mockCharge],
            has_more: false,
          }),
        },
        paymentIntents: {
          retrieve: vi.fn(),
        },
      } as unknown as Stripe;

      vi.spyOn(woocommerce, 'fetchWooCommerceOrders').mockResolvedValue([]);
      vi.spyOn(woocommerce, 'searchWooCommerceOrderByPaymentIntent').mockResolvedValue({
        id: 7777,
        status: 'cancelled',
        total: '30.00',
      } as any);
      const createOrderSpy = vi.spyOn(woocommerce, 'createWooCommerceOrder').mockResolvedValue({ id: 9999 } as any);

      await runReconciliation(mockStripe);

      expect(createOrderSpy).not.toHaveBeenCalled();
    });
  });
});

