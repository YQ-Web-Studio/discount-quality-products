import { describe, it, expect } from 'vitest';
import {
  parsePaymentIntentMetadata,
  buildRecoveryOrderPayload,
  matchChargeWithOrders,
  parseReconcileCliArgs,
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
  });
});
