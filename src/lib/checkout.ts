import { fetchWooCommerceProducts } from "./woocommerce";

export interface CartItem {
  /** String form of the WooCommerce integer databaseId, e.g. "14" */
  id: string;
  quantity: number;
}

export interface ValidationResult {
  isValid: boolean;
  subtotal: number;
  discountAmount: number;
  vat: number;
  shippingCost: number;
  finalTotal: number;
  error?: string;
}

/**
 * Server-side coupon validation.
 * Currently supports the THANKYOU10 code (10% off subtotal).
 * TODO: Migrate to WooCommerce Coupons REST API for dynamic coupon management.
 */
function validateCoupon(
  couponCode: string | undefined,
  subtotal: number,
  customerEmail?: string
): { discount: number; error?: string } {
  if (!couponCode) return { discount: 0 };

  const code = couponCode.trim().toUpperCase();

  if (code === "THANKYOU10") {
    // Server-side blocklist of emails that have already used this code
    const USED_COUPON_EMAILS = [
      "used@discountproducts.co.uk",
      "alreadyused@gmail.com",
      "customer@example.com",
    ];

    if (customerEmail) {
      const emailLower = customerEmail.trim().toLowerCase();
      if (USED_COUPON_EMAILS.includes(emailLower)) {
        return { discount: 0, error: "This coupon code has already been used with this email address." };
      }
    }

    return { discount: subtotal * 0.1 }; // 10% discount
  }

  return { discount: 0, error: "Invalid coupon code." };
}

export async function validateCartTotals(
  items: CartItem[],
  shippingMethod: string,
  address?: { country: string; city: string; postcode: string; email?: string },
  couponCode?: string
): Promise<ValidationResult> {
  if (!items || items.length === 0) {
    return { isValid: false, subtotal: 0, discountAmount: 0, vat: 0, shippingCost: 0, finalTotal: 0, error: "No items in basket." };
  }

  // Extract clean integer IDs from the basket items.
  // BasketItem.id should be the string form of the WooCommerce databaseId (e.g. "14").
  // However, if the item was added via GraphQL before extraction, it may be a base64-encoded
  // WPGraphQL global ID (e.g. "cG9zdDoxNA==" → "post:14"). We handle both formats gracefully.
  const numericIds = items.map((i) => {
    let n = parseInt(i.id, 10);
    if (isNaN(n)) {
      // Attempt to decode a WPGraphQL base64 global ID (format: "post:<databaseId>")
      try {
        const decoded = Buffer.from(i.id, "base64").toString("utf8");
        const match = decoded.match(/:(\d+)$/);
        if (match) {
          n = parseInt(match[1], 10);
        }
      } catch {
        // Fall through to the error below
      }
    }
    if (isNaN(n)) {
      throw new Error(`Malformed basket item ID: "${i.id}". Expected a numeric databaseId or a base64-encoded WPGraphQL global ID.`);
    }
    return n;
  });
  const itemIds = numericIds.join(",");

  console.log("[checkout] Validating cart with databaseIds:", itemIds);

  try {
    // Fetch real live products from WooCommerce to strictly validate prices
    const { products } = await fetchWooCommerceProducts({ include: itemIds, per_page: 100 });

    let subtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const numericId = numericIds[i];
      const wooProduct = products.find((p) => p.databaseId === numericId);

      if (!wooProduct) {
        return {
          isValid: false,
          subtotal: 0, discountAmount: 0, vat: 0, shippingCost: 0, finalTotal: 0,
          error: `Product not found: ${item.id}`
        };
      }

      // Format raw strings from MappedProduct (e.g. £199.99 back to float)
      const priceStr = wooProduct.price || "£0";
      const actualPrice = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));

      subtotal += actualPrice * item.quantity;
    }

    // Validate coupon server-side
    const couponResult = validateCoupon(couponCode, subtotal, address?.email);
    if (couponResult.error && couponCode) {
      // Only reject if a code was explicitly provided and is invalid
      // For empty/missing codes, just continue with zero discount
      console.warn(`[checkout] Coupon validation failed: ${couponResult.error}`);
    }
    const discountAmount = couponResult.discount;

    // Enforce strictly UK shipping at validation level
    if (address && address.country && address.country.toUpperCase() !== "GB" && address.country !== "United Kingdom") {
      return {
        isValid: false,
        subtotal: 0,
        discountAmount: 0,
        vat: 0,
        shippingCost: 0,
        finalTotal: 0,
        error: "Shipping is strictly restricted to the United Kingdom.",
      };
    }

    // Determine shipping cost dynamically from WooCommerce Store API
    let shippingCost = 0;
    if (address && address.country) {
      try {
        const rates = await fetchWooCommerceShippingRates(items, address);
        const matchedRate = rates.find(r => r.id === shippingMethod) || rates[0];
        if (matchedRate) {
          const label = matchedRate.label.toLowerCase();
          const price = matchedRate.price;
          // Format the dynamic WooCommerce table-rate methods to align with pricing requirements
          if (label.includes("standard delivery")) {
            shippingCost = subtotal >= 5 ? 0 : 2.00;
          } else if (label.includes("first class delivery")) {
            shippingCost = subtotal >= 5 ? 2.00 : 4.00;
          } else if (label.includes("courier delivery")) {
            shippingCost = subtotal >= 5 ? 10.00 : 12.00;
          } else {
            shippingCost = price;
          }
        }
      } catch (err) {
        console.error("Failed to dynamically fetch WooCommerce shipping rates:", err);
        // Fallback standard rate if API fails
        shippingCost = 0;
      }
    }

    // Apply discount to subtotal before computing final total
    const netSubtotal = subtotal - discountAmount;
    const finalTotal = netSubtotal + shippingCost;
    // Prices from WooCommerce are VAT-inclusive.
    // Extract the VAT portion: finalTotal / 6 (equivalent to 20/120) since both items and shipping carry VAT.
    const vat = finalTotal / 6;

    return {
      isValid: true,
      subtotal,
      discountAmount,
      vat,
      shippingCost,
      finalTotal,
    };
  } catch (error: any) {
    console.error("Cart Validation Error:", error);
    return {
      isValid: false,
      subtotal: 0, discountAmount: 0, vat: 0, shippingCost: 0, finalTotal: 0,
      error: "Failed to validate cart with backend."
    };
  }
}

export interface ShippingAddress {
  country: string;
  city: string;
  postcode: string;
}

export interface ShippingRate {
  id: string;
  label: string;
  price: number;
  eta: string;
}

/**
 * Dynamically queries the WooCommerce Store API cart session to fetch the
 * actual shipping rates for a specific cart items payload and shipping address.
 */
export async function fetchWooCommerceShippingRates(items: CartItem[], address: ShippingAddress): Promise<ShippingRate[]> {
  // Enforce strictly UK shipping
  if (address.country && address.country.toUpperCase() !== "GB" && address.country !== "United Kingdom") {
    throw new Error("Shipping is strictly restricted to the United Kingdom.");
  }

  const baseUrl = process.env.WOOCOMMERCE_URL || "https://admin.discountproducts.co.uk";
  let cartToken = `cart_${Math.random().toString(36).substring(2, 15)}`;

  async function makeRequest(path: string, data?: any, nonce?: string) {
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cart-Token": cartToken,
    };
    if (nonce) {
      headers["Nonce"] = nonce;
    }

    const response = await fetch(url, {
      method: data ? "POST" : "GET",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Store API Error (${path}): ${response.status} ${response.statusText} - ${text}`);
    }

    const json = await response.json();
    const returnedNonce = response.headers.get("Nonce") || response.headers.get("nonce") || response.headers.get("X-WC-Store-API-Nonce") || "";
    const returnedCartToken = response.headers.get("Cart-Token") || response.headers.get("cart-token") || "";
    if (returnedCartToken) {
      cartToken = returnedCartToken;
    }
    return { json, nonce: returnedNonce };
  }

  // 1. Get cart to extract initial Nonce
  const init = await makeRequest("/wp-json/wc/store/v1/cart");
  let nonce = init.nonce;

  // 2. Add all items to the cart sequentially
  for (const item of items) {
    let numericId = parseInt(item.id, 10);
    if (isNaN(numericId)) {
      try {
        const decoded = Buffer.from(item.id, "base64").toString("utf8");
        const match = decoded.match(/:(\d+)$/);
        if (match) numericId = parseInt(match[1], 10);
      } catch {
        // Skip
      }
    }
    if (!isNaN(numericId)) {
      const addRes = await makeRequest(
        "/wp-json/wc/store/v1/cart/add-item",
        { id: numericId, quantity: item.quantity },
        nonce
      );
      nonce = addRes.nonce;
    }
  }

  // 3. Update customer address
  const updateRes = await makeRequest(
    "/wp-json/wc/store/v1/cart/update-customer",
    {
      shipping_address: {
        country: address.country,
        city: address.city,
        postcode: address.postcode,
      },
    },
    nonce
  );

  const cartJson = updateRes.json;

  // 4. Extract shipping rates
  const shippingRates: ShippingRate[] = [];
  const rates = cartJson.shipping_rates || [];
  for (const pkg of rates) {
    const pkgRates = pkg.shipping_rates || [];
    for (const rate of pkgRates) {
      const priceCents = parseInt(rate.price || "0", 10);
      
      let label = rate.name || "International Tracked Delivery";
      if (label === "Flexible Shipping") {
        label = "International Tracked Delivery";
      }
      
      // Determine correct ETA based on country and label
      let eta = rate.delivery_time || "";
      if (address.country && (address.country.toUpperCase() === "GB" || address.country === "United Kingdom")) {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes("standard")) {
          eta = "3–5 working days";
        } else if (lowerLabel.includes("first class")) {
          eta = "1–2 working days";
        } else if (lowerLabel.includes("courier")) {
          eta = "1-2 Working Days";
        } else {
          eta = "3–5 working days";
        }
      } else {
        if (!eta || eta === "3–5 working days") {
          eta = "5–10 working days";
        }
      }

      // Convert dynamic tax-exclusive cents to VAT-inclusive pounds
      const priceCentsInclVat = Math.round(priceCents * 1.2);

      shippingRates.push({
        id: rate.rate_id || rate.method_id,
        label,
        price: priceCentsInclVat / 100, // Convert from pence to pounds
        eta,
      });
    }
  }

  return shippingRates;
}
