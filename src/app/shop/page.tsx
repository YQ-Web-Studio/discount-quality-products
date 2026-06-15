import SearchHub, { SearchHubSkeleton } from "./SearchHub";
import type { Metadata } from "next";
import { fetchWooCommerceProducts, getCategories, type DynamicNavCategory } from "@/lib/woocommerce";
import { productMatchesAttributeFilters } from "./filterAttributes";
import { Suspense } from "react";

type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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
  categorySlug: string | undefined,
  subcategorySlug: string | undefined,
  searchQ: string | undefined,
  orderby: WooOrderBy | undefined,
  order: WooOrder | undefined,
  minPrice: string | undefined,
  maxPrice: string | undefined,
  paParams: Record<string, string>,
  page: number,
  categoriesPromise: Promise<DynamicNavCategory[]>
) {
  const activeSlug = subcategorySlug || categorySlug;
  let activeCategoryId: string | undefined = undefined;

  // Only await categories when we actually need to resolve a category slug → ID.
  // For /shop with no category filter (the most common case), we skip this wait entirely
  // so the products fetch starts immediately rather than sequentially after categories.
  if (activeSlug) {
    const initialCategories = await categoriesPromise;
    const slugParts = activeSlug.split(",");
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
      activeCategoryId = resolvedIds.join(",");
    }
  }

  const hasAttributeFilters = Object.keys(paParams).length > 0;

  const productParams: ProductQueryParams = {
    search: searchQ,
    page: hasAttributeFilters ? 1 : page,
    per_page: 24, // Strict pagination parameter ceiling
    category: activeCategoryId,
    orderby,
    order,
    min_price: minPrice,
    max_price: maxPrice,
  };

  const filterProductParams: ProductQueryParams = {
    search: searchQ,
    page: 1,
    per_page: 24, // Strict pagination parameter ceiling
    category: activeCategoryId,
    min_price: minPrice,
    max_price: maxPrice,
  };

  // Only do the second (filter) fetch when attribute filters are active.
  // Without attribute filters the main response already has everything the
  // filter modal needs, so we skip the extra 1–3 API calls entirely.
  const mainResponse = hasAttributeFilters
    ? fetchAllCandidateProducts(productParams)
    : fetchWooCommerceProducts(productParams);

  const filterFetchResponse = hasAttributeFilters
    ? fetchAllCandidateProducts(filterProductParams)
    : mainResponse; // reuse same promise — no extra network call

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

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;

  const pageStr = typeof params.page === "string" ? params.page : "1";
  const page = parseInt(pageStr, 10) || 1;

  let title = "Shop All Products";
  if (category) {
    title = `Shop by Category`;
  } else if (q) {
    title = `Search: ${q}`;
  }

  const baseUrl = "https://www.discountproducts.co.uk/shop";
  
  const getCleanCanonicalUrl = (pageNum: number) => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (typeof params.subcategory === "string") p.set("subcategory", params.subcategory);
    if (pageNum > 1) p.set("page", pageNum.toString());
    const qs = p.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  return {
    title: `${title} | Discount Quality Products`,
    description: `Browse ${title.toLowerCase()} — professional grade hardware, collectibles, and more.`,
    alternates: {
      canonical: getCleanCanonicalUrl(page),
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const { category, subcategory, q } = params;
  
  const categorySlug = typeof category === "string" ? category : undefined;
  const subcategorySlug = typeof subcategory === "string" ? subcategory : undefined;
  const searchQ = typeof q === "string" ? q : undefined;
  const pageStr = typeof params.page === "string" ? params.page : "1";
  const page = parseInt(pageStr, 10) || 1;

  const orderby = parseWooOrderBy(params.orderby);
  const order = parseWooOrder(params.order);
  const minPrice = typeof params.min_price === "string" ? params.min_price : undefined;
  const maxPrice = typeof params.max_price === "string" ? params.max_price : undefined;

  const paParams: Record<string, string> = {};
  for (const key of Object.keys(params)) {
    if (key.startsWith("pa_")) {
      const val = params[key];
      if (typeof val === "string") paParams[key] = val;
      if (Array.isArray(val)) paParams[key] = val.flatMap((item) => item.split(",")).filter(Boolean).join(",");
    }
  }

  const categoriesPromise = getCategories();

  const productsPromise = getProductsData(
    categorySlug,
    subcategorySlug,
    searchQ,
    orderby,
    order,
    minPrice,
    maxPrice,
    paParams,
    page,
    categoriesPromise
  );

  return (
    <Suspense fallback={<SearchHubSkeleton />}>
      <SearchHub
        categoriesPromise={categoriesPromise}
        categorySlug={categorySlug}
        subcategorySlug={subcategorySlug}
        initialQuery={searchQ}
        productsPromise={productsPromise}
        currentPage={page}
      />
    </Suspense>
  );
}
