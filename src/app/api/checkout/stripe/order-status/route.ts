import { NextResponse } from "next/server";

const WC_URL = process.env.WOOCOMMERCE_URL;
const WC_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * GET /api/checkout/stripe/order-status?pi=pi_xxx
 *
 * Looks up the WooCommerce order created by the Stripe webhook for a given
 * PaymentIntent ID. The webhook stores the PI under the _stripe_intent_id
 * order meta key so we can reliably reverse-look-up the order here.
 *
 * Returns:
 *   { orderId: number }   — order found
 *   { pending: true }     — webhook hasn't fired yet; client should retry
 *   { error: string }     — bad request or server error
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pi = searchParams.get("pi");

  if (!pi || !pi.startsWith("pi_")) {
    return NextResponse.json({ error: "Invalid payment intent ID." }, { status: 400 });
  }

  if (!WC_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json({ error: "WooCommerce not configured." }, { status: 500 });
  }

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: WC_KEY, secret: WC_SECRET },
    signature_method: "HMAC-SHA1",
    hash_function(base: string, key: string) {
      return CryptoJS.HmacSHA1(base, key).toString(CryptoJS.enc.Base64);
    },
  });

  // Search WooCommerce orders by the _stripe_intent_id meta value.
  // The WC REST API supports ?meta_key=&meta_value= on the /orders endpoint.
  const apiUrl = `${WC_URL.replace(/\/$/, "")}/wp-json/wc/v3/orders?meta_key=_stripe_intent_id&meta_value=${encodeURIComponent(pi)}&per_page=1`;

  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "GET" }));

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { ...authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[order-status] WooCommerce query failed: ${response.status}`);
      return NextResponse.json({ error: "WooCommerce query failed." }, { status: 502 });
    }

    const orders: any[] = await response.json();

    if (!orders.length) {
      // Webhook hasn't processed yet — tell the client to keep polling.
      return NextResponse.json({ pending: true });
    }

    return NextResponse.json({ orderId: orders[0].number ?? orders[0].id });
  } catch (err) {
    console.error("[order-status] Network error:", err);
    return NextResponse.json({ error: "Network error." }, { status: 500 });
  }
}
