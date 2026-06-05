import { NextResponse } from "next/server";
import { validateCartTotals } from "@/lib/checkout";

type PayPalCreateOrderResponse = {
  id?: string;
  debug_id?: string;
  name?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
};

async function generatePayPalAccessToken() {
  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("MISSING_API_CREDENTIALS");
  }

  const baseUrl = process.env.PAYPAL_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com");
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await response.json();
  return data.access_token as string;
}

async function readPayPalResponse(response: Response): Promise<PayPalCreateOrderResponse> {
  const text = await response.text();

  try {
    return JSON.parse(text) as PayPalCreateOrderResponse;
  } catch {
    return { raw: text };
  }
}

export async function POST(req: Request) {
  try {
    const { items, shippingMethod, form, couponCode } = await req.json();

    const validation = await validateCartTotals(items, shippingMethod, form ? { ...form, email: form.email } : undefined, couponCode);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const accessToken = await generatePayPalAccessToken();
    const finalTotalValue = validation.finalTotal.toFixed(2);

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "GBP",
            value: finalTotalValue,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: "GET_FROM_FILE",
            brand_name: "Discount Quality Products",
            locale: "en-US",
            landing_page: "NO_PREFERENCE",
            user_action: "PAY_NOW",
          },
        },
      },
    };

    const baseUrl = process.env.PAYPAL_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com");
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await readPayPalResponse(response);

    if (response.ok && data.id) {
      return NextResponse.json({ id: data.id, totalCalculated: validation.finalTotal });
    }

    console.error("[paypal/create-order] Failed to create order", {
      status: response.status,
      name: data.name ?? null,
      message: data.message ?? null,
      debugId: data.debug_id ?? null,
      details: data.details ?? null,
    });

    return NextResponse.json(
      { error: "Failed to create PayPal order.", debugId: data.debug_id ?? null },
      { status: 500 }
    );
  } catch (error: unknown) {
    console.error("[paypal/create-order] Unexpected error", error);
    return NextResponse.json(
      { error: "Failed to generate PayPal order intent. Please try again." },
      { status: 500 }
    );
  }
}
