export interface WooCommerceAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  postcode: string;
  country: string;
  state: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  billing: WooCommerceAddress;
  shipping: WooCommerceAddress;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WooAttribute {
  id: number;
  name: string;
  options: string[];
}

export interface WooOrderLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  price: number;
  image?: {
    id: string;
    src: string;
  };
}

export interface WooCommerceOrderResponse {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: any;
  shipping: any;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string | null;
  date_paid_gmt: string | null;
  date_completed: string | null;
  date_completed_gmt: string | null;
  cart_hash: string;
  line_items: WooOrderLineItem[];
  tax_lines: any[];
  shipping_lines: any[];
  fee_lines: any[];
  coupon_lines: any[];
  refunds: any[];
  message?: string; // For error responses
}

export interface WooProductRaw {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price: string;
  sale_price: string;
  price_html: string;
  categories: WooCategory[];
  images: WooImage[];
  attributes: WooAttribute[];
  stock_status: string;
  manage_stock?: boolean;
  stock_quantity?: number;
}

export interface MappedProduct {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  permalink: string;
  image: {
    sourceUrl: string;
    altText: string;
  } | null;
  categories: WooCategory[];
  attributes: WooAttribute[];
  condition?: string;
  stockStatus: string;
  manageStock: boolean;
  stockQuantity: number | null;
}

/**
 * Format a raw numeric price string into GBP format.
 */
function formatPrice(amountStr: string): string | null {
  if (!amountStr) return null;
  const num = parseFloat(amountStr);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
}

/**
 * Data Mapper: Transforms raw WooCommerce JSON into our clean frontend interface.
 */
export function mapProduct(raw: WooProductRaw): MappedProduct {
  const conditionAttr = raw.attributes?.find(
    (attr) => attr.name.toLowerCase() === "condition"
  );

  return {
    id: `wc-${raw.id}`,
    databaseId: raw.id,
    name: raw.name,
    slug: raw.slug,
    price: formatPrice(raw.price),
    regularPrice: formatPrice(raw.regular_price),
    salePrice: formatPrice(raw.sale_price),
    permalink: raw.permalink,
    image: raw.images && raw.images.length > 0
      ? {
          sourceUrl: raw.images[0].src,
          altText: raw.images[0].alt || raw.name,
        }
      : null,
    categories: raw.categories || [],
    attributes: raw.attributes || [],
    condition: conditionAttr?.options?.[0], // Assume first option is the condition
    stockStatus: raw.stock_status || "instock",
    manageStock: raw.manage_stock ?? false,
    stockQuantity: raw.stock_quantity ?? null,
  };
}

import { unstable_cache } from "next/cache";

// ... existing code down to WooProductsResponse ...
export interface WooProductsResponse {
  products: MappedProduct[];
  total: number;
  totalPages: number;
}

/**
 * Internal API Client: Fetches products from wp-json/wc/v3/products with OAuth 1.0a
 */
async function fetchProductsInternal(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    category?: string; // category ID
    min_price?: string;
    max_price?: string;
    order?: "asc" | "desc";
    orderby?: "date" | "id" | "include" | "title" | "slug" | "price" | "popularity" | "rating";
    [key: string]: any;
  } = {}
): Promise<WooProductsResponse> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.warn("WooCommerce API keys are missing. Returning empty array.");
    return { products: [], total: 0, totalPages: 0 };
  }

  const defaultParams = {
    page: 1,
    per_page: 24,
    status: "publish",
  };

  const queryParams = new URLSearchParams();
  const mergedParams = { ...defaultParams, ...params };

  Object.entries(mergedParams).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value.toString());
    }
  });

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/products?${queryParams.toString()}`;

  const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const authHeader = { Authorization: `Basic ${authString}` };

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      // Do not use fetch cache because headers are dynamic.
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Response body:", text);
      return { products: [], total: 0, totalPages: 0 };
    }

    const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "0", 10);

    const rawProducts: WooProductRaw[] = await response.json();
    const products = rawProducts.map(mapProduct);

    return {
      products,
      total,
      totalPages,
    };
  } catch (error) {
    console.error("Failed to fetch WooCommerce products:", error);
    return { products: [], total: 0, totalPages: 0 };
  }
}

/**
 * Public exported fetch wrapper, cached for 1 hour.
 */
export const fetchWooCommerceProducts = async (params: any = {}) => {
  const categoryId = params.category  || "all";
  const page       = params.page      || 1;
  const perPage    = params.per_page  || 24;
  const searchQ    = params.search    || "none";
  const orderby    = params.orderby   || "default";
  const order      = params.order     || "default";
  const minPrice   = params.min_price || "0";
  const maxPrice   = params.max_price || "any";

  const paParamsKeys = Object.keys(params).filter(k => k.startsWith('pa_')).sort();
  const paParamsString = paParamsKeys.map(k => `${k}=${params[k]}`).join('&');

  // Use `unstable_cache` so we can cache based on params despite dynamic oauth headers.
  const cachedFn = unstable_cache(
    async (p) => fetchProductsInternal(p),
    ["wc-products", String(categoryId), String(page), String(perPage), String(searchQ), String(orderby), String(order), String(minPrice), String(maxPrice), paParamsString],
    { revalidate: 3600, tags: ["wc-products"] }
  );
  return cachedFn(params);
};

/**
 * Internal Fetch a single product by slug
 */
async function getProductBySlugInternal(slug: string): Promise<MappedProduct | null> {
  const params = { slug };
  const queryParams = new URLSearchParams(params as any);
  
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) return null;

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/products?${queryParams.toString()}`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const requestData = {
    url: apiUrl,
    method: "GET",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const rawProducts: WooProductRaw[] = await response.json();
    if (!rawProducts.length) return null;
    return mapProduct(rawProducts[0]);
  } catch (error) {
    return null;
  }
}

/**
 * Public exported getProductBySlug, cached for 1 hour.
 */
export const getProductBySlug = async (slug: string) => {
  const cachedFn = unstable_cache(
    async (s) => getProductBySlugInternal(s),
    [`wc-product-${slug}`],
    { revalidate: 3600, tags: ["wc-products", `wc-product-${slug}`] }
  );
  return cachedFn(slug);
};

export interface DynamicSubcategory {
  id: number;
  label: string;
  slug: string;
}

export interface DynamicNavCategory {
  id: number;
  label: string;
  slug: string;
  accentColor: string;
  hoverText: string;
  hoverOverlay: string;
  subcategories: DynamicSubcategory[];
}

import { navigationCategories } from "@/lib/navigationConfig";

/**
 * Transforms flat category array into nested hierarchy based on the frontend config
 */
function buildCategoryHierarchy(rawCategories: any[]): DynamicNavCategory[] {
  // Map our predefined frontend parent groupings
  return navigationCategories.map((navCat) => {
    // Map all subcategories, linking their active backend ID if it matches, otherwise keeping the frontend ID
    const children = navCat.subcategories.map((navSub) => {
      const match = rawCategories.find((c: any) => c.slug === (navSub.wcSlug || navSub.slug));
      return {
        id: match ? match.id : navSub.id + 1000000, // Fall back to high ID if missing to avoid collisions
        label: navSub.label, // Enforce the frontend specific label
        slug: navSub.slug,
      };
    });

    const parentMatch = rawCategories.find((c: any) => c.slug === navCat.slug);

    return {
      id: parentMatch ? parentMatch.id : navCat.id + 1000000, // Avoid frontend ID colliding with backend IDs
      label: navCat.label,
      slug: navCat.slug,
      accentColor: navCat.accentColor,
      hoverText: navCat.hoverText,
      hoverOverlay: navCat.hoverOverlay,
      subcategories: children,
    };
  });
}

/**
 * Internal: Fetch Categories from WooCommerce
 */
async function getCategoriesInternal(): Promise<DynamicNavCategory[]> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) return [];

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/products/categories?per_page=100`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const requestData = {
    url: apiUrl,
    method: "GET",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`WooCommerce API Error (Categories): ${response.status} ${response.statusText}`);
      return [];
    }

    const rawCategories = await response.json();
    return buildCategoryHierarchy(rawCategories);
  } catch (error) {
    console.error("Failed to fetch WooCommerce categories:", error);
    return [];
  }
}

/**
 * Public Exported Categories Fetch wrapper, cached for 1 hour.
 */
export const getCategories = async () => {
  const cachedFn = unstable_cache(
    async () => getCategoriesInternal(),
    ["wc-categories"],
    { revalidate: 3600, tags: ["wc-categories"] }
  );
  return cachedFn();
};

/**
 * Internal API Client: Creates a new order via POST /wp-json/wc/v3/orders with OAuth 1.0a
 */
export async function createWooCommerceOrder(orderData: Record<string, unknown>): Promise<WooCommerceOrderResponse> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce API keys are missing.");
  }

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/orders`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const requestData = {
    url: apiUrl,
    method: "POST",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
    cache: "no-store",
  });

  const text = await response.text();
  let json: WooCommerceOrderResponse;
  try {
    json = JSON.parse(text) as WooCommerceOrderResponse;
  } catch (err) {
    console.error("Non-JSON response from WooCommerce:", text);
    throw new Error("Failed to parse WooCommerce response");
  }

  if (!response.ok) {
    console.error(`WooCommerce Create Order Error: ${response.status}`, json);
    throw new Error(json.message || "WooCommerce Order Creation Failed");
  }

  return json;
}

/**
 * Updates an existing WooCommerce order via PUT /wp-json/wc/v3/orders/{id} with OAuth 1.0a.
 * Used by the Stripe webhook to promote a "pending" order to "processing" after payment.
 */
export async function updateWooCommerceOrder(orderId: number, orderData: any): Promise<any> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce API keys are missing.");
  }

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/orders/${orderId}`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "PUT" }));

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
    cache: "no-store",
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Non-JSON response from WooCommerce (update):", text);
    throw new Error("Failed to parse WooCommerce update response");
  }

  if (!response.ok) {
    console.error(`WooCommerce Update Order Error: ${response.status}`, json);
    throw new Error(json.message || "WooCommerce Order Update Failed");
  }

  return json;
}

/**
 * Fetches orders for a specific customer from WooCommerce.
 */
export async function fetchWooCommerceOrders(params: {
  customer?: number;
  email?: string;
  status?: string;
  per_page?: number;
  page?: number;
} = {}): Promise<WooCommerceOrderResponse[]> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.warn("WooCommerce API keys are missing.");
    return [];
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, value.toString());
  });

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/orders?${queryParams.toString()}`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "GET" }));

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`WooCommerce Orders Fetch Error: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch WooCommerce orders:", error);
    return [];
  }
}

/**
 * Fetches a specific customer from WooCommerce.
 */
export async function getWooCommerceCustomer(customerId: number): Promise<WooCommerceCustomer | null> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.warn("WooCommerce API keys are missing.");
    return null;
  }

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/customers/${customerId}`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "GET" }));

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { ...authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`WooCommerce Customer Fetch Error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch WooCommerce customer:", error);
    return null;
  }
}

/**
 * Updates a specific customer in WooCommerce.
 */
export async function updateWooCommerceCustomer(customerId: number, data: Partial<WooCommerceCustomer>): Promise<WooCommerceCustomer | null> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce API keys are missing.");
  }

  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/customers/${customerId}`;

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "PUT" }));

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse WooCommerce customer update response");
  }

  if (!response.ok) {
    throw new Error(json.message || "WooCommerce Customer Update Failed");
  }

  return json;
}

/**
 * Deletes a payment token from WooCommerce using Admin keys.
 * Includes force=true to bypass gateway errors that often cause 500s.
 */
export async function deleteWooCommercePaymentToken(tokenId: number): Promise<void> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce API keys are missing.");
  }

  // Use force=true to ensure the token is removed from the DB even if the gateway (Stripe) call fails.
  const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/payment_tokens/${tokenId}?force=true`;
  console.log(`[lib/woocommerce] Attempting Admin DELETE: ${apiUrl}`);

  const CryptoJS = require("crypto-js");
  const OAuth = require("oauth-1.0a");

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });

  const authHeader = oauth.toHeader(oauth.authorize({ url: apiUrl, method: "DELETE" }));

  const response = await fetch(apiUrl, {
    method: "DELETE",
    headers: { ...authHeader, "Accept": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`WooCommerce Token Delete Error: ${response.status}`, text);
    try {
      const json = JSON.parse(text);
      throw new Error(`WooCommerce Error: ${json.message || text}`);
    } catch {
      throw new Error(`WooCommerce Error (${response.status}): ${text.substring(0, 100)}`);
    }
  }
}
