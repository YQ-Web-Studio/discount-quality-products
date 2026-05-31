import Stripe from "stripe";
import { createWooCommerceOrder, updateWooCommerceOrder } from "@/lib/woocommerce";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import React from "react";

/** Shared payment meta added to every confirmed order. */
export function buildPaymentMeta(paymentIntentId: string, chargeId: string) {
  return [
    { key: "_stripe_intent_id",      value: paymentIntentId },
    { key: "_stripe_charge_id",      value: chargeId },
    // _stripe_source_id is a legacy alias also read by some WC Stripe plugin versions
    { key: "_stripe_source_id",      value: chargeId },
    // _stripe_charge_captured MUST be "yes" — process_refund() bails early without it
    { key: "_stripe_charge_captured", value: "yes" },
  ];
}

/** Helper function to send Order Confirmation Email */
export async function sendConfirmationEmailForOrder(order: any, metadataForm?: any) {
  try {
    const recipientEmail = order.billing?.email || metadataForm?.em;
    if (!recipientEmail) {
      console.warn("[stripe-sync] No recipient email found. Skipping confirmation email.");
      return;
    }

    const emailItems = order.line_items?.map((item: any) => ({
      id: item.id.toString(),
      title: item.name,
      quantity: item.quantity,
      price: item.total ? `£${parseFloat(item.total).toFixed(2)}` : '£0.00',
      thumbnail: item.image?.src || null,
    })) || [];

    const customerName = order.billing?.first_name || metadataForm?.fn || 'Customer';
    const shippingName = `${order.shipping?.first_name || metadataForm?.fn || ''} ${order.shipping?.last_name || metadataForm?.ln || ''}`.trim() || 'Customer';

    await sendEmail({
      to: recipientEmail,
      subject: `Order Confirmation - #${order.id}`,
      react: React.createElement(OrderConfirmationEmail, {
        customerName: customerName,
        orderNumber: order.id.toString(),
        orderDate: new Date(order.date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: emailItems,
        subtotal: `£${parseFloat(order.total || '0').toFixed(2)}`,
        shipping: `£0.00`,
        vat: `£${parseFloat(order.total_tax || '0').toFixed(2)}`,
        total: `£${parseFloat(order.total || '0').toFixed(2)}`,
        shippingAddress: {
          name: shippingName,
          line1: order.shipping?.address_1 || metadataForm?.a1 || '',
          line2: order.shipping?.address_2 || '',
          city: order.shipping?.city || metadataForm?.ct || '',
          postcode: order.shipping?.postcode || metadataForm?.pc || '',
          country: order.shipping?.country || 'United Kingdom',
        },
        shippingMethod: "Free Delivery",
      }),
    });
    console.log(`[stripe-sync] Confirmation email sent successfully to ${recipientEmail} for order #${order.id}`);
  } catch (emailError) {
    console.error("[stripe-sync] Failed to send order confirmation email:", emailError);
  }
}

/**
 * Promotes an existing WooCommerce order to "processing" now that payment
 * has been confirmed. Falls back to creating a brand-new order if no linked
 * order is available (for example, if WooCommerce was unavailable at the time).
 * Returns the created or updated order.
 */
export async function processOrderFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  chargeId: string
): Promise<any> {
  const { cart_items, cart_shipping, cart_form, wc_order_id, wc_customer_id } = paymentIntent.metadata ?? {};

  if (!cart_items || !cart_form) {
    console.warn(
      `[stripe-sync] missing cart_items or cart_form in metadata. ` +
      `Order processing skipped. PaymentIntent: ${paymentIntent.id}`
    );
    return null;
  }

  let items: { i: number; q: number }[];
  let form: { fn: string; ln: string; em: string; a1: string; ct: string; pc: string };

  try {
    items = JSON.parse(cart_items);
    form = JSON.parse(cart_form);
  } catch (err) {
    console.error(`[stripe-sync] Failed to parse cart metadata for ${paymentIntent.id}:`, err);
    return null;
  }

  const shippingMethod = cart_shipping ?? "standard";
  const shippingCost = 0;
  const shippingTitle = "Free Delivery";
  const line_items = items.map((item) => ({ product_id: item.i, quantity: item.q }));
  const paymentMeta = buildPaymentMeta(paymentIntent.id, chargeId);

  // ── Path A: update the linked WooCommerce order if one already exists ────
  if (wc_order_id) {
    const orderId = parseInt(wc_order_id, 10);
    try {
      const updated = await updateWooCommerceOrder(orderId, {
        status: "processing",
        set_paid: true,
        transaction_id: chargeId || paymentIntent.id,
        customer_note: `Payment captured securely via Stripe. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}.`,
        meta_data: paymentMeta,
      });
      console.log(
        `[stripe-sync] ✓ WooCommerce order #${updated.number ?? updated.id} updated to "processing" for PaymentIntent ${paymentIntent.id}.`
      );
      // Send order confirmation email
      await sendConfirmationEmailForOrder(updated, form);
      return updated;
    } catch (err) {
      console.error(`[stripe-sync] Failed to update existing order ${orderId} — falling back to create:`, err);
    }
  }

  // ── Path B: fallback — create order from scratch (WC was down at intent time) ──
  const orderPayload = {
    payment_method: "stripe",
    payment_method_title: "Credit Card (Stripe)",
    set_paid: true,
    status: "processing",
    transaction_id: chargeId || paymentIntent.id,
    customer_id: wc_customer_id ? parseInt(wc_customer_id, 10) : 0,
    customer_note: `Payment captured securely via Stripe. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}.`,
    billing: {
      first_name: form.fn,
      last_name: form.ln,
      address_1: form.a1,
      city: form.ct,
      postcode: form.pc,
      country: "GB",
      email: form.em,
    },
    shipping: {
      first_name: form.fn,
      last_name: form.ln,
      address_1: form.a1,
      city: form.ct,
      postcode: form.pc,
      country: "GB",
    },
    line_items,
    shipping_lines: [
      {
        method_id: "flat_rate",
        method_title: shippingTitle,
        total: shippingCost.toString(),
      },
    ],
    meta_data: paymentMeta,
  };

  try {
    const newOrder = await createWooCommerceOrder(orderPayload);
    console.log(
      `[stripe-sync] ✓ WooCommerce order #${newOrder.number ?? newOrder.id} created (fallback) for PaymentIntent ${paymentIntent.id}.`
    );
    // Send order confirmation email
    await sendConfirmationEmailForOrder(newOrder, form);
    return newOrder;
  } catch (err) {
    console.error(`[stripe-sync] ══════════════════════════════════════════════════════`);
    console.error(`[stripe-sync] FATAL: Stripe payment SUCCEEDED but WooCommerce order processing FAILED.`);
    console.error(`[stripe-sync] PaymentIntent ID: ${paymentIntent.id}`);
    console.error(`[stripe-sync] Customer Email:   ${form.em}`);
    console.error(`[stripe-sync] Error Details:    `, err);
    console.error(`[stripe-sync] ══════════════════════════════════════════════════════`);
    return null;
  }
}
