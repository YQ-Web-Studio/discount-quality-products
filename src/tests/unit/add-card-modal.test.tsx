import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { AddCardModal } from '@/components/settings/AddCardModal';
import * as walletApi from '@/lib/wallet-api';

// Mock Stripe components so we don't need real Stripe JS loading in test
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ confirmCardSetup: vi.fn() }),
  useElements: () => ({ getElement: vi.fn() }),
}));

describe('AddCardModal - Stale Setup Intent Race Condition & Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores a stale setup-intent response from a cancelled modal session when closed and reopened', async () => {
    let resolveFirstRequest!: (val: { client_secret: string }) => void;
    let resolveSecondRequest!: (val: { client_secret: string }) => void;

    const firstPromise = new Promise<{ client_secret: string }>((res) => {
      resolveFirstRequest = res;
    });
    const secondPromise = new Promise<{ client_secret: string }>((res) => {
      resolveSecondRequest = res;
    });

    const createSetupIntentSpy = vi
      .spyOn(walletApi, 'createSetupIntent')
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    // 1. Open modal (triggers first request)
    const { rerender } = render(
      <AddCardModal open={true} onOpenChange={onOpenChange} onSuccess={onSuccess} />
    );

    expect(createSetupIntentSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Establishing secure connection/i)).toBeInTheDocument();

    // 2. Close modal while first request is pending
    rerender(<AddCardModal open={false} onOpenChange={onOpenChange} onSuccess={onSuccess} />);

    // 3. Reopen modal (triggers second request)
    rerender(<AddCardModal open={true} onOpenChange={onOpenChange} onSuccess={onSuccess} />);
    expect(createSetupIntentSpy).toHaveBeenCalledTimes(2);

    // 4. Resolve the first (stale) request with client_secret_1
    await act(async () => {
      resolveFirstRequest({ client_secret: 'client_secret_stale_1' });
    });

    // Modal should STILL be initializing because stale request was discarded by subscription cleanup
    expect(screen.getByText(/Establishing secure connection/i)).toBeInTheDocument();
    expect(screen.queryByTestId('stripe-elements')).not.toBeInTheDocument();

    // 5. Resolve second request with client_secret_2
    await act(async () => {
      resolveSecondRequest({ client_secret: 'client_secret_fresh_2' });
    });

    // Now modal is initialized with second request
    expect(screen.queryByText(/Establishing secure connection/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
  });
});
