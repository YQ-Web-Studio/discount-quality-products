"use client";

import { ApiError } from "@/lib/auth-api";

export interface PaymentToken {
  id: string;  // Stripe Payment Method ID (pm_...)
  brand: string;
  last4: string;
  expiry: string;
}

export async function fetchPaymentTokens(): Promise<PaymentToken[]> {
  const response = await fetch(`/api/wallet/tokens?t=${Date.now()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError("Could not load your saved payment methods.", response.status);
  }

  const data = await response.json();
  return data.tokens || [];
}

export async function deletePaymentToken(tokenId: string): Promise<void> {
  const response = await fetch(`/api/wallet/tokens/${tokenId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.error || "Could not delete the saved payment method.", response.status);
  }
}

export async function createSetupIntent(): Promise<{ client_secret: string }> {
  const response = await fetch("/api/wallet/setup-intent", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data?.error || "Failed to initialize secure setup session.", response.status);
  }

  return data;
}

export async function savePaymentMethod(paymentMethodId: string): Promise<{ token_id: number }> {
  const response = await fetch("/api/wallet/add-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data?.error || "Failed to save payment method.", response.status);
  }

  return data;
}
