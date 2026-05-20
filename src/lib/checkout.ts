import { fetchWooCommerceProducts } from "./woocommerce";

export interface CartItem {
  /** String form of the WooCommerce integer databaseId, e.g. "14" */
  id: string;
  quantity: number;
}

export interface ValidationResult {
  isValid: boolean;
  subtotal: number;
  vat: number;
  shippingCost: number;
  finalTotal: number;
  error?: string;
}

export async function validateCartTotals(items: CartItem[], shippingMethod: string): Promise<ValidationResult> {
  if (!items || items.length === 0) {
    return { isValid: false, subtotal: 0, vat: 0, shippingCost: 0, finalTotal: 0, error: "No items in basket." };
  }

  // Determine shipping cost (free)
  const shippingCost = 0;

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
          subtotal: 0, vat: 0, shippingCost: 0, finalTotal: 0, 
          error: `Product not found: ${item.id}` 
        };
      }

      // Format raw strings from MappedProduct (e.g. £199.99 back to float)
      const priceStr = wooProduct.price || "£0";
      const actualPrice = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));

      subtotal += actualPrice * item.quantity;
    }

    // Prices from WooCommerce are VAT-inclusive.
    // Extract the VAT portion: subtotal / 6 (equivalent to 20/120).
    const vat = subtotal / 6;
    // The total charged to the customer is subtotal + shipping (VAT is already inside the price).
    const finalTotal = subtotal + shippingCost;

    return {
      isValid: true,
      subtotal,
      vat,
      shippingCost,
      finalTotal,
    };
  } catch (error: any) {
    console.error("Cart Validation Error:", error);
    return { 
      isValid: false, 
      subtotal: 0, vat: 0, shippingCost: 0, finalTotal: 0, 
      error: "Failed to validate cart with backend." 
    };
  }
}
