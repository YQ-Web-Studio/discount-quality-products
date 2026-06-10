"use client";

import Image from "next/image";
import { useState, useMemo, useCallback, useRef, useEffect, useTransition, Suspense, use } from "react";
import type { MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  SlidersHorizontal,
  X,
  Box,
  ShoppingCart,
  Heart,
  Loader2,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedProduct, DynamicNavCategory } from "@/lib/woocommerce";
import { useBasket, parsePriceString } from '@/lib/useBasket';
import { useMiniCart } from '@/lib/useMiniCart';
import { useWishlist } from '@/lib/useWishlist';
import { PRODUCT_SHIMMER } from "@/lib/shimmer";
import FilterModal from "./FilterModal";
import { buildShopUrl, setPageParam } from "./filterUrl";

/* ─── Filter options ─── */
const priceRanges  = [{ label:"Any price",value:"" },{ label:"Under £5",value:"0-5" },{ label:"£5 – £10",value:"5-10" },{ label:"£10 – £25",value:"10-25" },{ label:"£25+",value:"25-up" }];
const sortOptions  = [{ label:"Relevance",value:"" },{ label:"Price: Low → High",value:"price-asc" },{ label:"Price: High → Low",value:"price-desc" },{ label:"Newest First",value:"newest" }];

/** Map our UI sort value → WooCommerce orderby + order */
function sortToWooParams(sort: string): { orderby?: string; order?: string } {
  switch (sort) {
    case "price-asc":  return { orderby: "price", order: "asc" };
    case "price-desc": return { orderby: "price", order: "desc" };
    case "newest":     return { orderby: "date",  order: "desc" };
    default:           return {};
  }
}

/** Map our UI price-range value → min_price / max_price */
function priceRangeToWooParams(range: string): { min_price?: string; max_price?: string } {
  switch (range) {
    case "0-5":   return { min_price: "0",  max_price: "5" };
    case "5-10":  return { min_price: "5",  max_price: "10" };
    case "10-25": return { min_price: "10", max_price: "25" };
    case "25-up": return { min_price: "25" };
    default:      return {};
  }
}

/* ─── Toolbar dropdown ─── */
function ToolbarDropdown({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    const h = (e: globalThis.MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}:</span>
        {selected.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-30 mt-2 min-w-[180px] rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50",
                value === opt.value ? "font-semibold text-zinc-900" : "text-zinc-600"
              )}
            >
              {opt.label}
              {value === opt.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Product Card ─── */
function ProductCard({ product }: { product: MappedProduct }) {
  const isOutOfStock = product.stockStatus === 'outofstock' || (product.manageStock && product.stockQuantity === 0);
  const currentBasketQty = useBasket((s) => s.items.find((i) => i.id === String(product.databaseId))?.quantity || 0);
  const maxAvailable = (product.manageStock && product.stockQuantity != null) ? product.stockQuantity : Infinity;
  const isLimitReached = currentBasketQty >= maxAvailable;
  const addItem = useBasket((s) => s.addItem);
  const openMiniCart = useMiniCart((s) => s.open);
  const { isWishlisted, isPending, toggleWishlist } = useWishlist();
  const packMatch = product.name.match(/^(\d+)x\s/i);
  const packLabel = packMatch && packMatch[1] !== "1" ? `${packMatch[1]} Pack` : null;

  const displayPrice = product.price || product.regularPrice || 'View Details';
  const basketPrice = parsePriceString(product.price || product.regularPrice);
  const wishlisted = isWishlisted(product.databaseId);
  const wishlistPending = isPending(product.databaseId);

  function handleQuickAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || isLimitReached) {
      if (isLimitReached) {
        const left = product.stockQuantity ?? 0;
        window.alert(
          currentBasketQty > 0
            ? `You already have ${currentBasketQty} in your basket — only ${left} available in total.`
            : `Only ${left} ${left === 1 ? 'item' : 'items'} left in stock!`
        );
      }
      return;
    }

    const item = {
      id: String(product.databaseId),
      name: product.name,
      price: basketPrice,
      priceFormatted: displayPrice,
      image: product.image?.sourceUrl,
      slug: product.slug,
      manageStock: product.manageStock,
      stockQuantity: product.stockQuantity,
    };

    addItem(item, 1);
    
    if (wishlisted) {
      void toggleWishlist(product.databaseId).catch(() => undefined);
    }
    
    openMiniCart({ ...item, quantity: 1 });
  }

  function handleWishlistClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    void toggleWishlist(product.databaseId).catch(() => undefined);
  }

  return (
    <div className="group relative flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl img-shimmer">
        {product.image ? (
          <Image
            alt={product.image.altText || product.name}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw"
            src={product.image.sourceUrl}
            placeholder="blur"
            blurDataURL={PRODUCT_SHIMMER}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <Box className="h-8 w-8 text-zinc-200" />
            <span className="mt-2 text-[10px] font-medium uppercase tracking-tighter text-zinc-300">Preview</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {isOutOfStock ? (
            <span className="inline-flex items-center rounded bg-red-600/90 backdrop-blur-sm px-2 py-1 text-[10px] font-bold uppercase text-white shadow-sm">
              Sold Out
            </span>
          ) : packLabel && (
            <div className="flex h-7 items-center justify-center rounded-md bg-white/90 px-3 text-[11px] font-extrabold tracking-tight text-zinc-900 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md w-fit">
              {packLabel}
            </div>
          )}
        </div>

        {/* Wishlist Button (Top Right) */}
        <div className="absolute right-3 top-3 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 group/wishlist">
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-pressed={wishlisted}
            aria-label={
              wishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-xl ring-1 ring-white/50 backdrop-blur-md transition-all duration-200"
          >
            {wishlistPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  wishlisted ? "fill-zinc-950 text-zinc-950" : "group-hover/wishlist:fill-zinc-950"
                )}
              />
            )}
          </button>
        </div>

        {/* Blur Overlay (Bottom) */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/20 to-transparent backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none hidden lg:block" />

        {/* Add to Basket Bar (Floating Bottom) */}
        <div className="absolute inset-x-3 bottom-3 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out hidden lg:block">
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isLimitReached}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur-sm transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {isOutOfStock ? (
              "Sold Out"
            ) : isLimitReached ? (
              "Limit Reached"
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                {wishlisted ? "Move to Basket" : "Add to Basket"}
              </>
            )}
          </button>
        </div>
      </div>

      <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-label={`View ${product.name}`} />

      <div className="flex flex-col pt-5">
        <h2 className="text-sm font-medium text-zinc-900 line-clamp-2">{product.name}</h2>
        <p className="mt-2 text-base font-bold tracking-tight text-zinc-900">{displayPrice}</p>
      </div>
    </div>
  );
}

/* ─── Checkbox component ─── */
function Checkbox({ checked, onChange, size = "md" }: { checked: boolean; onChange: () => void; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const icon = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
        dim,
        checked ? "border-primary bg-primary text-white" : "border-zinc-300 bg-white hover:border-zinc-400"
      )}
    >
      {checked && <Check className={icon} />}
    </span>
  );
}

/* ─── Category sidebar tree (expanded parent links, multi-select subcategory filters) ─── */
function CategorySidebar({
  categories,
  selectedCategories,
  onToggleCategory,
  onClearAll,
  onCollapse,
}: {
  categories: DynamicNavCategory[];
  selectedCategories: Set<number>;
  onToggleCategory: (id: number) => void;
  onClearAll: () => void;
  onCollapse?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Categories</p>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-50 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
            title="Hide categories sidebar"
          >
            <PanelLeftClose className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        <Link
          href="/shop"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          <span>All Categories</span>
        </Link>

        {categories.map((cat) => {
          return (
            <div key={cat.id} className="py-0.5">
              <Link
                href={`/categories/${cat.slug}`}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
              >
                <span className={cn("transition-colors", cat.hoverText)}>
                  {cat.label}
                </span>
              </Link>

              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="ml-7 mt-0.5 mb-1 space-y-0.5 border-l border-zinc-100 pl-3">
                  {cat.subcategories.map((sub) => {
                    const subChecked = selectedCategories.has(sub.id);
                    return (
                      <div
                        key={sub.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-50"
                        onClick={() => onToggleCategory(sub.id)}
                      >
                        <Checkbox size="sm" checked={subChecked} onChange={() => onToggleCategory(sub.id)} />
                        <span className={cn("text-xs transition-colors", subChecked ? cn("font-semibold", cat.accentColor) : cn("font-medium text-zinc-500", cat.hoverText))}>
                          {sub.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type ProductDataResolved = {
  products: MappedProduct[];
  filterProducts: MappedProduct[];
  total: number;
  totalPages: number;
};

/* ─── Resolver components to enable Suspense and Streaming ─── */
function ProductCount({ productsPromise }: { productsPromise: Promise<ProductDataResolved> }) {
  const { total } = use(productsPromise);
  return (
    <p className="mt-0.5 text-sm text-zinc-500 animate-in fade-in duration-200">
      {total} product{total !== 1 ? "s" : ""} found
    </p>
  );
}

function FilterModalWrapper({ productsPromise }: { productsPromise: Promise<ProductDataResolved> }) {
  const { products, filterProducts } = use(productsPromise);
  return <FilterModal products={filterProducts && filterProducts.length > 0 ? filterProducts : products} />;
}

function TopPagination({
  productsPromise,
  currentPage,
  handlePageChange,
}: {
  productsPromise: Promise<ProductDataResolved>;
  currentPage: number;
  handlePageChange: (p: number) => void;
}) {
  const { totalPages } = use(productsPromise);
  if (totalPages <= 1) return null;
  return (
    <div className="lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-[calc(50%+4px)] shrink-0 mt-2 lg:mt-0">
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} position="top" />
    </div>
  );
}

function HeadLinks({
  productsPromise,
  currentPage,
  searchParams,
}: {
  productsPromise: Promise<ProductDataResolved>;
  currentPage: number;
  searchParams: URLSearchParams;
}) {
  const { totalPages } = use(productsPromise);
  
  const getUrlForPage = (pageNum: number) => {
    const p = new URLSearchParams(searchParams.toString());
    setPageParam(p, pageNum);
    return `https://discountqualityproducts.co.uk${buildShopUrl(p)}`;
  };

  return (
    <>
      {currentPage > 1 && <link rel="prev" href={getUrlForPage(currentPage - 1)} />}
      {currentPage < totalPages && <link rel="next" href={getUrlForPage(currentPage + 1)} />}
    </>
  );
}

function ProductGridAndPagination({
  productsPromise,
  currentPage,
  handlePageChange,
  router,
  handleClearAll,
  initialQuery,
}: {
  productsPromise: Promise<ProductDataResolved>;
  currentPage: number;
  handlePageChange: (p: number) => void;
  router: any;
  handleClearAll: () => void;
  initialQuery?: string;
}) {
  const { products, totalPages } = use(productsPromise);

  if (products.length > 0) {
    return (
      <>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 mb-10 xl:gap-x-8 animate-in fade-in duration-300">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} position="bottom" />
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
      <div className="rounded-full bg-zinc-50 p-6 mb-4">
        <Search className="h-10 w-10 text-zinc-300" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 mb-2">
        {initialQuery ? `No results found for "${initialQuery}"` : "No products found"}
      </h3>
      <p className="text-sm text-zinc-500 max-w-md">
        We couldn&apos;t categorise any products matching your current filters in our catalogue. Try adjusting your search term or broadening your categories.
      </p>
      <button
        onClick={() => { handleClearAll(); router.push('/shop'); }}
        className="mt-6 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 shadow-xl cursor-pointer"
      >
        Clear Search
      </button>
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  position
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  position: 'top' | 'bottom';
}) {
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxNeighbours = 3;
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const startNeighbours = Math.max(2, currentPage - maxNeighbours);
    const endNeighbours = Math.min(totalPages - 1, currentPage + maxNeighbours);
    if (startNeighbours > 2) {
      pages.push("...");
    }
    for (let i = startNeighbours; i <= endNeighbours; i++) {
      pages.push(i);
    }
    if (endNeighbours < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-y-2 gap-x-6",
      position === 'top' ? "" : "mt-auto pt-4"
    )}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-9 items-center justify-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipses-${idx}`} className="px-2 text-xs text-zinc-400 font-bold select-none">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all border border-transparent",
                  isCurrent 
                    ? "bg-primary text-white shadow-sm scale-105" 
                    : "text-zinc-500 hover:text-primary hover:bg-zinc-50"
                )}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Go to page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-9 items-center justify-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 mb-10 xl:gap-x-8">
      {Array.from({ length: 24 }).map((_, idx) => (
        <div key={idx} className="flex flex-col">
          <div className="aspect-square w-full rounded-xl bg-zinc-100 animate-pulse" />
          <div className="flex flex-col pt-5">
            <div className="space-y-2">
              <div className="h-4 w-5/6 rounded bg-zinc-200 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-zinc-200 animate-pulse" />
            </div>
            <div className="mt-2.5 h-4 w-16 rounded bg-zinc-300 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchHubSkeleton() {
  return (
    <div className="bg-white min-h-screen">
      {/* Top toolbar skeleton */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="w-full pl-8 pr-8 md:pl-12 md:pr-12 2xl:pl-16 2xl:pr-16">
          <div className="flex items-center justify-between gap-6 pt-5 pb-3">
            <div>
              <div className="h-8 w-48 bg-zinc-200 animate-pulse rounded" />
              <div className="h-4 w-24 bg-zinc-100 animate-pulse rounded mt-1.5" />
            </div>
          </div>
          <div className="relative flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 pb-4 flex-wrap w-full">
            <div className="h-8.5 w-24 bg-zinc-50 border border-zinc-200 animate-pulse rounded-full" />
            <div className="h-8.5 w-24 bg-zinc-50 border border-zinc-200 animate-pulse rounded-full" />
            <div className="h-8.5 w-24 bg-zinc-50 border border-zinc-200 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="w-full pr-8 md:pr-12 2xl:pr-16">
        <div className="flex items-stretch">
          {/* Desktop sidebar skeleton */}
          <aside className="hidden lg:block shrink-0 w-60 mr-10 border-r border-zinc-200/50 bg-zinc-100/50">
            <div className="sticky top-32 px-5 py-8 space-y-4">
              <div className="h-3.5 w-20 bg-zinc-200 animate-pulse rounded mb-4" />
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-4 bg-zinc-100 animate-pulse rounded w-[80%]" />
              ))}
            </div>
          </aside>

          {/* Product grid skeleton */}
          <div className="flex-1 flex flex-col py-8 pl-6 lg:pl-12 relative min-h-[400px]">
            <ProductGridSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main SearchHub ─── */
export default function SearchHub({
  categoriesPromise,
  categorySlug,
  subcategorySlug,
  initialQuery,
  productsPromise,
  currentPage = 1,
}: {
  categoriesPromise: Promise<DynamicNavCategory[]>;
  categorySlug?: string;
  subcategorySlug?: string;
  initialQuery?: string;
  productsPromise: Promise<ProductDataResolved>;
  currentPage?: number;
}) {
  const initialCategories = use(categoriesPromise);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeSlug = subcategorySlug || categorySlug;
  const initialCategory = useMemo(() => {
    if (!activeSlug) return "";
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
              cat.subcategories.forEach(sub => resolvedIds.push(sub.id));
            }
            break;
          }
          const sub = cat.subcategories?.find(s => s.slug === part);
          if (sub) {
            resolvedIds.push(sub.id);
            break;
          }
        }
      }
    }
    return resolvedIds.join(",");
  }, [activeSlug, initialCategories]);

  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(() =>
    initialCategory
      ? new Set(initialCategory.split(",").map(Number).filter((n) => !isNaN(n)))
      : new Set()
  );

  useEffect(() => {
    setSelectedCategories(
      initialCategory
        ? new Set(initialCategory.split(",").map(Number).filter((n) => !isNaN(n)))
        : new Set()
    );
  }, [initialCategory]);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialise sort/price from URL so they stay in sync on page load/back-nav
  const [selectedPrice, setSelectedPrice] = useState(() => {
    const min = searchParams.get("min_price");
    const max = searchParams.get("max_price");
    if (min === "0"  && max === "5")  return "0-5";
    if (min === "5"  && max === "10") return "5-10";
    if (min === "10" && max === "25") return "10-25";
    if (min === "25" && !max)        return "25-up";
    return "";
  });
  const [selectedSort, setSelectedSort] = useState(() => {
    const orderby = searchParams.get("orderby");
    const order   = searchParams.get("order");
    if (orderby === "price" && order === "asc")  return "price-asc";
    if (orderby === "price" && order === "desc") return "price-desc";
    if (orderby === "date"  && order === "desc") return "newest";
    return "";
  });
  


  const updateUrl = useCallback(
    (cats: Set<number>, pageFallback: number = 1) => {
      const params = new URLSearchParams(searchParams.toString());
      
      let categoryValue: string = "";
      
      if (cats.size > 0) {
        // 1. Check if it exactly matches a parent category (parent + all its subcategories selected)
        const matchedParent = initialCategories.find(cat => {
          const parentAndSubs = [cat.id, ...(cat.subcategories?.map(s => s.id) || [])];
          return parentAndSubs.length === cats.size && parentAndSubs.every(id => cats.has(id));
        });
        
        if (matchedParent) {
          categoryValue = matchedParent.slug;
        } else {
          // Mixed selection or subcategories, map IDs back to their slugs
          const selectedSlugs: string[] = [];
          cats.forEach(id => {
            for (const cat of initialCategories) {
              if (cat.id === id) {
                selectedSlugs.push(cat.slug);
                break;
              }
              const sub = cat.subcategories?.find(s => s.id === id);
              if (sub) {
                selectedSlugs.push(sub.slug);
                break;
              }
            }
          });
          categoryValue = selectedSlugs.filter(Boolean).join(",");
        }
      }

      if (categoryValue) params.set("category", categoryValue);
      else params.delete("category");
      
      // Clean up deprecated subcategory param
      params.delete("subcategory");
      
      setPageParam(params, pageFallback);

      startTransition(() => {
        router.push(buildShopUrl(params), { scroll: false });
      });
    },
    [router, searchParams, initialCategories]
  );

  const handleToggleCategory = useCallback((id: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      
      // Check if the toggled ID is a parent category
      const parentCat = initialCategories.find(c => c.id === id);
      
      if (parentCat) {
        // Toggling a parent category
        const catChecked = parentCat.subcategories && parentCat.subcategories.length > 0
          ? parentCat.subcategories.every(sub => prev.has(sub.id))
          : prev.has(parentCat.id);

        if (catChecked) {
          // Deselect parent and all its subcategories
          next.delete(parentCat.id);
          parentCat.subcategories?.forEach(sub => next.delete(sub.id));
        } else {
          // Select parent and all its subcategories
          next.add(parentCat.id);
          parentCat.subcategories?.forEach(sub => next.add(sub.id));
        }
      } else {
        // Toggling a subcategory
        if (next.has(id)) {
          next.delete(id);
          // If we deselect a subcategory, we should also make sure its parent is deselected
          const parent = initialCategories.find(cat => cat.subcategories?.some(sub => sub.id === id));
          if (parent) {
            next.delete(parent.id);
          }
        } else {
          next.add(id);
          // If all subcategories of a parent are now selected, we can also add the parent ID
          const parent = initialCategories.find(cat => cat.subcategories?.some(sub => sub.id === id));
          if (parent && parent.subcategories) {
            const allSubsSelected = parent.subcategories.every(sub => next.has(sub.id));
            if (allSubsSelected) {
              next.add(parent.id);
            }
          }
        }
      }

      // If nothing is selected, clear filters
      if (next.size === 0) {
        setTimeout(() => updateUrl(new Set(), 1), 0);
        return new Set();
      }

      // Check if every single interactable leaf node is now active
      const isAllSelected = initialCategories.length > 0 && initialCategories.every(cat => {
        if (cat.subcategories && cat.subcategories.length > 0) {
          return cat.subcategories.every(sub => next.has(sub.id));
        }
        return next.has(cat.id);
      });

      // If the user has explicitly satisfied every category, immediately reset to the implicit 'All' state
      if (isAllSelected) {
        setTimeout(() => updateUrl(new Set(), 1), 0);
        return new Set();
      }

      setTimeout(() => updateUrl(next, 1), 0);
      return next;
    });
  }, [updateUrl, initialCategories]);

  const handleClearAll = useCallback(() => {
    setSelectedPrice("");
    setSelectedSort("");
    // Build a clean URL removing only secondary filter params
    const params = new URLSearchParams(searchParams.toString());
    
    // Remove all pa_ params
    for (const key of Array.from(params.keys())) {
      if (key.startsWith("pa_")) {
        params.delete(key);
      }
    }
    
    params.delete("min_price");
    params.delete("max_price");
    params.delete("orderby");
    params.delete("order");
    params.delete("sort");
    setPageParam(params, 1);
    startTransition(() => {
      router.push(buildShopUrl(params), { scroll: false });
    });
  }, [router, searchParams]);

  const handleSortChange = useCallback((sort: string) => {
    setSelectedSort(sort);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("orderby");
    params.delete("order");
    const woo = sortToWooParams(sort);
    if (woo.orderby) params.set("orderby", woo.orderby);
    if (woo.order)   params.set("order",   woo.order);
    setPageParam(params, 1);
    startTransition(() => {
      router.push(buildShopUrl(params), { scroll: false });
    });
  }, [router, searchParams]);

  const handlePriceChange = useCallback((range: string) => {
    setSelectedPrice(range);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("min_price");
    params.delete("max_price");
    const woo = priceRangeToWooParams(range);
    if (woo.min_price) params.set("min_price", woo.min_price);
    if (woo.max_price) params.set("max_price", woo.max_price);
    setPageParam(params, 1);
    startTransition(() => {
      router.push(buildShopUrl(params), { scroll: false });
    });
  }, [router, searchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const params = new URLSearchParams(searchParams.toString());
    setPageParam(params, newPage);
    startTransition(() => {
      router.push(buildShopUrl(params), { scroll: false });
    });
  }, [router, searchParams]);

  /* Page title */
  const pageTitle = useMemo(() => {
    // Find all selected parent categories
    const activeParents = initialCategories.filter(cat => selectedCategories.has(cat.id));
    
    if (activeParents.length === 1) {
      return `Shop: ${activeParents[0].label}`;
    }
    
    // Fallback to single subcategory check
    if (selectedCategories.size === 1) {
      const id = Array.from(selectedCategories)[0];
      let catName = "";
      for (const cat of initialCategories) {
        if (cat.id === id) catName = cat.label;
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            if (sub.id === id) catName = sub.label;
          }
        }
      }
      if (catName) return `Shop: ${catName}`;
    }
    
    if (selectedCategories.size > 1) {
      // Check if all selected IDs belong to a single parent category's tree
      let parentOwner: typeof initialCategories[0] | null = null;
      
      for (const cat of initialCategories) {
        const belongsToThisCat = Array.from(selectedCategories).every(id => 
          id === cat.id || (cat.subcategories?.some(s => s.id === id) ?? false)
        );
        if (belongsToThisCat) {
          parentOwner = cat;
          break;
        }
      }
      
      if (parentOwner) {
        return `Shop: ${parentOwner.label}`;
      }
      
      return `Shop: Multiple Categories`;
    }
    
    if (initialQuery) return `Results for: "${initialQuery}"`;
    return "Shop All Products";
  }, [selectedCategories, initialQuery, initialCategories]);

  /* Active filter pills */
  const activeFilterPills = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = [];
    selectedCategories.forEach((id) => {
      let found = false;
      for (const cat of initialCategories) {
        if (cat.id === id) {
          pills.push({ key: `cat-${id}`, label: cat.label, onRemove: () => handleToggleCategory(id) });
          found = true;
          break;
        }
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            if (sub.id === id) {
              pills.push({ key: `sub-${id}`, label: sub.label, onRemove: () => handleToggleCategory(id) });
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
    });
    return pills;
  }, [selectedCategories, handleToggleCategory, initialCategories]);

  const sidebar = (
    <CategorySidebar
      categories={initialCategories}
      selectedCategories={selectedCategories}
      onToggleCategory={handleToggleCategory}
      onClearAll={handleClearAll}
      onCollapse={() => setIsSidebarCollapsed(true)}
    />
  );

  return (
    <div className="bg-white min-h-screen">
      <Suspense fallback={null}>
        <HeadLinks productsPromise={productsPromise} currentPage={currentPage} searchParams={searchParams} />
      </Suspense>
      {/* ── Top toolbar ── */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="w-full pl-8 pr-8 md:pl-12 md:pr-12 2xl:pl-16 2xl:pr-16">
          <div className="flex items-center justify-between gap-6 pt-5 pb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{pageTitle}</h1>
              <Suspense fallback={<div className="h-4 w-24 bg-zinc-100 animate-pulse rounded mt-0.5" />}>
                <ProductCount productsPromise={productsPromise} />
              </Suspense>
            </div>
          </div>

          <div className="relative flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 pb-4 flex-wrap w-full">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900 lg:hidden"
            >
              <SlidersHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Categories
            </button>

            <ToolbarDropdown label="Sort"      options={sortOptions}  value={selectedSort}      onChange={handleSortChange}      />
            <ToolbarDropdown label="Price"     options={priceRanges}  value={selectedPrice}     onChange={handlePriceChange}     />
            <Suspense fallback={<div className="h-8.5 w-24 bg-zinc-50 border border-zinc-200 animate-pulse rounded-full" />}>
              <FilterModalWrapper productsPromise={productsPromise} />
            </Suspense>

            {(selectedPrice || selectedSort || Array.from(searchParams.keys()).some(k => k.startsWith("pa_"))) && (
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold text-zinc-400 underline underline-offset-2 hover:text-zinc-700 transition-colors"
              >
                Clear all
              </button>
            )}

            {/* Top Pagination Controls */}
            <Suspense fallback={null}>
              <TopPagination productsPromise={productsPromise} currentPage={currentPage} handlePageChange={handlePageChange} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="w-full pr-8 md:pr-12 2xl:pr-16">
        <div className="flex items-stretch">

          {/* Desktop sidebar container (stretches full vertical height, creates background and border) */}
          <aside className={cn(
            "hidden lg:block shrink-0 transition-all duration-300 ease-in-out border-r border-zinc-200/50 bg-zinc-100/50",
            isSidebarCollapsed ? "w-14 mr-8" : "w-60 mr-10"
          )}>
            {/* Sticky wrapper inside the stretching column */}
            <div className={cn(
              "sticky top-32 transition-all duration-300 w-full overflow-y-auto overflow-x-hidden max-h-[calc(100vh-10rem)] minimal-scrollbar",
              isSidebarCollapsed ? "px-2 py-8" : "px-5 py-8"
            )}>
              <div className={cn(
                "transition-all duration-300 w-50",
                isSidebarCollapsed ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"
              )}>
                {sidebar}
              </div>

              <div className={cn(
                "flex flex-col items-center transition-all duration-300",
                isSidebarCollapsed ? "opacity-100 scale-100" : "opacity-0 pointer-events-none h-0 overflow-hidden scale-90"
              )}>
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white shadow-xs hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 border border-zinc-200 transition-colors cursor-pointer"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile sidebar drawer */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto">
                <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Categories</h2>
                  <button onClick={() => setMobileFiltersOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-6 py-4">{sidebar}</div>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 flex flex-col py-8 pl-6 lg:pl-12 relative min-h-[400px]">
            {isPending && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-30 flex items-center justify-center transition-all duration-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
                  <span className="text-sm font-semibold tracking-wide text-zinc-900 animate-pulse">Updating Catalogue...</span>
                </div>
              </div>
            )}
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGridAndPagination
                productsPromise={productsPromise}
                currentPage={currentPage}
                handlePageChange={handlePageChange}
                router={router}
                handleClearAll={handleClearAll}
                initialQuery={initialQuery}
              />
            </Suspense>
          </div>

        </div>
      </div>
    </div>
  );
}
