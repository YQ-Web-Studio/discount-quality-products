import { Suspense } from "react";
import CategoryHub from "./CategoryHub";
import type { Metadata } from "next";
import { fetchWooCommerceProducts, getCategories } from "@/lib/woocommerce";
import { productMatchesAttributeFilters } from "../../shop/filterAttributes";

export const revalidate = 3600;
export const dynamicParams = true;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateStaticParams() {
  const initialCategories = await getCategories();
  return initialCategories.map((cat) => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const initialCategories = await getCategories();
  const category = initialCategories.find(c => c.slug === slug);
  const name = category ? category.label : slug.replace(/-/g, " ");
  
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
  const firstPage = await fetchWooCommerceProducts({ ...params, page: 1, per_page: 100 });
  if (firstPage.totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  
  const initialCategories = await getCategories();
  
  // Find the exact category structure to pass to the sidebar
  const category = initialCategories.find(c => c.slug === slug);
  const activeCategoryId = category ? category.id.toString() : undefined;
  const categoryName = category ? category.label : slug;

  // We only pass the current parent category structure to CategoryHub
  // This satisfies Option A (only subcategories/attributes for current root category)
  const categoryTreeForSidebar = category ? [category] : [];

  const pageStr = typeof sParams.page === "string" ? sParams.page : "1";
  const page = parseInt(pageStr, 10) || 1;

  // We can still support deeper subcategory filtering from search params if the user clicks a subcategory check box
  const selectedSubcategories = typeof sParams.category === "string" ? sParams.category : undefined;
  
  // If subcategory checkboxes are selected, filter down further, otherwise use the parent category ID
  const effectiveCategoryIds = selectedSubcategories ? selectedSubcategories : activeCategoryId;

  const orderby = parseWooOrderBy(sParams.orderby);
  const order = parseWooOrder(sParams.order);
  const minPrice = typeof sParams.min_price === "string" ? sParams.min_price : undefined;
  const maxPrice = typeof sParams.max_price === "string" ? sParams.max_price : undefined;

  const paParams: Record<string, string> = {};
  for (const key of Object.keys(sParams)) {
    if (key.startsWith("pa_")) {
      const val = sParams[key];
      if (typeof val === "string") paParams[key] = val;
      if (Array.isArray(val)) paParams[key] = val.flatMap((item) => item.split(",")).filter(Boolean).join(",");
    }
  }

  const hasAttributeFilters = Object.keys(paParams).length > 0;

  const productParams: ProductQueryParams = {
    page: hasAttributeFilters ? 1 : page,
    per_page: hasAttributeFilters ? 100 : 24,
    category: effectiveCategoryIds,
    orderby,
    order,
    min_price: minPrice,
    max_price: maxPrice,
  };

  const filterProductParams: ProductQueryParams = {
    page: 1,
    per_page: 100,
    category: activeCategoryId, // Notice we use the base category for the filter modal so it has all options available
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

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
          <div className="animate-pulse text-sm font-medium text-zinc-500">Loading {categoryName}...</div>
        </div>
      }
    >
      <CategoryHub
        baseSlug={slug}
        initialCategories={categoryTreeForSidebar}
        initialCategory={effectiveCategoryIds}
        products={visibleProducts}
        filterProducts={filterResponse.products}
        total={visibleTotal}
        totalPages={visibleTotalPages}
        currentPage={page}
      />
    </Suspense>
  );
}
