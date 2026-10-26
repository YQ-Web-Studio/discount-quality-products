import { NextResponse } from "next/server";
import { validateCartTotals } from "@/lib/checkout";
import { createWooCommerceOrder, updateWooCommerceOrder, fetchWooCommerceOrder, searchWooCommerceOrderByPaymentIntent } from "@/lib/woocommerce";
import { buildPendingOrderPayload } from "@/lib/server-payment-verify";
import { sendConfirmationEmailForOrder } from "@/lib/stripe-sync";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";

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
    const { orderID, wcOrderId, items, shippingMethod, form, couponCode } = (await req.json()) as {
      orderID?: string;
      wcOrderId?: number | string;
      items?: Array<{ id: string; quantity: number }>;
      shippingMethod?: string;
      form?: any;
      couponCode?: string;
    };

    if (!orderID) {
      return NextResponse.json({ error: "Missing PayPal Order ID." }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Missing basket items." }, { status: 400 });
    }

    // Validate the cart BEFORE capturing funds. Once PayPal captures, money has moved,
    // so an invalid cart (rejected coupon, stock change) must be caught here, not in
    // create-wc-order afterwards.
    const validation = await validateCartTotals(
      items.map((i) => ({ id: i.id, quantity: i.quantity })),
      shippingMethod || "standard",
      form ? { country: form.country || "GB", city: form.city, postcode: form.postcode, email: form.email } : undefined,
      couponCode
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Cart validation failed before payment capture." },
        { status: 400 }
      );
    }

    const accessToken = await generatePayPalAccessToken();

    const baseUrl = process.env.PAYPAL_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com");

    // Verify that the PayPal order purchase-unit amount matches the validated finalTotal
    const orderDetailsRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!orderDetailsRes.ok) {
      return NextResponse.json(
        { error: "Failed to verify PayPal order details prior to capture." },
        { status: 400 }
      );
    }

    const orderDetails = await orderDetailsRes.json();
    const purchaseUnit = orderDetails.purchase_units?.[0];
    const payPalAmountStr = purchaseUnit?.amount?.value;
    const payPalCurrency = purchaseUnit?.amount?.currency_code;
    const payPalAmount = parseFloat(payPalAmountStr || "0");
    const expectedAmountStr = validation.finalTotal.toFixed(2);

    if (payPalCurrency !== "GBP" || Math.abs(payPalAmount - validation.finalTotal) > 0.01) {
      return NextResponse.json(
        {
          error: `Payment amount mismatch. PayPal: ${payPalCurrency || "unknown"} ${payPalAmountStr}, Expected: GBP ${expectedAmountStr}`,
        },
        { status: 400 }
      );
    }

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

      let resolvedOrderId: number | undefined = wcOrderId ? Number(wcOrderId) : undefined;
      const customId = purchaseUnit?.custom_id || (data.purchase_units?.[0] as any)?.custom_id;
      if (!resolvedOrderId && customId) {
        const parsed = parseInt(String(customId), 10);
        if (!isNaN(parsed)) resolvedOrderId = parsed;
      }

      const captureNote = `Payment captured securely via PayPal. Capture ID: ${captureId}.${couponCode ? ` Voucher: ${couponCode.toUpperCase()} applied.` : ""}`;

      if (resolvedOrderId) {
        try {
          console.log(`[paypal/capture-order] Promoting pending WooCommerce order #${resolvedOrderId} to processing...`);
          await updateWooCommerceOrder(resolvedOrderId, {
            status: "processing",
            set_paid: true,
            transaction_id: captureId,
            customer_note: captureNote,
          });

          // Send confirmation email
          const order = await fetchWooCommerceOrder(resolvedOrderId);
          if (order && form?.email) {
            await sendConfirmationEmailForOrder(order, {
              fn: form.firstName,
              ln: form.lastName,
              em: form.email,
              a1: form.address1,
              ct: form.city,
              pc: form.postcode,
            });
          }
        } catch (updateErr) {
          console.error(`[paypal/capture-order] Warning promoting order #${resolvedOrderId}:`, updateErr);
        }
      } else {
        // Check if an order already exists for this PayPal transaction/capture (deduplication guard)
        try {
          const existing = await searchWooCommerceOrderByPaymentIntent(captureId || orderID);
          if (existing) {
            console.log(`[paypal/capture-order] Found existing order #${existing.number ?? existing.id} for capture ${captureId || orderID} — skipping duplicate creation.`);
            resolvedOrderId = existing.id;
          }
        } catch (searchErr) {
          console.warn(`[paypal/capture-order] Deduplication lookup notice:`, searchErr);
        }

        if (!resolvedOrderId) {
          try {
            console.log(`[paypal/capture-order] Creating processing WooCommerce order for capture ${captureId}...`);
            const session = await getCurrentWordPressSession();
            const orderPayload = buildPendingOrderPayload({
              items,
              form,
              shippingCost: validation.shippingCost ?? 0,
              shippingTitle: validation.shippingTitle || "Standard Delivery",
              paymentProvider: 'paypal',
              couponCode,
              customerId: session?.user?.id ? Number(session.user.id) : undefined,
              status: 'processing',
              setPaid: true,
              transactionId: captureId,
              customerNote: captureNote,
            });

            if (!couponCode && validation.discountAmount > 0) {
              orderPayload.fee_lines = [
                {
                  name: "Promotion Discount",
                  total: `-${(validation.discountAmount / 1.2).toFixed(2)}`,
                  tax_status: "taxable",
                },
              ];
            }

            const createdOrder = await createWooCommerceOrder(orderPayload);
            resolvedOrderId = createdOrder.id;

            if (form?.email) {
              try {
                await sendConfirmationEmailForOrder(createdOrder, {
                  fn: form.firstName,
                  ln: form.lastName,
                  em: form.email,
                  a1: form.address1,
                  ct: form.city,
                  pc: form.postcode,
                });
              } catch (emailErr) {
                console.error(`[paypal/capture-order] Warning: Failed to send confirmation email for order #${resolvedOrderId}:`, emailErr);
              }
            }
          } catch (createErr) {
            console.error(`[paypal/capture-order] Failed to create processing order for capture ${captureId}:`, createErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        orderId: resolvedOrderId,
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
