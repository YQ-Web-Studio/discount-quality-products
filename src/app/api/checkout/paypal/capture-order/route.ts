import { NextResponse } from "next/server";

type PayPalCaptureResponse = {
  status?: string;
  debug_id?: string;
  name?: string;
  message?: string;
  details?: unknown;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
      }>;
    };
  }>;
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

async function readPayPalResponse(response: Response): Promise<PayPalCaptureResponse> {
  const text = await response.text();

  try {
    return JSON.parse(text) as PayPalCaptureResponse;
  } catch {
    return { raw: text };
  }
}

export async function POST(req: Request) {
  try {
    const { orderID } = await req.json();

    if (!orderID) {
      return NextResponse.json({ error: "Missing PayPal Order ID." }, { status: 400 });
    }

    const accessToken = await generatePayPalAccessToken();

    const baseUrl = process.env.PAYPAL_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com");
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await readPayPalResponse(response);

    if (response.ok && data.status === "COMPLETED") {
      const captureId =
        data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? "";
      
      const payerId = (data.payer as any)?.payer_id ?? "";

      if (!captureId) {
        console.warn("[paypal/capture-order] Capture completed but no capture identifier was returned", {
          body: data,
        });
      }

      return NextResponse.json({
        success: true,
        captureId,
        payerId,
        captureDetails: data,
      });
    }

    console.error("[paypal/capture-order] Failed to capture order", {
      status: response.status,
      name: data.name ?? null,
      message: data.message ?? null,
      debugId: data.debug_id ?? null,
      details: data.details ?? null,
    });

    return NextResponse.json(
      { error: "Failed to capture PayPal funds.", debugId: data.debug_id ?? null },
      { status: 500 }
    );
  } catch (error: unknown) {
    console.error("[paypal/capture-order] Unexpected error", error);
    return NextResponse.json(
      { error: "Server error occurred during PayPal capture." },
      { status: 500 }
    );
  }
}
