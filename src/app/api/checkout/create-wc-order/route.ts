import { NextResponse } from "next/server";
import { createWooCommerceOrder } from "@/lib/woocommerce";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import React from "react";

interface CheckoutCustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  county: string;
  postcode: string;
  phone?: string;
  country?: string;

  showBillingAddress?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingCounty?: string;
  billingPostcode?: string;
  billingPhone?: string;
  billingCountry?: string;
}

interface CheckoutItem {
  id: string;
  quantity: number;
}

interface CheckoutRequestBody {
  form: CheckoutCustomerForm;
  items: CheckoutItem[];
  shippingMethod?: string;
  paymentProvider?: string;
  transactionId?: string;
  paypalOrderId?: string;
  payerId?: string;
}

function resolveToNumericId(id: string): number {
  const n = Number.parseInt(id, 10);
  if (!Number.isNaN(n)) return n;

  try {
    const decoded = Buffer.from(id, "base64").toString("utf8");
    const match = decoded.match(/:(\d+)$/);
    if (match) return Number.parseInt(match[1], 10);
  } catch {
    // Unrecognised format; return NaN so the caller can reject it.
  }

  return Number.NaN;
}

export async function POST(req: Request) {
  let body = {} as Partial<CheckoutRequestBody>;

  try {
    body = (await req.json()) as CheckoutRequestBody;
    const { form, items, shippingMethod, paymentProvider, transactionId } = body;

    if (!form || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing order data." }, { status: 400 });
    }

    const shippingCost = 0;
    const shippingTitle = "Free Delivery";

    const line_items = items.map((item) => {
      const productId = resolveToNumericId(item.id);

      if (Number.isNaN(productId)) {
        throw new Error(`Malformed basket item ID: "${item.id}". Expected a numeric databaseId or a base64-encoded WPGraphQL global ID.`);
      }

      console.log(`[checkout] Mapping product ID ${productId} from basket item "${item.id}"`);
      return {
        product_id: productId,
        quantity: item.quantity,
      };
    });

    const providerName = paymentProvider === "paypal" ? "PayPal" : "Credit Card (Stripe)";
    const session = await getCurrentWordPressSession();

    const delivery = {
      first_name: form.firstName,
      last_name: form.lastName,
      address_1: form.address1,
      address_2: form.address2 || "",
      city: form.city,
      state: form.county, // Aligning county to WooCommerce state parameter
      postcode: form.postcode,
      country: form.country || "GB",
      phone: form.phone || "",
    };

    const isBillingDifferent = form.showBillingAddress === true;
    const billing = {
      first_name: isBillingDifferent ? (form.billingFirstName || form.firstName) : form.firstName,
      last_name: isBillingDifferent ? (form.billingLastName || form.lastName) : form.lastName,
      address_1: isBillingDifferent ? (form.billingAddress1 || form.address1) : form.address1,
      address_2: isBillingDifferent ? (form.billingAddress2 || form.address2 || "") : (form.address2 || ""),
      city: isBillingDifferent ? (form.billingCity || form.city) : form.city,
      state: isBillingDifferent ? (form.billingCounty || form.county) : form.county, // Aligning county to WooCommerce state parameter
      postcode: isBillingDifferent ? (form.billingPostcode || form.postcode) : form.postcode,
      country: isBillingDifferent ? (form.billingCountry || form.country || "GB") : (form.country || "GB"),
      email: form.email,
      phone: isBillingDifferent ? (form.billingPhone || form.phone || "") : (form.phone || ""),
    };

    const orderData: Record<string, unknown> = {
      payment_method: paymentProvider === "paypal" ? "ppcp-gateway" : paymentProvider,
      payment_method_title: providerName,
      currency: "GBP",
      set_paid: true,
      status: "processing",
      transaction_id: transactionId,
      customer_id: session?.user?.id ? session.user.id : 0,
      customer_note: `Payment captured securely via ${providerName}. Transaction ID: ${transactionId ?? ""}`,
      billing: billing,
      shipping: delivery,
      line_items,
      shipping_lines: [
        {
          method_id: "flat_rate",
          method_title: shippingTitle,
          total: shippingCost.toString(),
        },
      ],
    };

    if (paymentProvider === "paypal") {
      const payPalPaymentMode = process.env.NODE_ENV === "production" ? "live" : "sandbox";

      orderData.meta_data = [
        // WooCommerce PayPal Payments reads its own PPCP meta keys when it builds
        // refund and transaction lookups, so we store both the native PPCP fields
        // and our existing trace fields for backwards compatibility.
        { key: "_ppcp_paypal_order_id", value: body.paypalOrderId ?? "" },
        { key: "_ppcp_paypal_intent", value: "CAPTURE" },
        { key: "_ppcp_paypal_payment_mode", value: payPalPaymentMode },
        { key: "_ppcp_paypal_captured", value: "yes" },
        { key: "_transaction_id", value: transactionId ?? "" },
        { key: "_paypal_transaction_id", value: transactionId ?? "" },
        { key: "_paypal_order_id", value: body.paypalOrderId ?? "" },
        // The following meta keys are specifically required by the WooCommerce PayPal Payments 
        // plugin to enable the "Refund via PayPal" functionality in the dashboard.
        { key: "_paypal_status", value: "COMPLETED" },
        { key: "_paypal_intent", value: "capture" },
        { key: "_paypal_capture_id", value: transactionId ?? "" },
        { key: "_paypal_payer_id", value: body.payerId ?? "" },
        { key: "_paypal_order_status", value: "COMPLETED" },
      ];
    } else if (paymentProvider === "stripe") {
      orderData.meta_data = [
        { key: "_stripe_intent_id", value: transactionId ?? "" },
      ];
    }

    const newOrder = await createWooCommerceOrder(orderData);

    // 4. Send Order Confirmation Email
    try {
      const recipientEmail = newOrder.billing?.email || form?.email;
      if (recipientEmail) {
        const emailItems = newOrder.line_items?.map((item: any) => ({
          id: item.id.toString(),
          title: item.name,
          quantity: item.quantity,
          price: item.total ? `£${parseFloat(item.total).toFixed(2)}` : '£0.00',
          thumbnail: item.image?.src || null,
        })) || [];

        await sendEmail({
          to: recipientEmail,
          subject: `Order Confirmation - #${newOrder.id}`,
          react: React.createElement(OrderConfirmationEmail, {
            customerName: newOrder.billing?.first_name || form?.firstName || 'Customer',
            orderNumber: newOrder.id.toString(),
            orderDate: new Date(newOrder.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            items: emailItems,
            subtotal: `£${parseFloat(newOrder.total || '0').toFixed(2)}`,
            shipping: `£0.00`,
            vat: `£${parseFloat(newOrder.total_tax || '0').toFixed(2)}`,
            total: `£${parseFloat(newOrder.total || '0').toFixed(2)}`,
            shippingAddress: {
              name: `${newOrder.shipping?.first_name || ''} ${newOrder.shipping?.last_name || ''}`.trim(),
              line1: newOrder.shipping?.address_1 || '',
              line2: newOrder.shipping?.address_2 || '',
              city: newOrder.shipping?.city || '',
              postcode: newOrder.shipping?.postcode || '',
              country: newOrder.shipping?.country || 'United Kingdom',
            },
            shippingMethod: shippingTitle,
          }),
        });
      }
    } catch (emailError) {
      console.error("[checkout] Failed to send order confirmation email:", emailError);
    }

    return NextResponse.json({ success: true, orderId: newOrder.id });
  } catch (error: unknown) {
    console.error(`[checkout] Failed to create WooCommerce order for ${body.paymentProvider || "gateway"} payment`, {
      error,
    });

    return NextResponse.json(
      { error: "Order logging failed. Please contact support." },
      { status: 500 }
    );
  }
}
