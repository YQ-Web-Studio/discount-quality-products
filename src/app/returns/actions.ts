"use server";

import CryptoJS from "crypto-js";
import OAuth from "oauth-1.0a";
import { sendEmail } from "@/lib/email";
import ReturnConfirmationEmail from "@/emails/ReturnConfirmationEmail";
import React from "react";

interface OrderLookupResult {
  success: boolean;
  order?: any;
  error?: string;
}

function getWooCommerceApiUrl(endpoint: string) {
  const url = process.env.WOOCOMMERCE_URL;
  if (!url) throw new Error("WOOCOMMERCE_URL is missing");
  return `${url.replace(/\/$/, "")}/wp-json/wc/v3/${endpoint}`;
}

function getAuthHeader(url: string, method: string) {
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("WooCommerce API keys are missing");
  }

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const requestData = { url, method };
  return oauth.toHeader(oauth.authorize(requestData));
}

export async function getOrderByLookup(orderId: string, email: string): Promise<OrderLookupResult> {
  try {
    const apiUrl = getWooCommerceApiUrl(`orders/${orderId}`);
    const authHeader = getAuthHeader(apiUrl, "GET");

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Order not found. Please check your Order ID." };
      }
      return { success: false, error: "Unable to retrieve order details at this time." };
    }

    const order = await response.json();

    // Verify email (case-insensitive)
    if (order.billing?.email?.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: "Order ID and Email combination does not match." };
    }

    // Check 30-day window
    const orderDate = new Date(order.date_created);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (orderDate < thirtyDaysAgo) {
      return { success: false, error: "This order is past the 30-day return window." };
    }

    // Sanitize order data to only return necessary info
    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      date_created: order.date_created,
      currency: order.currency,
      total: order.total,
      line_items: order.line_items.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        product_id: item.product_id,
        image: item.image?.src || null,
      })),
    };

    return { success: true, order: sanitizedOrder };
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function submitReturnRequest(orderId: string, returnData: any, customerEmail?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { items, reason, comments } = returnData;
    
    // Construct the note content
    const itemsList = items.map((i: any) => `- ${i.quantity}x ${i.name}`).join("\n");
    const noteContent = `Return Requested via Guest Portal:\nReason: ${reason}\n\nItems:\n${itemsList}\n\nComments: ${comments || "None"}`;

    // 1. Update Order Status
    const statusApiUrl = getWooCommerceApiUrl(`orders/${orderId}`);
    const statusAuthHeader = getAuthHeader(statusApiUrl, "PUT");

    const statusResponse = await fetch(statusApiUrl, {
      method: "PUT",
      headers: {
        ...statusAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "return-req",
      }),
      cache: "no-store",
    });

    if (!statusResponse.ok) {
      console.error(`WooCommerce Status API Error: ${statusResponse.status} ${statusResponse.statusText}`);
      return { success: false, error: "Failed to update order status." };
    }

    // 2. Add Order Note
    const noteApiUrl = getWooCommerceApiUrl(`orders/${orderId}/notes`);
    const noteAuthHeader = getAuthHeader(noteApiUrl, "POST");

    const noteResponse = await fetch(noteApiUrl, {
      method: "POST",
      headers: {
        ...noteAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note: noteContent,
        customer_note: true, // Make it visible to customer as well
      }),
      cache: "no-store",
    });

    if (!noteResponse.ok) {
      console.error(`WooCommerce Note API Error: ${noteResponse.status} ${noteResponse.statusText}`);
      // Note failure shouldn't fail the entire return request since status was updated
    }

    // 3. Send Email Notification
    if (customerEmail) {
      try {
        const emailItems = items.map((i: any) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          thumbnail: i.image || null,
        }));

        await sendEmail({
          to: customerEmail,
          subject: `Return Request Received (Order #${orderId})`,
          react: React.createElement(ReturnConfirmationEmail, {
            orderNumber: orderId.toString(),
            returnReason: reason,
            comments: comments,
            items: emailItems,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send return confirmation email:", emailErr);
        // Do not fail the whole request if email fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to submit return:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
