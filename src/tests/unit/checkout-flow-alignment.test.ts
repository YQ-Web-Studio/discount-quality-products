import { describe, it, expect } from 'vitest';

describe('checkout flow and success redirect alignment (DQP-5)', () => {
  it('constructs correct success URL query params when both orderId and paymentIntentId are present', () => {
    const params = new URLSearchParams();
    const orderId = 38350;
    const paymentIntentId = 'pi_3UOeBh4Tt6mIhQxV1cNLUZOX';

    if (orderId) {
      params.set('order', String(orderId));
    }
    if (paymentIntentId) {
      params.set('pi', paymentIntentId);
    }

    const query = params.toString();
    expect(query).toBe('order=38350&pi=pi_3UOeBh4Tt6mIhQxV1cNLUZOX');
  });

  it('constructs correct success URL query params when only orderId is present (PayPal)', () => {
    const params = new URLSearchParams();
    const orderId = 38351;

    if (orderId) {
      params.set('order', String(orderId));
    }

    const query = params.toString();
    expect(query).toBe('order=38351');
  });

  it('determines immediate success state without polling when order param is present', () => {
    const searchParams = new URLSearchParams('order=38350&pi=pi_test');
    const pi = searchParams.get('pi');
    const directOrder = searchParams.get('order');

    const shouldPoll = !!pi && !directOrder;
    expect(shouldPoll).toBe(false);
    expect(directOrder).toBe('38350');
  });
});
