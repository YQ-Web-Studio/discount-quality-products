import { NextResponse } from "next/server";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { createWooCommerceOrder, updateWooCommerceOrder } from "@/lib/woocommerce";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-03-25.dahlia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;



/** Shared payment meta added to every confirmed order. */
function buildPaymentMeta(paymentIntentId: string, chargeId: string) {
  return [
    { key: "_stripe_intent_id",      value: paymentIntentId },
    { key: "_stripe_charge_id",      value: chargeId },
    // _stripe_source_id is a legacy alias also read by some WC Stripe plugin versions
    { key: "_stripe_source_id",      value: chargeId },
    // _stripe_charge_captured MUST be "yes" — process_refund() bails early without it
    { key: "_stripe_charge_captured", value: "yes" },
  ];
}

/**
 * Promotes an existing WooCommerce order to "processing" now that payment
 * has been confirmed. Falls back to creating a brand-new order if no linked
 * order is available (for example, if WooCommerce was unavailable at the time).
 */
async function processOrderFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  chargeId: string
): Promise<void> {
  const { cart_items, cart_shipping, cart_form, wc_order_id, wc_customer_id } = paymentIntent.metadata ?? {};

  if (!cart_items || !cart_form) {
    console.warn(
      `[webhook] payment_intent.succeeded — missing cart_items or cart_form in metadata. ` +
      `Order processing skipped. PaymentIntent: ${paymentIntent.id}`
    );
    return;
  }

  let items: { i: number; q: number }[];
  let form: { fn: string; ln: string; em: string; a1: string; ct: string; pc: string };

  try {
    items = JSON.parse(cart_items);
    form = JSON.parse(cart_form);
  } catch (err) {
    console.error(`[webhook] Failed to parse cart metadata for ${paymentIntent.id}:`, err);
    return;
  }

  const shippingMethod = cart_shipping ?? "standard";
  const shippingCost = 0;
  const shippingTitle = "Free Delivery";
  const line_items = items.map((item) => ({ product_id: item.i, quantity: item.q }));
  const paymentMeta = buildPaymentMeta(paymentIntent.id, chargeId);

  // ── Path A: update the linked WooCommerce order if one already exists ────
  if (wc_order_id) {
    const orderId = parseInt(wc_order_id, 10);
    try {
      const updated = await updateWooCommerceOrder(orderId, {
        status: "processing",
        set_paid: true,
        transaction_id: chargeId || paymentIntent.id,
        customer_note: `Payment captured securely via Stripe. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}.`,
        meta_data: paymentMeta,
      });
      console.log(
        `[webhook] ✓ WooCommerce order #${updated.number ?? updated.id} updated to "processing" for PaymentIntent ${paymentIntent.id}.`
      );
      return;
    } catch (err) {
      console.error(`[webhook] Failed to update existing order ${orderId} — falling back to create:`, err);
    }
  }

  // ── Path B: fallback — create order from scratch (WC was down at intent time) ──
  const orderPayload = {
    payment_method: "stripe",
    payment_method_title: "Credit Card (Stripe)",
    set_paid: true,
    status: "processing",
    transaction_id: chargeId || paymentIntent.id,
    customer_id: wc_customer_id ? parseInt(wc_customer_id, 10) : 0,
    customer_note: `Payment captured securely via Stripe. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}.`,
    billing: {
      first_name: form.fn,
      last_name: form.ln,
      address_1: form.a1,
      city: form.ct,
      postcode: form.pc,
      country: "GB",
      email: form.em,
    },
    shipping: {
      first_name: form.fn,
      last_name: form.ln,
      address_1: form.a1,
      city: form.ct,
      postcode: form.pc,
      country: "GB",
    },
    line_items,
    shipping_lines: [
      {
        method_id: "flat_rate",
        method_title: shippingTitle,
        total: shippingCost.toString(),
      },
    ],
    meta_data: paymentMeta,
  };

  try {
    const newOrder = await createWooCommerceOrder(orderPayload);
    console.log(
      `[webhook] ✓ WooCommerce order #${newOrder.number ?? newOrder.id} created (fallback) for PaymentIntent ${paymentIntent.id}.`
    );
  } catch (err) {
    console.error(`[webhook] ══════════════════════════════════════════════════════`);
    console.error(`[webhook] FATAL: Stripe payment SUCCEEDED but WooCommerce order processing FAILED.`);
    console.error(`[webhook] PaymentIntent ID: ${paymentIntent.id}`);
    console.error(`[webhook] Customer Email:   ${form.em}`);
    console.error(`[webhook] Error Details:    `, err);
    console.error(`[webhook] ══════════════════════════════════════════════════════`);
  }
}

/**
 * POST /api/webhooks/stripe
 * Stripe sends signed events here. We verify the signature, then handle
 * payment_intent.succeeded to create the WooCommerce order and mark products as out of stock.
 */
export async function POST(req: Request) {
  // ── 1. Read raw body (required for signature verification) ──────────────
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[webhook] No stripe-signature header present.");
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  if (!WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set in environment variables.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  // ── 2. Verify the Stripe signature ──────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[webhook] ⚠ Signature verification FAILED:", err.message);
    return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
  }

  console.log(`[webhook] Received verified event: ${event.type} (id: ${event.id})`);

  // ── 3. Handle payment_intent.succeeded ──────────────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const rawPaymentIntent = event.data.object as Stripe.PaymentIntent;
    const { databaseIds, slugs } = rawPaymentIntent.metadata ?? {};

    // Retrieve the PaymentIntent with latest_charge expanded so we reliably get the
    // ch_... charge ID needed for WooCommerce Stripe refunds.
    // The webhook payload's latest_charge field is not always populated.
    let chargeId = "";
    try {
      const expanded = await stripe.paymentIntents.retrieve(rawPaymentIntent.id, {
        expand: ["latest_charge"],
      });
      const charge = expanded.latest_charge;
      chargeId = typeof charge === "string" ? charge : (charge as any)?.id ?? "";
      console.log(`[webhook] Resolved charge ID: ${chargeId || "(none)"}`);
    } catch (err) {
      console.warn(`[webhook] Could not expand latest_charge for ${rawPaymentIntent.id}:`, err);
    }

    // ── 3a. Update/create the WooCommerce order (primary action) ─────────
    await processOrderFromPaymentIntent(rawPaymentIntent, chargeId);

    // ── 3b. Refresh frontend cache (revalidate) ──────────────────────────
    // We revalidate the shop pages so that if WooCommerce naturally reduced
    // stock to zero, the UI reflects it immediately.
    try {
      const slugList = slugs ? slugs.split(",").map((s) => s.trim()) : [];
      for (const slug of slugList) {
        if (slug) revalidatePath(`/products/${slug}`);
      }
      revalidatePath("/");
      revalidatePath("/shop");
      console.log(`[webhook] ✓ Cache revalidated for ${slugList.length} products and shop pages.`);
    } catch (err) {
      console.warn("[webhook] Cache revalidation failed:", err);
    }
  } else {
    console.log(`[webhook] Unhandled event type ignored: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
