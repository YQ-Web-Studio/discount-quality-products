import { NextResponse } from "next/server";
import {
  clearAuthCookieOptions,
  fetchWordPressWishlistIds,
  getCurrentWordPressSession,
  toggleWordPressWishlist,
  WORDPRESS_AUTH_COOKIE,
} from "@/lib/wordpress-auth.server";
import { fetchWooCommerceProducts } from "@/lib/woocommerce";

interface WishlistRequestBody {
  productId?: number | string;
  product_id?: number | string;
}

function toProductId(value: number | string | undefined) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

export async function GET() {
  const session = await getCurrentWordPressSession();

  if (!session) {
    const response = NextResponse.json(
      { error: "Please sign in to manage your wishlist." },
      { status: 401 }
    );

    response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    return response;
  }

  try {
    const wishlistIds = await fetchWordPressWishlistIds(session.token);
    return NextResponse.json({ wishlistIds });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "We could not load your wishlist right now.";

    const status = message.toLowerCase().includes("session") ? 401 : 500;
    const response = NextResponse.json({ error: message }, { status });

    if (status === 401) {
      response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    }

    return response;
  }
}

export async function POST(request: Request) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    const response = NextResponse.json(
      { error: "Please sign in to manage your wishlist." },
      { status: 401 }
    );

    response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    return response;
  }

  try {
    const body = (await request.json()) as WishlistRequestBody;
    const productId = toProductId(body.productId ?? body.product_id);

    if (!productId) {
      return NextResponse.json(
        { error: "Please provide a valid product identifier." },
        { status: 400 }
      );
    }

    const wishlistIds = await toggleWordPressWishlist(session.token, productId);
    return NextResponse.json({ wishlistIds });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "We could not update your wishlist right now.";

    const status = message.toLowerCase().includes("session") ? 401 : 500;
    const response = NextResponse.json({ error: message }, { status });

    if (status === 401) {
      response.cookies.set(WORDPRESS_AUTH_COOKIE, "", clearAuthCookieOptions());
    }

    return response;
  }
}

