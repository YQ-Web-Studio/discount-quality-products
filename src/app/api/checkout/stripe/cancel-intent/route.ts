import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy") as string, {
  apiVersion: "2023-10-16" as any,
});

/**
 * POST /api/checkout/stripe/cancel-intent
 *
 * Cancels a Stripe PaymentIntent that is no longer needed — for example,
 * when the customer chose to pay via PayPal after the card form had already
 * initialised a PaymentIntent.
 *
 * This is a best-effort cleanup endpoint: failures are logged but never
 * surface to the user (the PayPal payment already succeeded).
 */
export async function POST(req: Request) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId || typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) {
      return NextResponse.json({ error: "Invalid PaymentIntent ID." }, { status: 400 });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Only cancel if the PI is still in a cancellable state.
    // Succeeded / cancelled PIs cannot (and should not) be cancelled.
    const cancellableStatuses = ["requires_payment_method", "requires_confirmation", "requires_action", "processing"];
    if (!cancellableStatuses.includes(pi.status)) {
      console.log(`[cancel-intent] PI ${paymentIntentId} is "${pi.status}" — not cancellable, skipping.`);
      return NextResponse.json({ cancelled: false, reason: `Status is ${pi.status}` });
    }

    await stripe.paymentIntents.cancel(paymentIntentId);
    console.log(`[cancel-intent] ✓ Cancelled PaymentIntent ${paymentIntentId}`);

    return NextResponse.json({ cancelled: true });
  } catch (error: unknown) {
    // Non-critical — log and return success so the client doesn't retry.
    console.warn("[cancel-intent] Failed to cancel PaymentIntent:", error);
    return NextResponse.json({ cancelled: false, reason: "Cancel failed (non-critical)" });
  }
}
