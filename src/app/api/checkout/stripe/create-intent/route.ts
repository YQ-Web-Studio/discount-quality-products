import { NextResponse } from "next/server";
import Stripe from "stripe";
import { validateCartTotals } from "@/lib/checkout";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-03-25.dahlia",
});

/**
 * Resolve a basket item ID to a clean WooCommerce integer databaseId.
 * Handles both plain numeric strings ("14") and stale base64 WPGraphQL
 * global IDs ("cG9zdDoxNA==" → "post:14" → 14).
 * Returns NaN if the format is unrecognisable — callers must filter these out.
 */
function resolveToNumericId(id: string): number {
  const n = parseInt(id, 10);
  if (!isNaN(n)) return n;
  try {
    const decoded = Buffer.from(id, "base64").toString("utf8");
    const match = decoded.match(/:(\d+)$/);
    if (match) return parseInt(match[1], 10);
  } catch {
    // Unrecognisable format — return NaN
  }
  return NaN;
}

export async function POST(req: Request) {
  try {
    const { items, shippingMethod, form } = await req.json();

    const validation = await validateCartTotals(items, shippingMethod);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Convert to pence for Stripe
    const amountInPence = Math.round(validation.finalTotal * 100);

    // Resolve ALL item IDs to clean integers BEFORE encoding into Stripe metadata.
    // This is critical: NaN serialises as null in JSON, causing WooCommerce to receive
    // product_id: null which triggers a fatal PHP TypeError.
    const resolvedItems = items
      .map((i: { id: string; slug?: string; quantity: number }) => ({
        numericId: resolveToNumericId(i.id),
        slug: i.slug ?? "",
        quantity: i.quantity,
      }))
      .filter((i: { numericId: number }) => !isNaN(i.numericId));

    const databaseIds = resolvedItems.map((i: { numericId: number }) => i.numericId).join(",");
    const slugs = resolvedItems.map((i: { slug: string }) => i.slug).join(",");

    // Compact cart representation for webhook-side order construction.
    // Uses short keys to respect Stripe's 500-character-per-key metadata limit.
    const cartItems = JSON.stringify(
      resolvedItems.map((i: { numericId: number; quantity: number }) => ({ i: i.numericId, q: i.quantity }))
    );

    // Serialise the customer form data for the webhook to reconstruct billing/shipping.
    const cartForm = form
      ? JSON.stringify({
          fn: form.firstName,
          ln: form.lastName,
          em: form.email,
          a1: form.shippingAddress1 || form.address1,
          ct: form.shippingCity || form.city,
          pc: form.shippingPostcode || form.postcode,
        })
      : "";

    // Look up the Stripe customer by email to allow saved cards to appear in Elements
    // CRITICAL SECURITY FIX: Only look up Stripe customer and saved cards if the customer is logged in!
    let customerId;
    const session = await getCurrentWordPressSession();

    if (session?.user?.id) {
      const email = session.user.email || form?.email;
      if (email) {
        try {
          const customers = await stripe.customers.list({
            email: email,
            limit: 1,
          });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            console.log(`[Stripe] Found customer for logged-in user ${email}: ${customerId}`);
          }
        } catch (err) {
          console.error(`[Stripe] Error looking up customer:`, err);
        }
      }
    }

    // Create the Stripe PaymentIntent and embed the cart snapshot for webhook-side
    // WooCommerce order creation after payment has actually completed.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: "gbp",
      payment_method_types: ["card"],
      ...(customerId ? { customer: customerId, setup_future_usage: "on_session" } : {}),
      metadata: {
        databaseIds,
        slugs,
        cart_items: cartItems,
        cart_shipping: shippingMethod ?? "standard",
        cart_form: cartForm,
        wc_customer_id: session?.user?.id ? String(session.user.id) : "",
      },
    });

    // Fetch the user's actual Stripe PaymentMethods to power our custom Saved Cards UI
    let savedCards: { id: string; brand: string; last4: string; expiry: string }[] = [];
    if (customerId) {
      try {
        const pms = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });
        savedCards = pms.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand || "card",
          last4: pm.card?.last4 || "****",
          expiry: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : "Unknown",
        }));
      } catch (err) {
        console.error(`[Stripe] Error fetching saved cards:`, err);
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      totalCalculated: validation.finalTotal,
      paymentIntentId: paymentIntent.id,
      savedCards,
    });
  } catch (error: unknown) {
    console.error("Stripe Intent Error:", error);
    return NextResponse.json(
      { error: "Failed to generate payment intent. Please try again." },
      { status: 500 }
    );
  }
}
