import { NextRequest, NextResponse } from "next/server";
import { sanitiseSearchQuery } from "@/lib/utils";
import { extractSearchSuggestions } from "@/lib/search-phrases";
import { navigationCategories } from "@/lib/navigationConfig";

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

  const localCategories = matchLocalCategories(q);

  try {
    const wpBase = getWordPressBaseUrl();
    const endpoint = `${wpBase}/wp-json/dqp/v1/instant-search?q=${encodeURIComponent(q)}&limit=8`;

    let remoteProducts: InstantSearchProduct[] = [];
    let remoteCategories: InstantSearchCategory[] = [];

    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(3000),
        headers: {
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products)) {
          remoteProducts = data.products.map((p: Record<string, unknown>) => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            slug: String(p.slug ?? ""),
            price: String(p.price || "£0.00"),
            imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : null,
            category: typeof p.category === "string" ? p.category : null,
          }));
        }

        if (Array.isArray(data?.categories)) {
          remoteCategories = data.categories.map((c: Record<string, unknown>) => ({
            id: typeof c.id === "number" ? c.id : Number(c.id) || 0,
            name: String(c.name ?? ""),
            slug: String(c.slug ?? ""),
            parentName: typeof c.parentName === "string" ? c.parentName : null,
            route: `/categories/${c.slug}`,
          }));
        }
      } else {
        // Fallback to standard WooCommerce REST API if snippet not yet uploaded to WP
        const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
        if (consumerKey && consumerSecret) {
          const authString = btoa(`${consumerKey}:${consumerSecret}`);
          const wcRes = await fetch(
            `${wpBase}/wp-json/wc/v3/products?search=${encodeURIComponent(q)}&per_page=6&status=publish`,
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
            if (Array.isArray(wcData)) {
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
            }
          }
        }
      }
    } catch (fetchError) {
      // Endpoint might be unavailable in local dev / tests without live WP; fail gracefully
      console.warn("Instant search fetch failed, continuing with local resolution:", fetchError);
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
