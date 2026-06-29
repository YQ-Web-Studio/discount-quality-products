import { NextResponse } from "next/server";

const WC_URL = process.env.WOOCOMMERCE_URL;
const WC_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
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

  const apiUrl = `${WC_URL.replace(/\/$/, "")}/wp-json/wc/v3/orders/${id}`;
  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "GET" }));

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { ...authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[order-details] WooCommerce fetch failed: ${response.status}`);
      return NextResponse.json({ error: "WooCommerce order fetch failed." }, { status: response.status });
    }

    const order = await response.json();
    return NextResponse.json({ order });
  } catch (err) {
    console.error("[order-details] Network error:", err);
    return NextResponse.json({ error: "Network error." }, { status: 500 });
  }
}
