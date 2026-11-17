import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { useBasket } from '@/lib/useBasket';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({
    confirmPayment: vi.fn().mockResolvedValue({
      paymentIntent: { id: 'pi_test_succeeded_123', status: 'succeeded' },
    }),
    paymentRequest: () => ({
      canMakePayment: () => Promise.resolve(null),
    }),
  }),
  useElements: () => ({
    submit: vi.fn().mockResolvedValue({}),
  }),
}));

// Mock PayPal
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PayPalButtons: () => <div data-testid="paypal-buttons" />,
}));

// Mock Turnstile
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile" />,
}));

import CheckoutFlow from '@/app/checkout/CheckoutFlow';

describe('CheckoutFlow Payment Terminal State Guard (DQP-16)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    useBasket.getState().clearBasket();
    useBasket.getState().addItem(
      {
        id: '101',
        name: 'LED Bulb',
        price: 9.99,
        priceFormatted: '£9.99',
        slug: 'led-bulb',
      },
      1
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('completes payment, clears basket, and prevents create-intent reinitialisation on subsequent rerenders', async () => {
    let createIntentCalls = 0;

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/checkout/stripe/create-intent')) {
        createIntentCalls++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              clientSecret: 'pi_test_secret_123',
              paymentIntentId: 'pi_test_succeeded_123',
            }),
        });
      }
      if (url.includes('/api/checkout/shipping-rates')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              shippingRates: [
                { id: 'standard', label: 'Standard Delivery (2-3 working days)', price: 0 },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    global.fetch = fetchMock;

    let componentRender: any;
    await act(async () => {
      componentRender = render(<CheckoutFlow />);
    });

    const { rerender } = componentRender;

    // Advance through the checkout steps to the payment step
    // 1. Fill details form
    const emailInput = screen.getByLabelText(/Email Address/i);
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const addressInput = screen.getByLabelText(/Address Line 1/i);
    const cityInput = screen.getByLabelText(/Town\/City/i);
    const postcodeInput = screen.getByLabelText(/Postcode/i);

    fireEvent.change(emailInput, { target: { value: 'david.blair@example.com' } });
    fireEvent.change(firstNameInput, { target: { value: 'David' } });
    fireEvent.change(lastNameInput, { target: { value: 'Blair' } });
    fireEvent.change(addressInput, { target: { value: '10 Downing St' } });
    fireEvent.change(cityInput, { target: { value: 'London' } });
    fireEvent.change(postcodeInput, { target: { value: 'SW1A 2AA' } });

    // Wait for the 500ms debounce on address change to fetch shipping rates
    await act(async () => {
      await new Promise((r) => setTimeout(r, 650));
    });

    // Click "Continue to Delivery"
    const continueToDeliveryBtn = screen.getByText(/Continue to Delivery/i);
    await act(async () => {
      fireEvent.click(continueToDeliveryBtn);
    });

    // Wait for delivery option to render and shipping rate to be ready
    await waitFor(() => {
      expect(screen.getByText(/Delivery Option/i)).toBeInTheDocument();
    });

    // Click "Continue to payment"
    const continueToPaymentBtn = screen.getByRole('button', { name: /Continue to payment/i });
    await act(async () => {
      fireEvent.click(continueToPaymentBtn);
    });

    // Wait for payment step to mount
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /I have read and agree to the website/i })).toBeInTheDocument();
    });

    // Accept terms
    const termsCheckbox = screen.getByRole('checkbox', { name: /I have read and agree to the website/i });
    await act(async () => {
      fireEvent.click(termsCheckbox);
    });

    // Wait for card form to initialise and create-intent to be called once
    await waitFor(() => {
      expect(createIntentCalls).toBeGreaterThanOrEqual(1);
    });

    const callsBeforePayment = createIntentCalls;

    // Submit Stripe card payment
    const payButton = screen.getByRole('button', { name: /Pay £9.99/i });
    await act(async () => {
      fireEvent.click(payButton);
    });

    // handleSuccess was called: basket was cleared and router pushed
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/checkout/success'));
    });

    expect(useBasket.getState().items.length).toBe(0);

    // Re-render component while on the payment step (as happened when basket emptied during unmount)
    await act(async () => {
      rerender(<CheckoutFlow />);
    });

    // Verify terminal state guard (isPaymentCompletedRef): NO additional create-intent request was dispatched
    expect(createIntentCalls).toBe(callsBeforePayment);
  });
});
