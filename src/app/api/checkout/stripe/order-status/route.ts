import { NextResponse } from "next/server";
import Stripe from "stripe";
import { processOrderFromPaymentIntent } from "@/lib/stripe-sync";

const WC_URL = process.env.WOOCOMMERCE_URL;
const WC_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy") as string, {
  apiVersion: "2023-10-16" as any,
});

/**
 * GET /api/checkout/stripe/order-status?pi=pi_xxx&fallback=true
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
  const fallback = searchParams.get("fallback") === "true";

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

  // Search WooCommerce orders by the Stripe PaymentIntent ID.
  // The WC REST API ignores meta_key queries on orders unless customized, but natively supports searching meta/transactions via `search=`.
  const apiUrl = `${WC_URL.replace(/\/$/, "")}/wp-json/wc/v3/orders?search=${encodeURIComponent(pi)}&per_page=1`;

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

    if (orders.length > 0) {
      return NextResponse.json({ orderId: orders[0].number ?? orders[0].id });
    }

    // Webhook hasn't processed yet or dropped.
    // If fallback=true is passed (usually at the end of polling timeout), verify with Stripe directly.
    if (fallback) {
      try {
        console.log(`[order-status] Fallback triggered for PI ${pi}. Checking Stripe...`);
        const expanded = await stripe.paymentIntents.retrieve(pi, {
          expand: ["latest_charge"],
        });

        if (expanded.status === "succeeded") {
          const charge = expanded.latest_charge;
          const chargeId = typeof charge === "string" ? charge : (charge as any)?.id ?? "";
          
          console.log(`[order-status] PI is succeeded. Syncing order manually...`);
          const newOrder = await processOrderFromPaymentIntent(expanded, chargeId);
          
          if (newOrder) {
             return NextResponse.json({ orderId: newOrder.number ?? newOrder.id });
          }
        }
      } catch (err) {
         console.error(`[order-status] Fallback Stripe check failed for PI ${pi}:`, err);
      }
    }

    return NextResponse.json({ pending: true });
  } catch (err) {
    console.error("[order-status] Network error:", err);
    return NextResponse.json({ error: "Network error." }, { status: 500 });
  }
}
