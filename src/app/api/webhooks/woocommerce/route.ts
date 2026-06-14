import { NextResponse } from "next/server";
import { updateWooCommerceOrder } from "@/lib/woocommerce";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import OrderDispatchedEmail from "@/emails/OrderDispatchedEmail";
import OrderRefundedEmail from "@/emails/OrderRefundedEmail";
import React from "react";

export async function POST(req: Request) {
  // 1. Authenticate the Webhook request
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    console.error("[woocommerce-webhook] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch (err) {
    console.error("[woocommerce-webhook] Failed to read body text:", err);
    return NextResponse.json({ error: "Failed to read body text" }, { status: 400 });
  }

  if (!bodyText || bodyText.trim() === "") {
    console.log("[woocommerce-webhook] Received empty request body. Returning verification success.");
    return NextResponse.json({ success: true, message: "Webhook URL successfully verified" });
  }

  let order: any;
  try {
    order = JSON.parse(bodyText);
  } catch (err) {
    console.warn("[woocommerce-webhook] Failed to parse body as JSON. Returning success to pass webhook verification:", err);
    return NextResponse.json({ success: true, message: "Webhook URL successfully verified (non-JSON)" });
  }

  const { id, status, billing, shipping, line_items, total, total_tax, date_created, meta_data, webhook_id } = order;

  // Handle WooCommerce Webhook ping/verification request
  if (webhook_id || !id) {
    console.log(`[woocommerce-webhook] Received verification ping (Webhook ID: ${webhook_id || 'N/A'}).`);
    return NextResponse.json({ success: true, message: "Webhook URL successfully verified" });
  }

  // NOTE: We intentionally do NOT call revalidateTag("wc-products") here.
  // Order status changes (processing/completed/refunded) don't change the product catalogue.
  // Each revalidateTag("wc-products") was invalidating the ENTIRE product cache across all pages,
  // burning through Vercel's ISR write quota. Product data freshness is handled by:
  //   1. The Stripe webhook (targeted per-product tag invalidation after purchase)
  //   2. POST /api/revalidate (called by the ingestion engine when products are actually updated)
  //   3. Time-based unstable_cache expiry as a safety net

  console.log(`[woocommerce-webhook] Received webhook for order #${id} (Status: ${status})`);

  const meta = meta_data || [];
  const confirmationSent = meta.find((m: any) => m.key === "_confirmation_email_sent")?.value === "yes";
  const dispatchSent = meta.find((m: any) => m.key === "_dispatch_email_sent")?.value === "yes";
  const refundSent = meta.find((m: any) => m.key === "_refund_email_sent")?.value === "yes";

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

  const orderTotal = parseFloat(total || '0');
  const orderTax = parseFloat(total_tax || '0');
  const vatVal = orderTax || (orderTotal / 6);
  const subtotalVal = orderTotal - vatVal;

  // 2. Handle 'processing' status (Order Confirmation Email)
  if (status === "processing") {
    if (confirmationSent) {
      console.log(`[woocommerce-webhook] Confirmation email already sent for order #${id}. Skipping.`);
      return NextResponse.json({ success: true, message: "Skipped (already sent)" });
    }

    try {
      console.log(`[woocommerce-webhook] Triggering order confirmation email for order #${id}...`);
      const emailResult = await sendEmail({
        to: recipientEmail,
        subject: `Order Confirmation - #${id}`,
        react: React.createElement(OrderConfirmationEmail, {
          customerName: customerName,
          orderNumber: id.toString(),
          orderDate: new Date(date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: emailItems,
          subtotal: `£${subtotalVal.toFixed(2)}`,
          shipping: `£0.00`,
          vat: `£${vatVal.toFixed(2)}`,
          total: `£${orderTotal.toFixed(2)}`,
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

      if (!emailResult.success) {
        throw new Error(`Resend email delivery failed: ${JSON.stringify(emailResult.error)}`);
      }

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
      const emailResult = await sendEmail({
        to: recipientEmail,
        subject: `Your Order #${id} Has Been Dispatched!`,
        react: React.createElement(OrderDispatchedEmail, {
          customerName: customerName,
          orderNumber: id.toString(),
          orderDate: new Date(date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: emailItems,
          subtotal: `£${subtotalVal.toFixed(2)}`,
          shipping: `£0.00`,
          vat: `£${vatVal.toFixed(2)}`,
          total: `£${orderTotal.toFixed(2)}`,
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

      if (!emailResult.success) {
        throw new Error(`Resend email delivery failed: ${JSON.stringify(emailResult.error)}`);
      }

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
  // 4. Handle 'refunded' status (Order Refunded Email)
  if (status === "refunded") {
    if (refundSent) {
      console.log(`[woocommerce-webhook] Refund email already sent for order #${id}. Skipping.`);
      return NextResponse.json({ success: true, message: "Skipped (already sent)" });
    }

    // Determine the refund amount
    let refundAmountStr = "";
    if (Array.isArray(order.refunds) && order.refunds.length > 0) {
      const totalRefunded = order.refunds.reduce((acc: number, r: any) => acc + Math.abs(parseFloat(r.total || '0')), 0);
      refundAmountStr = `£${totalRefunded.toFixed(2)}`;
    } else {
      refundAmountStr = `£${parseFloat(total || '0').toFixed(2)}`;
    }

    try {
      console.log(`[woocommerce-webhook] Triggering order refund email for order #${id}...`);
      const emailResult = await sendEmail({
        to: recipientEmail,
        subject: `Refund Issued for Order #${id}`,
        react: React.createElement(OrderRefundedEmail, {
          customerName: customerName,
          orderNumber: id.toString(),
          orderDate: new Date(date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: emailItems,
          subtotal: `£${subtotalVal.toFixed(2)}`,
          shipping: `£0.00`,
          vat: `£${vatVal.toFixed(2)}`,
          total: `£${orderTotal.toFixed(2)}`,
          refundAmount: refundAmountStr,
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

      if (!emailResult.success) {
        throw new Error(`Resend email delivery failed: ${JSON.stringify(emailResult.error)}`);
      }

      // Update WooCommerce metadata to flag that the refund email has been sent
      await updateWooCommerceOrder(id, {
        meta_data: [{ key: "_refund_email_sent", value: "yes" }],
      });
      console.log(`[woocommerce-webhook] ✓ Order #${id} updated with _refund_email_sent: yes`);
    } catch (err) {
      console.error(`[woocommerce-webhook] Error handling refund email for order #${id}:`, err);
      return NextResponse.json({ error: "Failed to send refund email" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
