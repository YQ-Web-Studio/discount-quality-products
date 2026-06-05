import { NextResponse } from "next/server";
import { updateWooCommerceOrder } from "@/lib/woocommerce";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import OrderDispatchedEmail from "@/emails/OrderDispatchedEmail";
import React from "react";

export async function POST(req: Request) {
  // 1. Authenticate the Webhook request
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    console.error("[woocommerce-webhook] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let order: any;
  try {
    order = await req.json();
  } catch (err) {
    console.error("[woocommerce-webhook] Failed to parse webhook JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, status, billing, shipping, line_items, total, total_tax, date_created, meta_data } = order;

  if (!id) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  console.log(`[woocommerce-webhook] Received webhook for order #${id} (Status: ${status})`);

  const meta = meta_data || [];
  const confirmationSent = meta.find((m: any) => m.key === "_confirmation_email_sent")?.value === "yes";
  const dispatchSent = meta.find((m: any) => m.key === "_dispatch_email_sent")?.value === "yes";

  const recipientEmail = billing?.email;
  if (!recipientEmail) {
    console.warn(`[woocommerce-webhook] Order #${id} has no billing email address. Skipping email notifications.`);
    return NextResponse.json({ success: true, message: "Skipped (no email)" });
  }

  const emailItems = line_items?.map((item: any) => ({
    id: item.id.toString(),
    title: item.name,
    quantity: item.quantity,
    price: item.total ? `£${parseFloat(item.total).toFixed(2)}` : '£0.00',
    thumbnail: item.image?.src || null,
  })) || [];

  const customerName = billing?.first_name || 'Customer';
  const shippingName = `${shipping?.first_name || ''} ${shipping?.last_name || ''}`.trim() || 'Customer';

  // 2. Handle 'processing' status (Order Confirmation Email)
  if (status === "processing") {
    if (confirmationSent) {
      console.log(`[woocommerce-webhook] Confirmation email already sent for order #${id}. Skipping.`);
      return NextResponse.json({ success: true, message: "Skipped (already sent)" });
    }

    try {
      console.log(`[woocommerce-webhook] Triggering order confirmation email for order #${id}...`);
      await sendEmail({
        to: recipientEmail,
        subject: `Order Confirmation - #${id}`,
        react: React.createElement(OrderConfirmationEmail, {
          customerName: customerName,
          orderNumber: id.toString(),
          orderDate: new Date(date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: emailItems,
          subtotal: `£${parseFloat(order.total || '0').toFixed(2)}`,
          shipping: `£0.00`,
          vat: `£${parseFloat(total_tax || '0').toFixed(2)}`,
          total: `£${parseFloat(total || '0').toFixed(2)}`,
          shippingAddress: {
            name: shippingName,
            line1: shipping?.address_1 || '',
            line2: shipping?.address_2 || '',
            city: shipping?.city || '',
            postcode: shipping?.postcode || '',
            country: shipping?.country || 'United Kingdom',
          },
          shippingMethod: "Free Delivery",
        }),
      });

      // Update WooCommerce metadata to flag that the confirmation email has been dispatched
      await updateWooCommerceOrder(id, {
        meta_data: [{ key: "_confirmation_email_sent", value: "yes" }],
      });
      console.log(`[woocommerce-webhook] ✓ Order #${id} updated with _confirmation_email_sent: yes`);
    } catch (err) {
      console.error(`[woocommerce-webhook] Error handling confirmation email for order #${id}:`, err);
      return NextResponse.json({ error: "Failed to send confirmation email" }, { status: 500 });
    }
  }

  // 3. Handle 'completed' status (Order Dispatched/Completed Email)
  if (status === "completed") {
    if (dispatchSent) {
      console.log(`[woocommerce-webhook] Dispatch email already sent for order #${id}. Skipping.`);
      return NextResponse.json({ success: true, message: "Skipped (already sent)" });
    }

    // Extract tracking details if they exist in the metadata
    let trackingProvider = "";
    let trackingNumber = "";
    let trackingLink = "";

    // Check AST tracking items (often serialized or an array)
    const astTrackingMeta = meta.find((m: any) => m.key === "_wc_shipment_tracking_items")?.value;
    if (astTrackingMeta) {
      try {
        const trackingItems = typeof astTrackingMeta === 'string' ? JSON.parse(astTrackingMeta) : astTrackingMeta;
        if (Array.isArray(trackingItems) && trackingItems.length > 0) {
          const item = trackingItems[0];
          trackingProvider = item.formatted_tracking_provider || item.tracking_provider || "";
          trackingNumber = item.tracking_number || "";
          trackingLink = item.custom_tracking_link || item.tracking_link || "";
        }
      } catch (e) {
        console.warn("[woocommerce-webhook] Failed to parse AST tracking metadata:", e);
      }
    }

    // Fallbacks to standard meta keys
    if (!trackingNumber) {
      trackingNumber = meta.find((m: any) => m.key === "_tracking_number" || m.key === "tracking_number")?.value || "";
      trackingProvider = meta.find((m: any) => m.key === "_tracking_provider" || m.key === "tracking_provider")?.value || "";
      trackingLink = meta.find((m: any) => m.key === "_tracking_link" || m.key === "tracking_link")?.value || "";
    }

    try {
      console.log(`[woocommerce-webhook] Triggering order dispatch email for order #${id}...`);
      await sendEmail({
        to: recipientEmail,
        subject: `Your Order #${id} Has Been Dispatched!`,
        react: React.createElement(OrderDispatchedEmail, {
          customerName: customerName,
          orderNumber: id.toString(),
          orderDate: new Date(date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: emailItems,
          subtotal: `£${parseFloat(order.total || '0').toFixed(2)}`,
          shipping: `£0.00`,
          vat: `£${parseFloat(total_tax || '0').toFixed(2)}`,
          total: `£${parseFloat(total || '0').toFixed(2)}`,
          shippingAddress: {
            name: shippingName,
            line1: shipping?.address_1 || '',
            line2: shipping?.address_2 || '',
            city: shipping?.city || '',
            postcode: shipping?.postcode || '',
            country: shipping?.country || 'United Kingdom',
          },
          shippingMethod: "Free Delivery",
          trackingProvider: trackingProvider || "Courier",
          trackingNumber: trackingNumber || undefined,
          trackingLink: trackingLink || undefined,
        }),
      });

      // Update WooCommerce metadata to flag that the dispatch email has been sent
      await updateWooCommerceOrder(id, {
        meta_data: [{ key: "_dispatch_email_sent", value: "yes" }],
      });
      console.log(`[woocommerce-webhook] ✓ Order #${id} updated with _dispatch_email_sent: yes`);
    } catch (err) {
      console.error(`[woocommerce-webhook] Error handling dispatch email for order #${id}:`, err);
      return NextResponse.json({ error: "Failed to send dispatch email" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
