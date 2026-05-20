import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fetchWooCommerceProducts } from "@/lib/woocommerce";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: Request) {
  try {
    const { items, shippingMethod } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in basket." }, { status: 400 });
    }

    // Determine shipping cost (free)
    const shippingCost = 0;

    // Extract item IDs (assuming items contains { id, quantity }. 
    // In our frontend basket, item.id is usually "wc-XXXX" or just the "XXXX" ID. 
    // Wait, let's clean ID to numeric.
    const itemIds = items.map((i: any) => i.id.replace("wc-", "")).join(",");

    // Fetch real products from WooCommerce to strictly validate prices
    const { products } = await fetchWooCommerceProducts({ include: itemIds, per_page: 100 });

    let subtotal = 0;

    for (const item of items) {
      const numericId = parseInt(item.id.replace("wc-", ""), 10);
      const wooProduct = products.find((p) => p.databaseId === numericId);

      if (!wooProduct) {
        return NextResponse.json({ error: `Product not found: ${item.id}` }, { status: 400 });
      }

      // Convert GBP formatted price strings back to float or 
      // extract raw price from WooCommerce. fetchWooCommerceProducts maps to MappedProduct which has price: string (formatted).
      // Wait, MappedProduct formatPrice adds "£". Parse it carefully.
      const priceStr = wooProduct.price || "£0";
      const actualPrice = parseFloat(priceStr.replace(/[^0-9.-]+/g,""));

      subtotal += actualPrice * item.quantity;
    }

    // Prices from WooCommerce are VAT-inclusive.
    // The total charged to the customer is subtotal + shipping only.
    // The VAT portion is extracted as subtotal / 6 (20/120) for reporting.
    const vat = subtotal / 6;
    const finalTotal = subtotal + shippingCost;

    // Convert to pence for Stripe
    const amountInPence = Math.round(finalTotal * 100);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      totalCalculated: finalTotal,
    });
  } catch (error: any) {
    console.error("Stripe Intent Error:", error);
    return NextResponse.json(
      { error: "Failed to generate payment intent. Please try again." },
      { status: 500 }
    );
  }
}
