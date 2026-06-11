import { notFound } from "next/navigation";
import CategoryHub, { CategoryHubSkeleton } from "./CategoryHub";
import type { Metadata } from "next";
import { fetchWooCommerceProducts, getCategories, type DynamicNavCategory } from "@/lib/woocommerce";
import { productMatchesAttributeFilters } from "../../shop/filterAttributes";
import { Suspense } from "react";
import { navigationCategories } from "@/lib/navigationConfig";

export const revalidate = 2592000;
export const dynamicParams = true;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Use the hardcoded navigationCategories config — no WooCommerce API call needed.
 * The previous approach called getCategories() (WooCommerce REST API) which timed out
 * during builds on the slow Bluehost server, leaving all category pages as ƒ Dynamic.
 * Now every category + subcategory slug is pre-rendered as ● SSG at build time.
 */
export function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  navigationCategories.forEach((cat) => {
    if (cat.slug) slugs.push({ slug: cat.slug });
    cat.subcategories?.forEach((sub) => {
      if (sub.slug) slugs.push({ slug: sub.slug });
    });
  });
  return slugs;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // Resolve name from static config first (instant) — no API call needed for known categories
  let name = slug.replace(/-/g, " ");
  for (const cat of navigationCategories) {
    if (cat.slug === slug) { name = cat.label; break; }
    const sub = cat.subcategories?.find(s => s.slug === slug);
    if (sub) { name = sub.label; break; }
  }

  return {
    title: `${name} | Discount Quality Products`,
    description: `Browse ${name} — professional grade hardware, collectibles, and more at Discount Quality Products.`,
    alternates: {
      canonical: `https://www.discountproducts.co.uk/categories/${slug}`,
    },
  };
}

type WooOrder = "asc" | "desc";
type WooOrderBy = "date" | "id" | "include" | "title" | "slug" | "price" | "popularity" | "rating";

function parseWooOrder(value: string | string[] | undefined): WooOrder | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function parseWooOrderBy(value: string | string[] | undefined): WooOrderBy | undefined {
  const allowed: WooOrderBy[] = ["date", "id", "include", "title", "slug", "price", "popularity", "rating"];
  return typeof value === "string" && allowed.includes(value as WooOrderBy) ? value as WooOrderBy : undefined;
}

type ProductQueryParams = {
  search?: string;
  page?: number;
  per_page?: number;
  category?: string;
  orderby?: WooOrderBy;
  order?: WooOrder;
  min_price?: string;
  max_price?: string;
};

async function fetchAllCandidateProducts(params: ProductQueryParams) {
  // Ensure strict query pagination ceiling parameter of exactly 24 items
  const firstPage = await fetchWooCommerceProducts({ ...params, page: 1, per_page: 24 });
  if (firstPage.totalPages <= 1) return firstPage;

  // HARD CAP: Limit parallel fetching to a maximum of 3 pages (72 products).
  const maxPages = Math.min(firstPage.totalPages, 3);

  if (maxPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: maxPages - 1 }, (_, index) =>
      fetchWooCommerceProducts({ ...params, page: index + 2, per_page: 24 })
    )
  );

  return {
    products: [
      ...firstPage.products,
      ...remainingPages.flatMap((response) => response.products),
    ],
    total: firstPage.total,
    totalPages: firstPage.totalPages,
  };
}

async function getProductsData(
  slug: string,
  sParams: any,
  paParams: Record<string, string>,
  page: number,
  categoriesPromise: Promise<DynamicNavCategory[]>
) {
  const initialCategories = await categoriesPromise;
  
  let matchedParent: any = null;
  let matchedSub: any = null;

  for (const cat of initialCategories) {
    if (cat.slug === slug) {
      matchedParent = cat;
      break;
    }
    const sub = cat.subcategories?.find((s: any) => s.slug === slug);
    if (sub) {
      matchedParent = cat;
      matchedSub = sub;
      break;
    }
  }

  if (!matchedParent) {
    if (initialCategories.length === 0) {
      return {
        products: [],
        filterProducts: [],
        total: 0,
        totalPages: 0,
      };
    }
    notFound();
  }

  let activeCategoryId: string | undefined = undefined;

  if (matchedSub) {
    activeCategoryId = matchedSub.id.toString();
  } else if (matchedParent) {
    const ids = [matchedParent.id];
    if (matchedParent.subcategories) {
      matchedParent.subcategories.forEach((s: any) => ids.push(s.id));
    }
    activeCategoryId = ids.join(",");
  }

  const selectedSubcategories = typeof sParams.category === "string" ? sParams.category : undefined;
  let effectiveCategoryIds = activeCategoryId;
  
  if (selectedSubcategories) {
    const slugParts = selectedSubcategories.split(",");
    const resolvedIds: number[] = [];
    
    for (const part of slugParts) {
      if (/^\d+$/.test(part)) {
        resolvedIds.push(parseInt(part, 10));
      } else {
        for (const cat of initialCategories) {
          if (cat.slug === part) {
            resolvedIds.push(cat.id);
            if (cat.subcategories) {
              cat.subcategories.forEach((sub: any) => resolvedIds.push(sub.id));
            }
            break;
          }
          const sub = cat.subcategories?.find((s: any) => s.slug === part);
          if (sub) {
            resolvedIds.push(sub.id);
            break;
          }
        }
      }
    }
    
    if (resolvedIds.length > 0) {
      effectiveCategoryIds = resolvedIds.join(",");
    }
  }

  const orderby = parseWooOrderBy(sParams.orderby);
  const order = parseWooOrder(sParams.order);
  const minPrice = typeof sParams.min_price === "string" ? sParams.min_price : undefined;
  const maxPrice = typeof sParams.max_price === "string" ? sParams.max_price : undefined;

  const hasAttributeFilters = Object.keys(paParams).length > 0;

  const productParams: ProductQueryParams = {
    page: hasAttributeFilters ? 1 : page,
    per_page: 24, // Strict pagination parameter ceiling
    category: effectiveCategoryIds,
    orderby,
    order,
    min_price: minPrice,
    max_price: maxPrice,
  };

  const filterProductParams: ProductQueryParams = {
    page: 1,
    per_page: 24, // Strict pagination parameter ceiling
    category: activeCategoryId,
    min_price: minPrice,
    max_price: maxPrice,
  };

  // Only do the second (filter) fetch when attribute filters are active.
  // Without attribute filters the main response already has everything the
  // filter modal needs, so we reuse the same promise — no extra API calls.
  const mainResponse = hasAttributeFilters
    ? fetchAllCandidateProducts(productParams)
    : fetchWooCommerceProducts(productParams);

  const filterFetchResponse = hasAttributeFilters
    ? fetchAllCandidateProducts(filterProductParams)
    : mainResponse;

  const [response, filterResponse] = await Promise.all([mainResponse, filterFetchResponse]);

  const strictProducts = hasAttributeFilters
    ? response.products.filter((product) => productMatchesAttributeFilters(product, paParams))
    : response.products;
  const visibleProducts = hasAttributeFilters
    ? strictProducts.slice((page - 1) * 24, page * 24)
    : strictProducts;
  const visibleTotal = hasAttributeFilters ? strictProducts.length : response.total;
  const visibleTotalPages = hasAttributeFilters ? Math.ceil(strictProducts.length / 24) : response.totalPages;

  return {
    products: visibleProducts,
    filterProducts: filterResponse.products,
    total: visibleTotal,
    totalPages: visibleTotalPages,
  };
}

/**
 * Sync page shell — not async, reads no dynamic APIs directly.
 * This allows Next.js to serve pre-rendered static HTML (from generateStaticParams)
 * for /categories/[slug] with no query params. Requests with filters/pagination
 * still stream dynamically via the CategoryPageContent server component below.
 */
export default function CategoryPage({ params, searchParams }: CategoryPageProps) {
  return (
    <Suspense fallback={<CategoryHubSkeleton />}>
      <CategoryPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Async server component — runs inside the Suspense boundary.
 * Awaits searchParams and fetches data. Streams in after the static shell.
 */
async function CategoryPageContent({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const pageStr = typeof sParams.page === "string" ? sParams.page : "1";
  const page = parseInt(pageStr, 10) || 1;

  const paParams: Record<string, string> = {};
  for (const key of Object.keys(sParams)) {
    if (key.startsWith("pa_")) {
      const val = sParams[key];
      if (typeof val === "string") paParams[key] = val;
      if (Array.isArray(val)) paParams[key] = val.flatMap((item) => item.split(",")).filter(Boolean).join(",");
    }
  }

  const categoriesPromise = getCategories();
  const productsPromise = getProductsData(slug, sParams, paParams, page, categoriesPromise);

  return (
    <CategoryHub
      baseSlug={slug}
      categoriesPromise={categoriesPromise}
      categorySlug={typeof sParams.category === "string" ? sParams.category : undefined}
      productsPromise={productsPromise}
      currentPage={page}
    />
  );
}
