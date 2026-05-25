"use server";

import CryptoJS from "crypto-js";
import OAuth from "oauth-1.0a";

interface TrackingLookupResult {
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

export async function trackOrder(orderId: string, email: string): Promise<TrackingLookupResult> {
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

    // Extract tracking info if it exists (e.g. from common plugins like WooCommerce Shipment Tracking)
    // Often it resides in metadata under _wc_shipment_tracking_items or similar
    const trackingItems = order.meta_data?.find((meta: any) => meta.key === "_wc_shipment_tracking_items")?.value || [];
    
    // Also look for simple tracking keys
    const trackingProvider = order.meta_data?.find((meta: any) => meta.key === "tracking_provider")?.value || null;
    const trackingNumber = order.meta_data?.find((meta: any) => meta.key === "tracking_number")?.value || null;

    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      date_created: order.date_created,
      currency: order.currency,
      total: order.total,
      shipping: order.shipping,
      line_items: order.line_items.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        product_id: item.product_id,
        image: item.image?.src || null,
      })),
      tracking: trackingItems.length > 0 ? trackingItems : (trackingNumber ? [{ tracking_provider: trackingProvider, tracking_number: trackingNumber }] : []),
    };

    return { success: true, order: sanitizedOrder };
  } catch (error) {
    console.error("Failed to track order:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
