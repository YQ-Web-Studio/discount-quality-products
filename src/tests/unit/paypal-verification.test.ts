import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyPaymentServerSide,
  buildPendingOrderPayload,
  validatePayPalCaptureDetails,
} from '../../../src/lib/server-payment-verify';

describe('server-side payment verification (DQP-5)', () => {
  describe('validatePayPalCaptureDetails', () => {
    it('approves a valid completed GBP capture matching expected amount', () => {
      const captureDetails = {
        status: 'COMPLETED',
        amount: {
          currency_code: 'GBP',
          value: '89.02',
        },
      };

      const result = validatePayPalCaptureDetails(captureDetails, 89.02);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects capture if status is not COMPLETED', () => {
      const captureDetails = {
        status: 'PENDING',
        amount: {
          currency_code: 'GBP',
          value: '89.02',
        },
      };

      const result = validatePayPalCaptureDetails(captureDetails, 89.02);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Capture status is PENDING, expected COMPLETED');
    });

    it('rejects capture with mismatched currency', () => {
      const captureDetails = {
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: '89.02',
        },
      };

      const result = validatePayPalCaptureDetails(captureDetails, 89.02);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Currency mismatch');
    });

    it('rejects capture with mismatched amount', () => {
      const captureDetails = {
        status: 'COMPLETED',
        amount: {
          currency_code: 'GBP',
          value: '10.00',
        },
      };

      const result = validatePayPalCaptureDetails(captureDetails, 89.02);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Amount mismatch');
    });
  });

  describe('buildPendingOrderPayload', () => {
    it('creates WooCommerce payload with status pending and set_paid false', () => {
      const payload = buildPendingOrderPayload({
        items: [{ id: 38338, quantity: 9 }],
        form: {
          firstName: 'Andrew',
          lastName: 'Cook',
          email: 'acook@fiveacresgarage.co.uk',
          address1: 'Five Acres',
          city: 'Coleford',
          county: 'Gloucestershire',
          postcode: 'GL16 7HB',
        },
        shippingCost: 0,
        shippingTitle: 'Free Delivery',
        paymentProvider: 'paypal',
        couponCode: 'THANKYOU10',
      });

      expect(payload.status).toBe('pending');
      expect(payload.set_paid).toBe(false);
      expect(payload.payment_method).toBe('ppcp-gateway');
      expect(payload.currency).toBe('GBP');
      expect(payload.line_items).toEqual([{ product_id: 38338, quantity: 9 }]);
    });
  });

  describe('verifyPaymentServerSide', () => {
    it('rejects unverified or fabricated transaction IDs with error', async () => {
      const result = await verifyPaymentServerSide({
        provider: 'paypal',
        transactionId: 'FAKE-123',
        expectedAmount: 89.02,
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
