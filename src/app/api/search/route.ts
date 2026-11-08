import { NextRequest, NextResponse } from "next/server";
import { sanitiseSearchQuery } from "@/lib/utils";
import { extractSearchSuggestions } from "@/lib/search-phrases";
import { navigationCategories } from "@/lib/navigationConfig";
import { isGibberishQuery } from "@/lib/gibberish";
import { broadenSearchQuery } from "@/app/shop/broadenSearch";

export const runtime = "edge";

export interface InstantSearchProduct {
  id: string | number;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  category?: string | null;
}

export interface InstantSearchCategory {
  id: string | number;
  name: string;
  slug: string;
  parentName?: string | null;
  route: string;
  accentColor?: string;
}

export interface InstantSearchResponse {
  products: InstantSearchProduct[];
  categories: InstantSearchCategory[];
  suggestions: string[];
  isFallback?: boolean;
  broadenedQuery?: string;
}

function getWordPressBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
    "https://admin.discountproducts.co.uk";

  return baseUrl.replace(/\/$/, "").replace(/\/graphql$/, "");
}

/**
 * Fast synchronous match against local static navigation categories
 * for instant sub-10ms category resolution.
 */
function matchLocalCategories(query: string): InstantSearchCategory[] {
  const lower = query.toLowerCase().trim();
  const matches: InstantSearchCategory[] = [];

  for (const parent of navigationCategories) {
    if (parent.label.toLowerCase().includes(lower) || parent.slug.toLowerCase().includes(lower)) {
      matches.push({
        id: `local-${parent.id}`,
        name: parent.label,
        slug: parent.slug,
        parentName: null,
        route: `/categories/${parent.slug}`,
        accentColor: parent.accentColor,
      });
    }

    for (const sub of parent.subcategories) {
      if (sub.label.toLowerCase().includes(lower) || sub.slug.toLowerCase().includes(lower)) {
        matches.push({
          id: `local-${sub.id}`,
          name: sub.label,
          slug: sub.slug,
          parentName: parent.label,
          route: `/categories/${parent.slug}?category=${sub.slug}`,
          accentColor: parent.accentColor,
        });
      }
    }
  }

  return matches.slice(0, 4);
}

/**
 * Helper to query Snippet 004 instant search endpoint.
 */
async function queryInstantSearch(
  wpBase: string,
  term: string,
  limit: number = 8
): Promise<{ products: InstantSearchProduct[]; categories: InstantSearchCategory[] } | null> {
  try {
    const endpoint = `${wpBase}/wp-json/dqp/v1/instant-search?q=${encodeURIComponent(term)}&limit=${limit}`;
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(3000),
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    const products: InstantSearchProduct[] = [];
    if (Array.isArray(data?.products)) {
      for (const p of data.products) {
        products.push({
          id: String(p.id ?? ""),
          name: String(p.name ?? ""),
          slug: String(p.slug ?? ""),
          price: String(p.price || "£0.00"),
          imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : null,
          category: typeof p.category === "string" ? p.category : null,
        });
      }
    }

    const categories: InstantSearchCategory[] = [];
    if (Array.isArray(data?.categories)) {
      for (const c of data.categories) {
        categories.push({
          id: typeof c.id === "number" ? c.id : Number(c.id) || 0,
          name: String(c.name ?? ""),
          slug: String(c.slug ?? ""),
          parentName: typeof c.parentName === "string" ? c.parentName : null,
          route: `/categories/${c.slug}`,
        });
      }
    }

    return { products, categories };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim() ?? "";

  if (!raw || raw.length < 2) {
    return NextResponse.json(
      {
        products: [],
        categories: [],
        suggestions: [],
      },
      { status: 200 }
    );
  }

  // Sanitise search query to prevent malformed or dangerous search strings
  const q = sanitiseSearchQuery(raw);
  if (!q || q.length < 2) {
    return NextResponse.json(
      {
        products: [],
        categories: [],
        suggestions: [],
      },
      { status: 200 }
    );
  }

  // True unpronounceable keyboard mash / gibberish (e.g. "aekjsghslggjkfdg")
  // should immediately return zero results.
  if (isGibberishQuery(q)) {
    return NextResponse.json(
      {
        products: [],
        categories: [],
        suggestions: [],
        isFallback: false,
      },
      { status: 200 }
    );
  }

  const localCategories = matchLocalCategories(q);

  try {
    const wpBase = getWordPressBaseUrl();

    let remoteProducts: InstantSearchProduct[] = [];
    let remoteCategories: InstantSearchCategory[] = [];
    let isFallback = false;
    let broadenedQuery: string | undefined = undefined;

    // TIER 1: Direct match query
    const tier1 = await queryInstantSearch(wpBase, q, 8);
    if (tier1 && tier1.products.length > 0) {
      remoteProducts = tier1.products;
      remoteCategories = tier1.categories;
    }

    // TIER 2: Auto-broaden / stem if 0 products found (e.g. "lightbulbs" -> "light bulb", "hell" -> "hel")
    if (remoteProducts.length === 0) {
      const broadened = broadenSearchQuery(q);
      if (broadened && broadened !== q) {
        const tier2 = await queryInstantSearch(wpBase, broadened, 8);
        if (tier2 && tier2.products.length > 0) {
          remoteProducts = tier2.products;
          remoteCategories = tier2.categories;
          broadenedQuery = broadened;
        }
      }
    }

    // TIER 3: Popular Catalog Fallback if still 0 products (and query is NOT gibberish)
    // Ensures the user always sees relevant products instead of a dead-end blank drop-off
    if (remoteProducts.length === 0) {
      const fallback = await queryInstantSearch(wpBase, "light", 6);
      if (fallback && fallback.products.length > 0) {
        remoteProducts = fallback.products;
        isFallback = true;
      } else {
        // Fallback to standard WooCommerce REST API if snippet is unavailable
        const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
        if (consumerKey && consumerSecret) {
          const authString = btoa(`${consumerKey}:${consumerSecret}`);
          try {
            const wcRes = await fetch(
              `${wpBase}/wp-json/wc/v3/products?per_page=6&status=publish`,
              {
                signal: AbortSignal.timeout(4000),
                headers: {
                  Authorization: `Basic ${authString}`,
                  Accept: "application/json",
                },
              }
            );
            if (wcRes.ok) {
              const wcData = await wcRes.json();
              if (Array.isArray(wcData) && wcData.length > 0) {
                remoteProducts = wcData.map((p: Record<string, unknown>) => {
                  const rawPrice = p.price;
                  const formattedPrice =
                    typeof rawPrice === "string" && rawPrice.startsWith("£")
                      ? rawPrice
                      : rawPrice
                      ? `£${Number(rawPrice).toFixed(2)}`
                      : "£0.00";
                  const images = p.images as Array<{ src?: string }> | undefined;
                  const categories = p.categories as Array<{ name?: string }> | undefined;

                  return {
                    id: String(p.id ?? ""),
                    name: String(p.name ?? ""),
                    slug: String(p.slug ?? ""),
                    price: formattedPrice,
                    imageUrl: images?.[0]?.src || null,
                    category: categories?.[0]?.name || null,
                  };
                });
                isFallback = true;
              }
            }
          } catch {
            // Ignore fallback network error
          }
        }
      }
    }

    // Merge categories without duplicates (local takes precedence for instant navigation routes)
    const combinedCategories: InstantSearchCategory[] = [...localCategories];
    for (const remote of remoteCategories) {
      if (!combinedCategories.some((c) => c.slug === remote.slug)) {
        combinedCategories.push(remote);
      }
    }

    // Dynamic phrase extraction (e.g. "fluorescent light bulbs")
    const suggestions = extractSearchSuggestions(
      q,
      remoteProducts,
      combinedCategories
    );

    const payload: InstantSearchResponse = {
      products: remoteProducts,
      categories: combinedCategories.slice(0, 4),
      suggestions,
      isFallback,
      broadenedQuery,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Search API Critical Error:", error);
    return NextResponse.json(
      {
        products: [],
        categories: localCategories,
        suggestions: [],
      },
      { status: 200 }
    );
  }
}
