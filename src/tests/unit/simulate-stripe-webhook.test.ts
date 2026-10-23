import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import {
  computeStripeSignature,
  buildSignedWebhookPayload,
  parseSimulatorArgs,
} from '../../../backend/tools/simulate-stripe-webhook';

describe('simulate-stripe-webhook', () => {
  const secret = 'whsec_test_secret_for_unit_tests_1234567890';
  const stripe = new Stripe('sk_test_dummy', {
    apiVersion: '2023-10-16' as any,
  });

  describe('computeStripeSignature', () => {
    it('generates a valid Stripe signature string matching Stripe RFC specifications', () => {
      const payload = JSON.stringify({ id: 'evt_123', object: 'event' });
      const nowSeconds = Math.floor(Date.now() / 1000);

      const { timestamp, signature, header } = computeStripeSignature(payload, secret, nowSeconds);

      expect(timestamp).toBe(nowSeconds);
      expect(header).toBe(`t=${nowSeconds},v1=${signature}`);
      expect(signature).toHaveLength(64); // SHA-256 hex string

      // Verify that Stripe's official SDK accepts the computed signature header
      const verifiedEvent = stripe.webhooks.constructEvent(payload, header, secret);
      expect(verifiedEvent.id).toBe('evt_123');
    });
  });

  describe('buildSignedWebhookPayload', () => {
    it('builds a payment_intent.succeeded payload and header verifiable by Stripe SDK', () => {
      const result = buildSignedWebhookPayload({
        event: 'payment_intent.succeeded',
        orderId: '38338',
        paymentIntentId: 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX',
        amount: 8902,
        secret,
      });

      expect(result.eventObject.type).toBe('payment_intent.succeeded');
      expect(result.eventObject.data.object.id).toBe('pi_3UOeBh4Tt6mIhQxV1cNLUZOX');
      expect(result.eventObject.data.object.amount).toBe(8902);
      expect(result.eventObject.data.object.metadata.orderId).toBe('38338');

      // Verify with Stripe SDK
      const constructed = stripe.webhooks.constructEvent(result.payload, result.signatureHeader, secret);
      expect(constructed.type).toBe('payment_intent.succeeded');
      expect(constructed.id).toBe(result.eventObject.id);
    });

    it('builds a payment_intent.payment_failed payload verifiable by Stripe SDK', () => {
      const result = buildSignedWebhookPayload({
        event: 'payment_intent.payment_failed',
        orderId: '4001',
        paymentIntentId: 'pi_failed_test_123',
        amount: 2500,
        secret,
      });

      expect(result.eventObject.type).toBe('payment_intent.payment_failed');
      expect(result.eventObject.data.object.last_payment_error).toBeDefined();

      const constructed = stripe.webhooks.constructEvent(result.payload, result.signatureHeader, secret);
      expect(constructed.type).toBe('payment_intent.payment_failed');
    });
  });

  describe('parseSimulatorArgs', () => {
    it('parses custom command line arguments correctly', () => {
      const argv = [
        '--event=payment_intent.payment_failed',
        '--orderId=9999',
        '--pi=pi_custom_999',
        '--amount=4999',
        '--secret=whsec_custom_override',
        '--url=http://localhost:3001/api/webhooks/stripe',
      ];

      const parsed = parseSimulatorArgs(argv);

      expect(parsed.event).toBe('payment_intent.payment_failed');
      expect(parsed.orderId).toBe('9999');
      expect(parsed.paymentIntentId).toBe('pi_custom_999');
      expect(parsed.amount).toBe(4999);
      expect(parsed.secret).toBe('whsec_custom_override');
      expect(parsed.url).toBe('http://localhost:3001/api/webhooks/stripe');
    });

    it('applies standard defaults when arguments are omitted', () => {
      const parsed = parseSimulatorArgs([]);

      expect(parsed.event).toBe('payment_intent.succeeded');
      expect(parsed.orderId).toBe('1001');
      expect(parsed.amount).toBe(8902);
      expect(parsed.url).toBe('http://localhost:3000/api/webhooks/stripe');
      expect(parsed.paymentIntentId).toMatch(/^pi_simulated_/);
    });
  });
});
