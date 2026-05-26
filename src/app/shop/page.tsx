import { Suspense } from "react";
import SearchHub from "./SearchHub";
import type { Metadata } from "next";
import { fetchWooCommerceProducts, getCategories } from "@/lib/woocommerce";
import { productMatchesAttributeFilters } from "./filterAttributes";
import { stringifyFilterParams } from "./filterUrl";

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
  const firstPage = await fetchWooCommerceProducts({ ...params, page: 1, per_page: 100 });
  if (firstPage.totalPages <= 1) return firstPage;

  // HARD CAP: Limit parallel fetching to a maximum of 4 pages (400 products).
  // Fetching the entire catalogue (e.g. 50+ pages) dynamically causes insanely long load times and timeouts.
  const maxPages = Math.min(firstPage.totalPages, 4);

  if (maxPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: maxPages - 1 }, (_, index) =>
      fetchWooCommerceProducts({ ...params, page: index + 2, per_page: 100 })
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

  const baseUrl = "https://discountqualityproducts.co.uk/shop";
  
  // Clean canonical builder to prevent indexing of dynamic facets
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

  console.log('[Shop] Filtering by:', { category: categorySlug, subcategory: subcategorySlug });

  // Await dynamically fetched categories
  const initialCategories = await getCategories();

  // Logic: If subcategory exists, use it. Otherwise use category.
  const activeSlug = subcategorySlug || categorySlug;

  let activeCategoryId: string | undefined = undefined;

  if (activeSlug) {
    // Check if it's a direct ID list from SearchHub (e.g. "15,16")
    if (/^[0-9,]+$/.test(activeSlug)) {
      activeCategoryId = activeSlug;
    } else {
      // Find ID from categories using slug from SearchOverlay
      for (const cat of initialCategories) {
        if (cat.slug === activeSlug) {
          // If it's a parent category, include the parent ID and all its children IDs
          // to ensure they are all "selected" in the SearchHub UI
          const ids = [cat.id];
          if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach(sub => ids.push(sub.id));
          }
          activeCategoryId = ids.join(',');
          break;
        }
        if (cat.subcategories) {
          const sub = cat.subcategories.find(s => s.slug === activeSlug);
          if (sub) {
            activeCategoryId = sub.id.toString();
            break;
          }
        }
      }
    }
  }

  const orderby = parseWooOrderBy(params.orderby);
  const order = parseWooOrder(params.order);
  const minPrice = typeof params.min_price === "string" ? params.min_price : undefined;
  const maxPrice = typeof params.max_price === "string" ? params.max_price : undefined;

  // Extract all pa_ parameters for dynamic filtering
  const paParams: Record<string, string> = {};
  for (const key of Object.keys(params)) {
    if (key.startsWith("pa_")) {
      const val = params[key];
      if (typeof val === "string") paParams[key] = val;
      if (Array.isArray(val)) paParams[key] = val.flatMap((item) => item.split(",")).filter(Boolean).join(",");
    }
  }

  const hasAttributeFilters = Object.keys(paParams).length > 0;

  // Attribute filters are applied locally so imported composite terms such as
  // "Dimmable||Filament" can still match clean single-term selections.
  const productParams: ProductQueryParams = {
    search: searchQ,
    page: hasAttributeFilters ? 1 : page,
    per_page: hasAttributeFilters ? 100 : 24,
    category: activeCategoryId,
    orderby,
    order,
    min_price: minPrice,
    max_price: maxPrice,
  };

  const filterProductParams: ProductQueryParams = {
    search: searchQ,
    page: 1,
    per_page: 100,
    category: activeCategoryId,
    min_price: minPrice,
    max_price: maxPrice,
  };

  const [response, filterResponse] = await Promise.all([
    hasAttributeFilters
      ? fetchAllCandidateProducts(productParams)
      : fetchWooCommerceProducts(productParams),
    fetchAllCandidateProducts(filterProductParams),
  ]);

  const strictProducts = hasAttributeFilters
    ? response.products.filter((product) => productMatchesAttributeFilters(product, paParams))
    : response.products;
  const visibleProducts = hasAttributeFilters
    ? strictProducts.slice((page - 1) * 24, page * 24)
    : strictProducts;
  const visibleTotal = hasAttributeFilters ? strictProducts.length : response.total;
  const visibleTotalPages = hasAttributeFilters ? Math.ceil(strictProducts.length / 24) : response.totalPages;

  const baseUrl = "https://discountqualityproducts.co.uk/shop";
  const searchParamsObj = new URLSearchParams();
  if (categorySlug) searchParamsObj.set("category", categorySlug);
  if (subcategorySlug) searchParamsObj.set("subcategory", subcategorySlug);
  if (searchQ) searchParamsObj.set("q", searchQ);
  if (orderby) searchParamsObj.set("orderby", orderby);
  if (order) searchParamsObj.set("order", order);
  if (minPrice) searchParamsObj.set("min_price", minPrice);
  if (maxPrice) searchParamsObj.set("max_price", maxPrice);
  
  Object.entries(paParams).forEach(([k, v]) => searchParamsObj.set(k, v));
  
  const getUrlForPage = (pageNum: number) => {
    const p = new URLSearchParams(searchParamsObj);
    if (pageNum > 1) p.set("page", pageNum.toString());
    const qs = stringifyFilterParams(p);
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  return (
    <>
      {page > 1 && <link rel="prev" href={getUrlForPage(page - 1)} />}
      {page < visibleTotalPages && <link rel="next" href={getUrlForPage(page + 1)} />}
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
            <div className="animate-pulse text-sm font-medium text-zinc-500">Searching...</div>
          </div>
        }
      >
      <SearchHub
        initialCategories={initialCategories}
        initialCategory={activeCategoryId}
        initialQuery={searchQ}
        products={visibleProducts}
        filterProducts={filterResponse.products}
        total={visibleTotal}
        totalPages={visibleTotalPages}
        currentPage={page}
      />
    </Suspense>
    </>
  );
}
