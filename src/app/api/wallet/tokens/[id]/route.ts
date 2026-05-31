import { NextResponse } from "next/server";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";
import Stripe from "stripe";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy") as string, {
  apiVersion: "2023-10-16" as any,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Stripe PM IDs start with pm_
  if (!id || !id.startsWith("pm_")) {
    return NextResponse.json({ error: "Invalid Payment Method ID" }, { status: 400 });
  }

  try {
    // 1. Security check: verify this PM belongs to the logged-in user's Stripe customer
    const customers = await stripe.customers.list({
      email: session.user.email || undefined,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No Stripe customer found for your account" }, { status: 404 });
    }

    const stripeCustomerId = customers.data[0].id;

    // Retrieve the PM to check ownership
    const pm = await stripe.paymentMethods.retrieve(id);
    if (pm.customer !== stripeCustomerId) {
      console.warn(`[api/wallet/delete] PM ${id} belongs to ${pm.customer}, not ${stripeCustomerId}`);
      return NextResponse.json({ error: "Permission denied: You do not own this payment method" }, { status: 403 });
    }

    // 2. Detach the card from the Stripe customer (this removes it from the vault)
    await stripe.paymentMethods.detach(id);
    console.log(`[api/wallet/delete] Successfully detached ${id} from ${stripeCustomerId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment method from Stripe:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to delete payment method",
    }, { status: 500 });
  }
}
