import { NextResponse } from "next/server";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";
import Stripe from "stripe";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy") as string, {
  apiVersion: "2026-03-25.dahlia",
});

function getWordPressBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
    process.env.WOOCOMMERCE_URL ||
    (process.env.VERCEL === "1"
      ? "https://admin.discountproducts.co.uk"
      : "http://discount-products-backend.local")
  ).replace(/\/$/, "");
}

export async function GET() {
  const session = await getCurrentWordPressSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Look up the Stripe customer by email
    const customers = await stripe.customers.list({
      email: session.user.email || undefined,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // No Stripe customer yet — return empty list
      return NextResponse.json({ tokens: [] });
    }

    const stripeCustomerId = customers.data[0].id;

    // List payment methods directly from Stripe
    const pms = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    const tokens = pms.data.map(pm => ({
      id: pm.id, // Use Stripe PM ID as the identifier
      brand: pm.card?.brand || "card",
      last4: pm.card?.last4 || "****",
      expiry: pm.card ? `${String(pm.card.exp_month).padStart(2, "0")}/${pm.card.exp_year}` : "Unknown",
    }));

    console.log(`[api/wallet/tokens] Found ${tokens.length} card(s) in Stripe for ${session.user.email}`);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("Error fetching payment tokens from Stripe:", error);
    return NextResponse.json({ error: "Failed to load payment tokens" }, { status: 500 });
  }
}
