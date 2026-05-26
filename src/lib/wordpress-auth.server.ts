import "server-only";

import { cookies } from "next/headers";
import type { AuthUser, WordPressAuthSession } from "@/lib/auth-types";

const DEFAULT_WORDPRESS_URL = "https://admin.discountproducts.co.uk";

export const WORDPRESS_AUTH_COOKIE = "discount_products_auth_token";

interface WordPressUserResponse {
  id?: number;
  name?: string;
  display_name?: string;
  slug?: string;
  email?: string;
  avatar_urls?: Record<string, string>;
}

function getWordPressBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
    process.env.WOOCOMMERCE_URL ||
    DEFAULT_WORDPRESS_URL
  ).replace(/\/$/, "");
}

function buildWordPressUrl(path: string) {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getWordPressBaseUrl()}${normalisedPath}`;
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
    | { message?: string; data?: { message?: string } }
    | string
    | null;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You are not authorised to perform that action.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  return payload?.message || payload?.data?.message || fallback;
}

function mapWordPressUser(
  rawUser: WordPressUserResponse | null | undefined
): AuthUser {
  return {
    id: Number(rawUser?.id ?? 0),
    username: rawUser?.slug || null,
    name:
      rawUser?.name ||
      rawUser?.display_name ||
      rawUser?.slug ||
      "Account holder",
    email: rawUser?.email || null,
    avatarUrl:
      rawUser?.avatar_urls?.[96] ||
      rawUser?.avatar_urls?.[48] ||
      rawUser?.avatar_urls?.[24] ||
      null,
  };
}

function normaliseWishlistIds(payload: unknown): number[] {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data ?? [])
      : [];

  return source
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function decodeJwtExpiry(token: string) {
  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) {
      return null;
    }

    const payloadJson = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp?: unknown };

    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(token?: string) {
  const expiry = token ? decodeJwtExpiry(token) : null;
  const now = Math.floor(Date.now() / 1000);
  const maxAge = expiry ? Math.max(expiry - now, 60) : 60 * 60 * 24 * 7;

  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function clearAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function loginWordPressUser(
  identifier: string,
  password: string
): Promise<WordPressAuthSession> {
  const response = await fetch(buildWordPressUrl("/wp-json/jwt-auth/v1/token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      username: identifier,
      password,
    }),
    cache: "no-store",
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    const authMessage = "The email address, username, or password is incorrect.";

    if (response.status === 401 || response.status === 403) {
      const payload = body as
        | { message?: string; data?: { message?: string } }
        | string
        | null;

      let msg = typeof payload === "string"
        ? payload
        : payload?.message || payload?.data?.message || authMessage;

      // Intercept and sanitize confusing WordPress application password errors
      if (msg.toLowerCase().includes("application password") || msg.toLowerCase().includes("invalid_username")) {
        msg = authMessage;
      }

      throw new Error(msg);
    }

    throw new Error(
      extractErrorMessage(body, "We could not sign you in right now.", response.status)
    );
  }

  const token =
    typeof (body as { token?: unknown })?.token === "string"
      ? (body as { token: string }).token
      : null;

  if (!token) {
    throw new Error("The authentication response did not include a token.");
  }

  const user = await validateWordPressSession(token);

  if (!user) {
    throw new Error("We could not verify your session after signing in.");
  }

  return { token, user };
}

export async function registerWordPressUser(
  name: string,
  email: string,
  password: string
): Promise<WordPressAuthSession> {
  const endpoints = Array.from(
    new Set(
      [
        process.env.NEXT_PUBLIC_WORDPRESS_REGISTER_ENDPOINT,
        "/wp-json/custom/v1/register",
        "/wp-json/wp/v2/users/register",
      ].filter((value): value is string => Boolean(value))
    )
  );

  let lastError: string | null = null;

  for (const endpoint of endpoints) {
    const response = await fetch(buildWordPressUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        display_name: name,
        email,
        username: email,
        password,
      }),
      cache: "no-store",
    });

    const body = await readResponseBody(response);

    if (response.ok) {
      return loginWordPressUser(email, password);
    }

    if (response.status === 401 || response.status === 403) {
      const payload = body as
        | { message?: string; data?: { message?: string } }
        | string
        | null;

      throw new Error(
        typeof payload === "string"
          ? payload
          : payload?.message ||
            payload?.data?.message ||
            "We could not create your account right now."
      );
    }

    if (response.status === 404 || response.status === 405) {
      lastError = extractErrorMessage(
        body,
        "The registration endpoint is not available yet.",
        response.status
      );
      continue;
    }

    throw new Error(
      extractErrorMessage(body, "We could not create your account.", response.status)
    );
  }

  throw new Error(lastError || "Registration is not available on this site yet.");
}

export async function validateWordPressSession(
  token: string
): Promise<AuthUser | null> {
  try {
    // Use basic context to avoid triggering complex capability checks that might crash some WP setups
    const response = await fetch(buildWordPressUrl("/wp-json/wp/v2/users/me"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403 || response.status >= 500) {
      if (response.status >= 500) {
        console.error(`[WordPress Auth] Backend returned 500 error for /users/me. Treating session as invalid.`);
      }
      return null;
    }

    const body = await readResponseBody(response);

    if (!response.ok) {
      return null; // Fallback to logged-out state for any other error
    }

    return mapWordPressUser(body as WordPressUserResponse | null | undefined);
  } catch (error) {
    console.error("[WordPress Auth] Unexpected error during session validation:", error);
    return null;
  }
}

export async function fetchWordPressWishlistIds(
  token: string
): Promise<number[]> {
  const response = await fetch(buildWordPressUrl("/wp-json/custom/v1/wishlist"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        body,
        "We could not load your wishlist right now.",
        response.status
      )
    );
  }

  return normaliseWishlistIds(body);
}

export async function toggleWordPressWishlist(
  token: string,
  productId: number
): Promise<number[]> {
  const response = await fetch(buildWordPressUrl("/wp-json/custom/v1/wishlist"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
    }),
    cache: "no-store",
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        body,
        "We could not update your wishlist right now.",
        response.status
      )
    );
  }

  return normaliseWishlistIds(body);
}

export async function changeWordPressPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const response = await fetch(buildWordPressUrl("/wp-json/wp/v2/users/me"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      password: newPassword,
    }),
    cache: "no-store",
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        body,
        "We could not update your password right now.",
        response.status
      )
    );
  }
}

export async function deleteWordPressAccount(
  token: string,
  currentPassword: string
): Promise<void> {
  const response = await fetch(buildWordPressUrl("/wp-json/custom/v1/delete-account"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
    }),
    cache: "no-store",
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        body,
        "We could not delete your account right now.",
        response.status
      )
    );
  }
}

export async function getCurrentWordPressSession(): Promise<WordPressAuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(WORDPRESS_AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const user = await validateWordPressSession(token);

  if (!user) {
    return null;
  }

  return { token, user };
}

export async function lostPasswordWordPress(userLogin: string): Promise<void> {
  const response = await fetch(buildWordPressUrl("/wp-login.php?action=lostpassword"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      user_login: userLogin,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok && response.status !== 200) {
    throw new Error("Authentication server is temporarily unreachable.");
  }

  const text = await response.text();

  if (text.includes("login_error") || text.includes("notice-error")) {
    const errorMatch = text.match(/<div[^>]*id="login_error"[^>]*>([\s\S]*?)<\/div>/);
    if (errorMatch && errorMatch[1]) {
      const cleanError = errorMatch[1]
        .replace(/<[^>]*>/g, "")
        .replace(/Error:/gi, "")
        .trim();
      throw new Error(cleanError);
    }
    throw new Error("There is no account with that username or email address.");
  }
}

export async function resetPasswordWordPress(
  key: string,
  login: string,
  pass1: string
): Promise<void> {
  // Communicate directly with our secure, headless API endpoint!
  // No cookies, no nonces, no HTML parsing. Just pure JSON.
  const response = await fetch(buildWordPressUrl("/wp-json/dqp/v1/reset-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: key,
      login: login,
      password: pass1,
    }),
    cache: "no-store",
  });

  // If the API returns a 200 OK, the password was successfully reset
  if (response.ok) {
    return;
  }

  // If it failed, extract the exact error message WordPress returned
  let errorMessage = "Failed to reset password. The link may be expired or invalid.";
  try {
    const data = await response.json();
    if (data && data.message) {
      errorMessage = data.message;
    }
  } catch (e) {
    // Fallback if JSON parsing fails
    errorMessage = `Server Error: ${response.status}`;
  }

  throw new Error(errorMessage);
}


