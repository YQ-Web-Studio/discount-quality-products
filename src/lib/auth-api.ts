"use client";

import type { AuthUser } from "@/lib/auth-types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface AuthResponse {
  user?: AuthUser;
  wishlistIds?: number[];
  action?: "added" | "removed";
}

interface MessageResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

async function readResponseBody(response: Response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function extractErrorMessage(
  body: unknown,
  fallback: string,
  status?: number
) {
  const payload = body as
    | { error?: string; message?: string; data?: { message?: string } }
    | string
    | null;

  if (status === 401) {
    if (payload && typeof payload === "object" && payload.error) {
      return payload.error;
    }
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    if (payload && typeof payload === "object" && payload.error) {
      return payload.error;
    }
    return "You are not authorised to perform that action.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  return payload?.error || payload?.message || payload?.data?.message || fallback;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(body, fallbackMessage, response.status),
      response.status
    );
  }

  return body as T;
}

export async function loginAccount(
  identifier: string,
  password: string
): Promise<AuthUser> {
  const result = await requestJson<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        identifier,
        password,
      }),
    },
    "We could not sign you in right now."
  );

  if (!result.user) {
    throw new ApiError("We could not sign you in right now.", 500);
  }

  return result.user;
}

export async function registerAccount(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const result = await requestJson<AuthResponse>(
    "/api/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    },
    "We could not create your account right now."
  );

  if (!result.user) {
    throw new ApiError("We could not create your account right now.", 500);
  }

  return result.user;
}

export async function logoutAccount() {
  await requestJson<{ success: boolean }>(
    "/api/auth/logout",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
    "We could not sign you out right now."
  );
}

export async function fetchAccountSession(): Promise<AuthUser | null> {
  try {
    const result = await requestJson<AuthResponse>(
      "/api/auth/session",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
      "We could not verify your session."
    );

    return result.user || null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function fetchAccountWishlistIds(): Promise<number[]> {
  const result = await requestJson<AuthResponse>(
    "/api/auth/wishlist",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    "We could not load your wishlist right now."
  );

  return result.wishlistIds || [];
}

export async function toggleAccountWishlist(
  productId: number
): Promise<number[]> {
  const result = await requestJson<AuthResponse>(
    "/api/auth/wishlist",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ productId }),
    },
    "We could not update your wishlist right now."
  );

  return result.wishlistIds || [];
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await requestJson<MessageResponse>(
    "/api/auth/change-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    },
    "We could not update your password right now."
  );
}

export async function deleteAccount(currentPassword: string): Promise<void> {
  await requestJson<MessageResponse>(
    "/api/auth/delete-account",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        currentPassword,
      }),
    },
    "We could not delete your account right now."
  );
}

export async function forgotPassword(email: string): Promise<void> {
  await requestJson<MessageResponse>(
    "/api/auth/forgot-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    },
    "We could not send your password reset email right now."
  );
}

export async function resetPassword(
  key: string,
  login: string,
  pass1: string
): Promise<void> {
  await requestJson<MessageResponse>(
    "/api/auth/reset-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        key,
        login,
        password: pass1,
      }),
    },
    "We could not reset your password right now."
  );
}


