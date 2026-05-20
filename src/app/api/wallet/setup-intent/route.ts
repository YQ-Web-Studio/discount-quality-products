import { NextResponse } from "next/server";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-03-25.dahlia",
});

export async function GET() {
  const session = await getCurrentWordPressSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Look up the Stripe customer by email
    let customerId;
    try {
      const customers = await stripe.customers.list({
        email: session.user.email || undefined,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        // Create a new customer if they don't exist
        const customer = await stripe.customers.create({
          email: session.user.email || undefined,
          name: session.user.name || undefined,
          metadata: {
            wc_user_id: session.user.id,
          },
        });
        customerId = customer.id;
        console.log(`[Stripe] Created new customer for ${session.user.email}: ${customerId}`);
      }
    } catch (err) {
      console.error("[Stripe] Error managing customer for setup intent:", err);
    }

    // Generate a SetupIntent directly via Stripe
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      customer: customerId, // Now always present if lookup/create succeeded
      usage: 'on_session',
    });

    return NextResponse.json({ client_secret: setupIntent.client_secret });
  } catch (error) {
    console.error("Error creating setup intent (Next.js):", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create setup intent" },
      { status: 500 }
    );
  }
}
