import { describe, it, expect } from 'vitest';
import {
  parsePaymentIntentMetadata,
  buildRecoveryOrderPayload,
  matchChargeWithOrders,
  parseReconcileCliArgs,
} from '../../../backend/tools/reconcile-stripe-orders';

describe('reconcile-stripe-orders engine', () => {
  describe('parsePaymentIntentMetadata', () => {
    it('decodes compact cart items and form data from Stripe PaymentIntent metadata', () => {
      const metadata = {
        cartItems: JSON.stringify([{ i: 38338, q: 9 }]),
        cartForm: JSON.stringify({
          fn: 'Andrew',
          ln: 'Cook',
          em: 'acook@fiveacresgarage.co.uk',
          a1: 'Five Acres Garage',
          ct: 'Coleford',
          co: 'Gloucestershire',
          pc: 'GL16 7HB',
          ph: '01594832000',
        }),
        couponCode: 'THANKYOU10',
      };

      const parsed = parsePaymentIntentMetadata(metadata);

      expect(parsed.items).toEqual([{ id: 38338, quantity: 9 }]);
      expect(parsed.customer.firstName).toBe('Andrew');
      expect(parsed.customer.lastName).toBe('Cook');
      expect(parsed.customer.email).toBe('acook@fiveacresgarage.co.uk');
      expect(parsed.customer.postcode).toBe('GL16 7HB');
      expect(parsed.couponCode).toBe('THANKYOU10');
    });

    it('falls back to databaseIds when cartItems JSON is missing', () => {
      const metadata = {
        databaseIds: '38338',
        cartForm: JSON.stringify({
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
    it('constructs a valid WooCommerce processing order payload for Andrew Cook', () => {
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
          postcode: 'GL16 7HB',
          country: 'GB',
        },
        items: [{ id: 38338, quantity: 9 }],
        couponCode: 'THANKYOU10',
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
        ])
      );
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
      expect(parsed.sinceTimestamp).toBe(1727308800); // 2026-09-26 00:00:00 UTC
    });
  });
});
