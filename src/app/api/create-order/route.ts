import { NextResponse } from "next/server";
import { createWooCommerceOrder } from "@/lib/woocommerce";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import React from "react";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { form, items, shippingMethod } = body;

    if (!form || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing order data." }, { status: 400 });
    }

    // Determine shipping cost (free)
    const shippingCost = 0;
    const shippingTitle = "Free Delivery";

    // Map WooCommerce Line Items
    const line_items = items.map((item: any) => ({
      product_id: parseInt(item.id.replace("wc-", ""), 10),
      quantity: item.quantity,
    }));

    // WooCommerce Order Data Payload
    const orderData = {
      payment_method: "stripe",
      payment_method_title: "Stripe",
      set_paid: true,
      status: "processing", // Fulfilling user requirement
      billing: {
        first_name: form.firstName,
        last_name: form.lastName,
        address_1: form.address1,
        city: form.city,
        postcode: form.postcode,
        country: "GB",
        email: form.email,
      },
      shipping: {
        first_name: form.firstName,
        last_name: form.lastName,
        address_1: form.address1,
        city: form.city,
        postcode: form.postcode,
        country: "GB",
      },
      line_items: line_items,
      shipping_lines: [
        {
          method_id: "flat_rate",
          method_title: shippingTitle,
          total: shippingCost.toString(),
        },
      ],
    };

    const newOrder = await createWooCommerceOrder(orderData);

    try {
      if (newOrder.billing?.email) {
        const emailItems = newOrder.line_items?.map((item: any) => ({
          id: item.id.toString(),
          title: item.name,
          quantity: item.quantity,
          price: item.total ? `£${parseFloat(item.total).toFixed(2)}` : '£0.00',
          thumbnail: item.image?.src || null,
        })) || [];

        await sendEmail({
          to: newOrder.billing.email,
          subject: `Order Confirmation - #${newOrder.id}`,
          react: React.createElement(OrderConfirmationEmail, {
            customerName: newOrder.billing.first_name || 'Customer',
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
  } catch (error: any) {
    // If Stripe payment succeeded but this failed, log it firmly
    console.error("FATAL ERROR: Stripe Payment Succeeded but WooCommerce Order Creation Failed.");
    console.error("Details:", error);

    return NextResponse.json(
      { error: "Order logging failed. Please contact support." },
      { status: 500 }
    );
  }
}
