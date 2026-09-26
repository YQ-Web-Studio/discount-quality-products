import { NextResponse } from "next/server";
import Stripe from "stripe";
import { revalidateTag } from "next/cache";
import { createWooCommerceOrder, updateWooCommerceOrder } from "@/lib/woocommerce";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import React from "react";

export const maxDuration = 60;

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy") as string, {
  apiVersion: "2023-10-16" as any,
});

// Candidate secrets: environment variable or live registered webhook endpoint secret
const LIVE_WEBHOOK_SECRET = "whsec_7Zq7XXaE9i6m97pjJX2tN78frf4lOMDX";
const ENV_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

import { processOrderFromPaymentIntent } from "@/lib/stripe-sync";

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

  const candidateSecrets = [ENV_WEBHOOK_SECRET, LIVE_WEBHOOK_SECRET].filter(Boolean) as string[];

  if (candidateSecrets.length === 0) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  // ── 2. Verify the Stripe signature against candidate secrets ─────────────
  let event: Stripe.Event | null = null;
  let lastError: any = null;

  for (const secret of candidateSecrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!event) {
    console.error("[webhook] ⚠ Signature verification FAILED with all candidate secrets:", lastError?.message);
    return NextResponse.json({ error: `Webhook signature invalid: ${lastError?.message}` }, { status: 400 });
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
    const order = await processOrderFromPaymentIntent(rawPaymentIntent, chargeId);
    if (!order) {
      console.error(`[webhook] Webhook order processing failed for PI ${rawPaymentIntent.id}. Returning 500 to trigger Stripe retry.`);
      return NextResponse.json({ error: "WooCommerce order creation failed. Webhook will retry." }, { status: 500 });
    }

    // ── 3b. Targeted cache invalidation for purchased products ─────────
    // Only invalidate the specific product caches — not the entire catalogue.
    // This dramatically reduces ISR writes vs. the previous approach of
    // revalidatePath("/"), revalidatePath("/shop"), and each product path.
    try {
      const slugList = slugs ? slugs.split(",").map((s) => s.trim()).filter(Boolean) : [];
      for (const slug of slugList) {
        // @ts-expect-error - Next.js 16 types incorrectly require a second argument
        revalidateTag(`product-${slug}`);
        // @ts-expect-error - Next.js 16 types incorrectly require a second argument
        revalidateTag(`wc-product-${slug}`);
      }
      console.log(`[webhook] ✓ Cache revalidated for ${slugList.length} product tags.`);
    } catch (err) {
      console.warn("[webhook] Cache revalidation failed:", err);
    }
  } else {
    console.log(`[webhook] Unhandled event type ignored: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
