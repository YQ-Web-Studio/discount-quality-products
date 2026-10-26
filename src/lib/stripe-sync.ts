import Stripe from "stripe";
import { createWooCommerceOrder, updateWooCommerceOrder, fetchWooCommerceOrder, searchWooCommerceOrderByPaymentIntent } from "@/lib/woocommerce";
import { sendEmail } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import React from "react";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_dummy") as string, {
  apiVersion: "2023-10-16" as any,
});

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

    const orderTotal = parseFloat(order.total || '0');
    const shippingCost = parseFloat(order.shipping_total || '0');
    const orderTax = parseFloat(order.total_tax || '0');
    const discountTotal = parseFloat(order.discount_total || '0');
    const discountTax = parseFloat(order.discount_tax || '0');
    const totalDiscount = discountTotal + discountTax;
    const vatVal = orderTax;
    const subtotalVal = orderTotal - shippingCost - vatVal + discountTotal;

    const shippingMethodTitle = order.shipping_lines?.[0]?.method_title || "Free Delivery";

    // Send customer confirmation copy
    await sendEmail({
      to: recipientEmail,
      subject: `Order Confirmation - #${order.id}`,
      react: React.createElement(OrderConfirmationEmail, {
        customerName: customerName,
        orderNumber: order.id.toString(),
        orderDate: new Date(order.date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: emailItems,
        subtotal: `£${subtotalVal.toFixed(2)}`,
        discount: totalDiscount > 0 ? `£${totalDiscount.toFixed(2)}` : undefined,
        shipping: `£${shippingCost.toFixed(2)}`,
        vat: `£${vatVal.toFixed(2)}`,
        total: `£${orderTotal.toFixed(2)}`,
        shippingAddress: {
          name: shippingName,
          line1: order.shipping?.address_1 || metadataForm?.a1 || '',
          line2: order.shipping?.address_2 || '',
          city: order.shipping?.city || metadataForm?.ct || '',
          postcode: order.shipping?.postcode || metadataForm?.pc || '',
          country: order.shipping?.country || 'United Kingdom',
        },
        shippingMethod: shippingMethodTitle,
      }),
    });
    console.log(`[stripe-sync] Confirmation email sent successfully to ${recipientEmail} for order #${order.id}`);

    // Also send admin notification copy
    try {
      console.log(`[stripe-sync] Sending order notification copy to admin for order #${order.id}...`);
      await sendEmail({
        to: 'sales@discountproducts.co.uk',
        subject: `[New Order] Order Confirmation - #${order.id}`,
        react: React.createElement(OrderConfirmationEmail, {
          customerName: customerName,
          orderNumber: order.id.toString(),
          orderDate: new Date(order.date_created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: emailItems,
          subtotal: `£${subtotalVal.toFixed(2)}`,
          discount: totalDiscount > 0 ? `£${totalDiscount.toFixed(2)}` : undefined,
          shipping: `£${shippingCost.toFixed(2)}`,
          vat: `£${vatVal.toFixed(2)}`,
          total: `£${orderTotal.toFixed(2)}`,
          shippingAddress: {
            name: shippingName,
            line1: order.shipping?.address_1 || metadataForm?.a1 || '',
            line2: order.shipping?.address_2 || '',
            city: order.shipping?.city || metadataForm?.ct || '',
            postcode: order.shipping?.postcode || metadataForm?.pc || '',
            country: order.shipping?.country || 'United Kingdom',
          },
          shippingMethod: shippingMethodTitle,
        }),
      });
      console.log(`[stripe-sync] ✓ Admin order notification copy sent for order #${order.id}`);
    } catch (adminEmailErr) {
      console.error(`[stripe-sync] Failed to send admin order notification copy for order #${order.id}:`, adminEmailErr);
    }
  } catch (emailError) {
    console.error("[stripe-sync] Failed to send order confirmation email:", emailError);
  }
}

// In-flight mutex map to serialize concurrent executions per PaymentIntent ID
// Prevents race conditions between webhook deliveries and success-page fallback polling
const inFlightPaymentIntents = new Map<string, Promise<any>>();

export function _resetInFlightPaymentIntents(): void {
  inFlightPaymentIntents.clear();
}

/**
 * Promotes an existing WooCommerce order to "processing" now that payment
 * has been confirmed. Falls back to creating a brand-new order if no linked
 * order is available (for example, if WooCommerce was unavailable at the time).
 * Returns the created or updated order.
 * Serialized per PaymentIntent to eliminate race conditions between webhook and client polling.
 */
export async function processOrderFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  chargeId: string
): Promise<any> {
  const flightKey = paymentIntent.id;
  const existingFlight = inFlightPaymentIntents.get(flightKey);
  if (existingFlight) {
    console.log(
      `[stripe-sync] Execution already in flight for PI ${flightKey} — deduplicating and awaiting existing execution.`
    );
    return existingFlight;
  }

  const execution = (async () => {
    return internalProcessOrderFromPaymentIntent(paymentIntent, chargeId);
  })();

  inFlightPaymentIntents.set(flightKey, execution);

  try {
    return await execution;
  } finally {
    inFlightPaymentIntents.delete(flightKey);
  }
}

async function internalProcessOrderFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  chargeId: string
): Promise<any> {
  const { cart_items, cart_shipping, cart_shipping_cost, cart_shipping_title, cart_discount, cart_coupon, cart_form, delivery_address, billing_address, wc_order_id, wc_customer_id, orderId: metaOrderId } = paymentIntent.metadata ?? {};
  const resolvedOrderId = metaOrderId || wc_order_id;
  const paymentMeta = buildPaymentMeta(paymentIntent.id, chargeId);
  const couponCode = cart_coupon ? cart_coupon.trim().toLowerCase() : "";

  // ── Path A: update the linked WooCommerce order if one already exists ────
  if (resolvedOrderId) {
    const orderId = parseInt(resolvedOrderId, 10);

    // ── Idempotency check: if the order was already promoted by a prior
    //    webhook delivery or the success-page fallback, return it as-is
    //    without re-updating or re-sending the confirmation email. ──
    try {
      const existing = await fetchWooCommerceOrder(orderId);
      if (existing && (existing.status === "processing" || existing.status === "completed")) {
        console.log(
          `[stripe-sync] Order #${existing.number ?? existing.id} is already "${existing.status}" — skipping duplicate update for PI ${paymentIntent.id}.`
        );
        return existing;
      }
    } catch (fetchErr) {
      // If we can't fetch the order to check, proceed with the update attempt.
      console.warn(`[stripe-sync] Could not fetch order ${orderId} for idempotency check:`, fetchErr);
    }

    let form: any = undefined;
    if (cart_form) {
      try {
        form = JSON.parse(cart_form);
      } catch {}
    }

    try {
      // In Path A: Promote order to processing with payment metadata.
      // Do NOT re-apply coupon_lines: coupons are already applied on the pending order,
      // and re-sending them triggers post-payment coupon validation errors in WooCommerce.
      const updatePayload: any = {
        status: "processing",
        set_paid: true,
        transaction_id: chargeId || paymentIntent.id,
        customer_note: `Payment captured securely via Stripe. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}.${couponCode ? ` Voucher: ${couponCode.toUpperCase()} applied.` : ""}`,
        meta_data: [
          ...paymentMeta,
          { key: "_confirmation_email_sent", value: "yes" },
        ],
      };
      const updated = await updateWooCommerceOrder(orderId, updatePayload);
      console.log(
        `[stripe-sync] ✓ WooCommerce order #${updated.number ?? updated.id} updated to "processing" for PaymentIntent ${paymentIntent.id}.`
      );
      // Send order confirmation email
      await sendConfirmationEmailForOrder(updated, form);
      return updated;
    } catch (err) {
      // CRITICAL: Do NOT fall through to Path B when a pre-created order exists.
      // Creating a second order would produce a duplicate. Instead, return null
      // so the webhook handler returns 500 and Stripe retries delivery.
      console.error(
        `[stripe-sync] Failed to update existing order ${orderId}. ` +
        `Returning null to trigger Stripe webhook retry (will NOT create a duplicate order). ` +
        `PaymentIntent: ${paymentIntent.id}`,
        err
      );
      return null;
    }
  }

  // ── Path B: fallback — create order from scratch (WC was down at intent time or direct checkout) ──
  // DEDUPLICATION GUARD: Before creating, search WooCommerce for an order that
  // already references this PaymentIntent. This prevents duplicates when the
  // webhook and success-page fallback race each other.
  try {
    const existingOrder = await searchWooCommerceOrderByPaymentIntent(paymentIntent.id);
    if (existingOrder) {
      console.log(
        `[stripe-sync] Found existing order #${existingOrder.number ?? existingOrder.id} for PI ${paymentIntent.id} — skipping duplicate creation.`
      );
      return existingOrder;
    }
  } catch (searchErr) {
    // If search fails, proceed cautiously with creation.
    console.warn(`[stripe-sync] Deduplication search failed for PI ${paymentIntent.id}:`, searchErr);
  }

  // If cart metadata is sparse or missing, recover gracefully rather than dropping payment
  if (!cart_items || (!cart_form && !delivery_address)) {
    console.warn(
      `[stripe-sync] Sparse metadata detected for succeeded PaymentIntent ${paymentIntent.id}. Recovering order from PaymentIntent details.`
    );

    const description = paymentIntent.description || `Stripe Payment ${paymentIntent.id}`;
    const totalAmount = paymentIntent.amount ? (paymentIntent.amount / 100).toFixed(2) : "0.00";
    const sparseNote = `Sparse Stripe Payment captured. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}. Description: ${description}. Total: £${totalAmount}. Please review and update line items or customer contact details if needed.`;

    const chargeData = (paymentIntent as any).charges?.data?.[0];
    const billingDetails = chargeData?.billing_details;
    const shippingDetails = (paymentIntent as any).shipping || chargeData?.shipping;
    const customerEmail = (paymentIntent as any).receipt_email || billingDetails?.email || "";

    const sparseBilling = {
      first_name: billingDetails?.name ? billingDetails.name.split(" ")[0] : "Customer",
      last_name: billingDetails?.name ? billingDetails.name.split(" ").slice(1).join(" ") : "",
      address_1: billingDetails?.address?.line1 || shippingDetails?.address?.line1 || "Address Pending",
      address_2: billingDetails?.address?.line2 || shippingDetails?.address?.line2 || "",
      city: billingDetails?.address?.city || shippingDetails?.address?.city || "London",
      state: billingDetails?.address?.state || shippingDetails?.address?.state || "",
      postcode: billingDetails?.address?.postal_code || shippingDetails?.address?.postal_code || "",
      country: billingDetails?.address?.country || shippingDetails?.address?.country || "GB",
      email: customerEmail,
      phone: billingDetails?.phone || shippingDetails?.phone || "",
    };

    const sparseShipping = {
      first_name: shippingDetails?.name ? shippingDetails.name.split(" ")[0] : sparseBilling.first_name,
      last_name: shippingDetails?.name ? shippingDetails.name.split(" ").slice(1).join(" ") : sparseBilling.last_name,
      address_1: shippingDetails?.address?.line1 || sparseBilling.address_1,
      address_2: shippingDetails?.address?.line2 || sparseBilling.address_2,
      city: shippingDetails?.address?.city || sparseBilling.city,
      state: shippingDetails?.address?.state || sparseBilling.state,
      postcode: shippingDetails?.address?.postal_code || sparseBilling.postcode,
      country: shippingDetails?.address?.country || sparseBilling.country,
    };

    const sparseOrderPayload: any = {
      payment_method: "stripe",
      payment_method_title: "Credit Card (Stripe)",
      set_paid: true,
      status: "processing",
      currency: (paymentIntent.currency || "gbp").toUpperCase(),
      transaction_id: chargeId || paymentIntent.id,
      customer_note: sparseNote,
      billing: sparseBilling,
      shipping: sparseShipping,
      fee_lines: [
        {
          name: description,
          total: totalAmount,
          tax_status: "none",
        },
      ],
      meta_data: [
        ...paymentMeta,
        { key: "_sparse_metadata_recovered", value: "yes" },
        { key: "_original_payment_intent_description", value: description },
      ],
    };

    try {
      const recoveredOrder = await createWooCommerceOrder(sparseOrderPayload);
      console.log(
        `[stripe-sync] ✓ Sparse WooCommerce order #${recoveredOrder.number ?? recoveredOrder.id} recovered and created for PaymentIntent ${paymentIntent.id}.`
      );
      try {
        await stripe.paymentIntents.update(paymentIntent.id, {
          metadata: { wc_order_id: String(recoveredOrder.id), orderId: String(recoveredOrder.id) },
        });
      } catch (stripeErr) {
        console.warn(`[stripe-sync] Could not update PaymentIntent ${paymentIntent.id} metadata:`, stripeErr);
      }
      if (customerEmail) {
        await sendConfirmationEmailForOrder(recoveredOrder, {
          fn: sparseBilling.first_name,
          ln: sparseBilling.last_name,
          em: customerEmail,
          a1: sparseBilling.address_1,
          ct: sparseBilling.city,
          pc: sparseBilling.postcode,
        });
      }
      return recoveredOrder;
    } catch (err) {
      console.error(`[stripe-sync] FATAL: Failed to create recovered order for sparse PaymentIntent ${paymentIntent.id}:`, err);
      return null;
    }
  }

  let items: { i: number; q: number }[];
  let form: { fn: string; ln: string; em: string; a1: string; ct: string; pc: string };
  let delivery: any = null;
  let billing: any = null;

  try {
    items = JSON.parse(cart_items);
    if (cart_form) {
      form = JSON.parse(cart_form);
    } else {
      form = { fn: "", ln: "", em: "", a1: "", ct: "", pc: "" };
    }

    if (delivery_address) delivery = JSON.parse(delivery_address);
    if (billing_address) billing = JSON.parse(billing_address);
  } catch (err) {
    console.error(`[stripe-sync] Failed to parse cart metadata for ${paymentIntent.id}:`, err);
    return null;
  }

  const shippingMethod = cart_shipping ?? "standard";
  const shippingCost = cart_shipping_cost ? parseFloat(cart_shipping_cost) : 0;
  const shippingTitle = cart_shipping_title || (shippingCost > 0 ? `Shipping (${shippingMethod})` : "Free Delivery");
  const isFirstClass = shippingTitle.toLowerCase().includes("first class") || shippingTitle.toLowerCase().includes("1st class");
  const discountAmount = cart_discount ? parseFloat(cart_discount) : 0;
  const line_items = items.map((item) => ({ product_id: item.i, quantity: item.q }));

  const billingPayload = billing
    ? {
        first_name: billing.firstName,
        last_name: billing.lastName,
        address_1: billing.address1,
        address_2: billing.address2 || "",
        city: billing.city,
        state: billing.county, // Aligning county to WooCommerce state field
        postcode: billing.postcode,
        country: "GB",
        email: billing.email || form.em,
        phone: billing.phone || "",
      }
    : {
        first_name: form.fn,
        last_name: form.ln,
        address_1: form.a1,
        city: form.ct,
        postcode: form.pc,
        country: "GB",
        email: form.em,
      };

  const shippingPayload = delivery
    ? {
        first_name: delivery.firstName,
        last_name: delivery.lastName,
        address_1: delivery.address1,
        address_2: delivery.address2 || "",
        city: delivery.city,
        state: delivery.county, // Aligning county to WooCommerce state field
        postcode: delivery.postcode,
        country: "GB",
        phone: delivery.phone || "",
      }
    : {
        first_name: form.fn,
        last_name: form.ln,
        address_1: form.a1,
        city: form.ct,
        postcode: form.pc,
        country: "GB",
      };

  const orderPayload: any = {
    payment_method: "stripe",
    payment_method_title: "Credit Card (Stripe)",
    set_paid: true,
    status: "processing",
    transaction_id: chargeId || paymentIntent.id,
    customer_id: wc_customer_id ? parseInt(wc_customer_id, 10) : 0,
    customer_note: `Payment captured securely via Stripe. PaymentIntent: ${paymentIntent.id}${chargeId ? ` | Charge: ${chargeId}` : ""}.${couponCode ? ` Voucher: ${couponCode.toUpperCase()} applied.` : ""}`,
    billing: billingPayload,
    shipping: shippingPayload,
    line_items,
    shipping_lines: [
      {
        method_id: isFirstClass ? "flexible_shipping_single" : "flat_rate",
        instance_id: isFirstClass ? "3" : undefined,
        method_title: shippingTitle,
        total: shippingCost.toString(),
        total_tax: isFirstClass ? "0.00" : undefined,
        taxes: isFirstClass ? [] : undefined,
      },
    ],
    meta_data: [
      ...paymentMeta,
      { key: "_confirmation_email_sent", value: "yes" },
    ],
  };

  if (couponCode) {
    orderPayload.coupon_lines = [{ code: couponCode }];
  } else if (discountAmount > 0) {
    // If discount was applied without a registered coupon code, pass as promotion fee line (ex-VAT)
    const discountExVat = (discountAmount / 1.2).toFixed(2);
    orderPayload.fee_lines = [
      {
        name: "Promotion Discount",
        total: `-${discountExVat}`,
        tax_status: "taxable",
      },
    ];
  }

  try {
    const newOrder = await createWooCommerceOrder(orderPayload);
    console.log(
      `[stripe-sync] ✓ WooCommerce order #${newOrder.number ?? newOrder.id} created (fallback) for PaymentIntent ${paymentIntent.id}.`
    );
    try {
      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: { wc_order_id: String(newOrder.id), orderId: String(newOrder.id) },
      });
    } catch (stripeErr) {
      console.warn(`[stripe-sync] Could not update PaymentIntent ${paymentIntent.id} metadata:`, stripeErr);
    }
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

/**
 * Handles failed Stripe payment intents by marking linked pending orders as failed.
 * Does not decrement inventory or send order confirmation.
 */
export async function handleFailedPaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const rawOrderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.wc_order_id;
  if (!rawOrderId) return;
  const orderId = parseInt(rawOrderId, 10);
  if (isNaN(orderId)) return;

  try {
    const existing = await fetchWooCommerceOrder(orderId);
    if (!existing || existing.status !== "pending") {
      return;
    }
    await updateWooCommerceOrder(orderId, {
      status: "failed",
      customer_note: `Stripe payment failed: ${paymentIntent.last_payment_error?.message || "Payment unconfirmed or declined."}`,
    });
    console.log(`[stripe-sync] Order #${orderId} marked as failed following payment failure.`);
  } catch (err) {
    console.warn(`[stripe-sync] Could not mark order #${orderId} as failed:`, err);
  }
}

