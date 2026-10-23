import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as woocommerce from '../../../src/lib/woocommerce';
import * as email from '../../../src/lib/email';
import { processOrderFromPaymentIntent, handleFailedPaymentIntent } from '../../../src/lib/stripe-sync';
import Stripe from 'stripe';

describe('atomic pending-order-first stripe lifecycle (DQP-5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(email, 'sendEmail').mockResolvedValue({ id: 'email_test_123' } as any);
  });

  it('promotes an existing pending order to processing using metadata.orderId (Path A)', async () => {
    const mockOrder = {
      id: 38350,
      status: 'pending',
      total: '89.02',
      billing: { email: 'acook@fiveacresgarage.co.uk', first_name: 'Andrew' },
      shipping: { first_name: 'Andrew', last_name: 'Cook' },
      line_items: [{ id: 1, name: 'GX24q-4 CFL Bulb', quantity: 9, total: '89.02' }],
    };

    const fetchSpy = vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue(mockOrder as any);
    const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
      ...mockOrder,
      status: 'processing',
      set_paid: true,
      transaction_id: 'ch_test_123',
    } as any);

    const paymentIntent = {
      id: 'pi_test_12345',
      metadata: {
        orderId: '38350',
        cart_items: JSON.stringify([{ i: 38338, q: 9 }]),
        cart_form: JSON.stringify({
          fn: 'Andrew',
          ln: 'Cook',
          em: 'acook@fiveacresgarage.co.uk',
          a1: 'Five Acres Garage',
          ct: 'Coleford',
          pc: 'GL16 7HB',
        }),
      },
    } as unknown as Stripe.PaymentIntent;

    const result = await processOrderFromPaymentIntent(paymentIntent, 'ch_test_123');

    expect(fetchSpy).toHaveBeenCalledWith(38350);
    expect(updateSpy).toHaveBeenCalledWith(
      38350,
      expect.objectContaining({
        status: 'processing',
        set_paid: true,
        transaction_id: 'ch_test_123',
      })
    );
    expect(result.status).toBe('processing');
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'acook@fiveacresgarage.co.uk',
      })
    );
  });

  it('is idempotent: skips duplicate promotion and email when order is already processing', async () => {
    const mockOrder = {
      id: 38350,
      status: 'processing',
      total: '89.02',
      billing: { email: 'acook@fiveacresgarage.co.uk', first_name: 'Andrew' },
      line_items: [],
    };

    const fetchSpy = vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue(mockOrder as any);
    const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder');

    const paymentIntent = {
      id: 'pi_test_12345',
      metadata: {
        orderId: '38350',
        cart_items: JSON.stringify([{ i: 38338, q: 9 }]),
        cart_form: JSON.stringify({ em: 'acook@fiveacresgarage.co.uk' }),
      },
    } as unknown as Stripe.PaymentIntent;

    const result = await processOrderFromPaymentIntent(paymentIntent, 'ch_test_123');

    expect(fetchSpy).toHaveBeenCalledWith(38350);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(result.id).toBe(38350);
  });

  it('marks pending order as failed when payment fails', async () => {
    const mockOrder = {
      id: 38350,
      status: 'pending',
    };

    const fetchSpy = vi.spyOn(woocommerce, 'fetchWooCommerceOrder').mockResolvedValue(mockOrder as any);
    const updateSpy = vi.spyOn(woocommerce, 'updateWooCommerceOrder').mockResolvedValue({
      ...mockOrder,
      status: 'failed',
    } as any);

    const paymentIntent = {
      id: 'pi_failed_123',
      metadata: { orderId: '38350' },
      last_payment_error: { message: 'Card was declined.' },
    } as unknown as Stripe.PaymentIntent;

    await handleFailedPaymentIntent(paymentIntent);

    expect(fetchSpy).toHaveBeenCalledWith(38350);
    expect(updateSpy).toHaveBeenCalledWith(
      38350,
      expect.objectContaining({
        status: 'failed',
        customer_note: expect.stringContaining('Card was declined'),
      })
    );
  });
});
