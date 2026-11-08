"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Tag, Sparkles, Box, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { navigationCategories } from "@/lib/navigationConfig";
import { useSearchStore } from "@/lib/useSearchStore";
import type { InstantSearchResponse, InstantSearchProduct, InstantSearchCategory } from "@/app/api/search/route";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const panelContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

const panelChildVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
};

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const productCountLabel = useSearchStore((s) => s.productCountLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCache = useRef<Record<string, InstantSearchResponse>>({});

  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [featuredProducts, setFeaturedProducts] = useState<InstantSearchProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<InstantSearchResponse>({
    products: [],
    categories: [],
    suggestions: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Portal & mount guard */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Pre-fetch curated featured products for instant zero-input display */
  useEffect(() => {
    if (!open) return;

    if (featuredProducts.length === 0) {
      setFeaturedLoading(true);
      fetch("/api/products/featured")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setFeaturedProducts(
              data.slice(0, 6).map((item: Record<string, unknown>) => ({
                id: String(item.id ?? ""),
                name: String(item.name ?? ""),
                slug: String(item.slug ?? ""),
                price: String(item.price || item.regularPrice || "£0.00"),
                imageUrl: (item.image as { sourceUrl?: string } | undefined)?.sourceUrl ||
                  (item.featuredImage as { node?: { sourceUrl?: string } } | undefined)?.node?.sourceUrl ||
                  null,
                category: (item.productCategories as { nodes?: Array<{ name?: string }> } | undefined)?.nodes?.[0]?.name || null,
              }))
            );
          }
        })
        .catch(() => {})
        .finally(() => setFeaturedLoading(false));
    }
  }, [open, featuredProducts.length]);

  /* Reset state and focus input when overlay opens/closes */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setInputValue("");
      setQuery("");
      setSearchResults({ products: [], categories: [], suggestions: [] });
      setIsSearching(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* Escape key handler */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* Debounce input -> query: 100ms delivers snappy response without server spamming */
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue.trim());
    }, 100);
    return () => clearTimeout(timer);
  }, [inputValue]);

  /* Live search fetcher with AbortController and instant cache */
  useEffect(() => {
    const trimmed = query.toLowerCase();
    if (trimmed.length < 2) {
      setSearchResults({ products: [], categories: [], suggestions: [] });
      setIsSearching(false);
      return;
    }

    // 1. Instant return from in-memory cache on backspace / repeated terms
    if (searchCache.current[trimmed]) {
      setSearchResults(searchCache.current[trimmed]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();

    const fetchLiveResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: InstantSearchResponse = await res.json();

        searchCache.current[trimmed] = data;
        setSearchResults(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Live search fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchLiveResults();

    return () => {
      controller.abort();
    };
  }, [query]);

  const handleNavigate = useCallback(
    (href: string) => {
      onClose();
      window.dispatchEvent(new CustomEvent("trigger-global-loading"));
      router.push(href);
    },
    [onClose, router]
  );

  const trimmedInput = inputValue.trim();
  const hasSearchQuery = trimmedInput.length >= 2;

  // 1. Instant Synchronous Categories (0ms)
  const instantCategories = useMemo(() => {
    if (!hasSearchQuery) return [];
    const lower = trimmedInput.toLowerCase();
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
    return matches.slice(0, 3);
  }, [trimmedInput, hasSearchQuery]);

  // 2. Suggestions are ALWAYS shown (0ms initial typed term, enriched when remote results arrive)
  const displaySuggestions = useMemo(() => {
    if (!hasSearchQuery) return [];
    const typed = toTitleCase(trimmedInput);
    const fromResults = searchResults.suggestions || [];
    const list = [typed, ...fromResults];
    return list.filter((s, idx, arr) => arr.indexOf(s) === idx).slice(0, 5);
  }, [trimmedInput, hasSearchQuery, searchResults.suggestions]);

  // 3. Display categories (combine instant local matches with remote categories)
  const displayCategories = useMemo(() => {
    if (searchResults.categories.length > 0) {
      return searchResults.categories;
    }
    return instantCategories;
  }, [searchResults.categories, instantCategories]);

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[10002] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-x-0 top-0 z-[10003] max-h-[88vh] overflow-y-auto bg-white shadow-2xl border-b border-zinc-200"
            variants={panelContainerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Search Bar Input Row */}
            <motion.div
              variants={panelChildVariants}
              className="border-b border-zinc-100 px-4 py-4 md:px-6 2xl:px-8 bg-zinc-50/60 sticky top-0 z-20 backdrop-blur-md"
            >
              <div className="mx-auto flex max-w-4xl items-center gap-3">
                <Search className="h-5 w-5 shrink-0 text-zinc-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Search ${productCountLabel} products, categories, or parts...`}
                  value={inputValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputValue(val);
                    if (val.trim().length >= 2) {
                      setIsSearching(true);
                    } else {
                      setIsSearching(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue.trim()) {
                      handleNavigate(`/shop?q=${encodeURIComponent(inputValue.trim())}`);
                    }
                  }}
                  className="flex-1 bg-transparent text-base sm:text-lg font-medium text-zinc-900 placeholder:text-zinc-400 outline-none"
                  aria-label="Search catalogue"
                />

                {isSearching && (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400 shrink-0" />
                )}

                <button
                  onClick={() => {
                    if (inputValue) {
                      setInputValue("");
                      setQuery("");
                      inputRef.current?.focus();
                    } else {
                      onClose();
                    }
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200/70 text-zinc-600 transition-colors hover:bg-zinc-300 hover:text-zinc-900"
                  aria-label={inputValue ? "Clear search" : "Close search"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            {/* Content Container (Unified Single-Column Stream) */}
            <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
              <AnimatePresence mode="wait">
                {/* ─────────────────────────────────────────────────────────────
                    STATE 1: EMPTY INPUT (CURATED MIX OF FEATURED & NEW ARRIVALS)
                   ───────────────────────────────────────────────────────────── */}
                {!hasSearchQuery ? (
                  <motion.div
                    key="initial-curated-state"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Expandable Department & Subcategory Explorer */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Popular Departments & Subcategories
                        </p>
                        {expandedCategory && (
                          <button
                            onClick={() => setExpandedCategory(null)}
                            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
                          >
                            Collapse all
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {navigationCategories.map((cat) => {
                          const isExpanded = expandedCategory === cat.slug;
                          return (
                            <div
                              key={cat.slug}
                              className={cn(
                                "rounded-xl border transition-all duration-200 overflow-hidden",
                                isExpanded
                                  ? "border-zinc-300 bg-zinc-50/80 shadow-xs ring-1 ring-zinc-200/50"
                                  : "border-zinc-200/80 bg-white hover:border-zinc-300"
                              )}
                            >
                              {/* Department Header */}
                              <div className="flex items-center justify-between p-2.5">
                                <button
                                  onClick={() => handleNavigate(`/categories/${cat.slug}`)}
                                  className="flex items-center gap-2 text-left flex-1 min-w-0 group"
                                >
                                  <div
                                    className={cn(
                                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-zinc-200/80 transition-colors",
                                      cat.accentColor
                                    )}
                                  >
                                    <Tag className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-bold text-zinc-900 group-hover:text-primary truncate transition-colors">
                                    {cat.label}
                                  </span>
                                </button>

                                {cat.subcategories.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedCategory((prev) => (prev === cat.slug ? null : cat.slug));
                                    }}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors ml-1"
                                    aria-label={isExpanded ? `Collapse ${cat.label}` : `Expand ${cat.label} subcategories`}
                                    aria-expanded={isExpanded}
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        isExpanded && "rotate-180 text-zinc-700"
                                      )}
                                    />
                                  </button>
                                )}
                              </div>

                              {/* Expandable Subcategories Tray */}
                              {isExpanded && cat.subcategories.length > 0 && (
                                <div className="border-t border-zinc-200/60 bg-white px-3 py-2 space-y-1.5 animate-in fade-in duration-150">
                                  <div className="flex flex-col gap-1">
                                    {cat.subcategories.map((sub) => (
                                      <button
                                        key={sub.slug}
                                        onClick={() => handleNavigate(`/categories/${cat.slug}?category=${sub.slug}`)}
                                        className="flex items-center justify-between py-1 px-1.5 rounded text-left text-xs text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition-colors group"
                                      >
                                        <span className="truncate">{sub.label}</span>
                                        <ChevronRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                      </button>
                                    ))}
                                  </div>
                                  <div className="pt-1 border-t border-zinc-100">
                                    <button
                                      onClick={() => handleNavigate(`/categories/${cat.slug}`)}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                    >
                                      View all in {cat.label}
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Featured & Trending Products Header */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                            <Sparkles className="h-3.5 w-3.5 fill-current" />
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                            Featured & Trending Products
                          </h3>
                        </div>
                        <button
                          onClick={() => handleNavigate("/shop")}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          Browse all
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Featured Products Grid */}
                      {featuredLoading && featuredProducts.length === 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                              key={i}
                              className="h-28 rounded-xl border border-zinc-100 bg-zinc-50 animate-pulse p-3"
                            />
                          ))}
                        </div>
                      ) : featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {featuredProducts.map((prod) => (
                            <button
                              key={`featured-${prod.id}`}
                              onClick={() => handleNavigate(`/products/${prod.slug}`)}
                              className="group flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 text-left shadow-2xs transition-all hover:border-zinc-300 hover:shadow-sm"
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100">
                                {prod.imageUrl ? (
                                  <Image
                                    src={prod.imageUrl}
                                    alt={decodeHtmlEntities(prod.name)}
                                    fill
                                    sizes="60px"
                                    className="object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                    <Box className="h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                {prod.category && (
                                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate">
                                    {prod.category}
                                  </span>
                                )}
                                <h4 className="text-xs font-medium text-zinc-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                  {decodeHtmlEntities(prod.name)}
                                </h4>
                                <p className="mt-1 text-xs font-bold text-primary">
                                  {prod.price}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                ) : (
                  /* ─────────────────────────────────────────────────────────────
                      STATE 2: ACTIVE SEARCH (UNIFIED SINGLE-COLUMN RELEVANCE STREAM)
                     ───────────────────────────────────────────────────────────── */
                  <motion.div
                    key="active-search-stream"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="space-y-4"
                  >
                    {/* SECTION A: High-Relevance Matching Categories (Instant 0ms or Remote) */}
                    {displayCategories.length > 0 && (
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-2 sm:p-3">
                        <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Matching Departments
                        </p>
                        <div className="space-y-1">
                          {displayCategories.map((cat) => (
                            <button
                              key={`cat-${cat.id}`}
                              onClick={() => handleNavigate(cat.route)}
                              className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white border border-transparent hover:border-zinc-200/60"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-zinc-200/60 text-zinc-500 group-hover:text-primary transition-colors">
                                  <Tag className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm font-semibold text-zinc-900 group-hover:text-primary transition-colors">
                                    {cat.name}
                                  </span>
                                  {cat.parentName && (
                                    <span className="text-xs text-zinc-400">
                                      in {cat.parentName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION B: Suggested Search Query Phrases (Always Shown) */}
                    {displaySuggestions.length > 0 && (
                      <div>
                        <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Search Suggestions
                        </p>
                        <div className="space-y-1">
                          {displaySuggestions.map((phrase, idx) => (
                            <button
                              key={`phrase-${idx}`}
                              onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(phrase)}`)}
                              className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-50 border border-transparent hover:border-zinc-200/60"
                            >
                              <div className="flex items-center gap-3">
                                <Search className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                                <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-950">
                                  {phrase}
                                </span>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION C: Direct Matching Product Cards (Straight to PDP) */}
                    {searchResults.products.length > 0 ? (
                      <div>
                        <div className="px-2 mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {searchResults.isFallback
                              ? "Recommended Products"
                              : searchResults.broadenedQuery
                              ? `Matching Products for "${searchResults.broadenedQuery}"`
                              : "Matching Products"}
                          </p>
                          {searchResults.isFallback && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                              Popular fallback
                            </span>
                          )}
                        </div>
                        {searchResults.isFallback && (
                          <p className="px-2 pb-2 text-xs text-zinc-500">
                            No direct matches for &ldquo;{inputValue.trim()}&rdquo; &mdash; explore popular products from our catalogue:
                          </p>
                        )}
                        <div className="space-y-1.5">
                          {searchResults.products.map((prod) => (
                            <button
                              key={`prod-${prod.id}`}
                              onClick={() => handleNavigate(`/products/${prod.slug}`)}
                              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white p-2.5 sm:p-3 text-left transition-all hover:border-zinc-300 hover:shadow-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100">
                                  {prod.imageUrl ? (
                                    <Image
                                      src={prod.imageUrl}
                                      alt={decodeHtmlEntities(prod.name)}
                                      fill
                                      sizes="56px"
                                      className="object-cover transition-transform group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                      <Box className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {prod.category && (
                                    <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">
                                      {prod.category}
                                    </span>
                                  )}
                                  <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 truncate group-hover:text-primary transition-colors">
                                    {decodeHtmlEntities(prod.name)}
                                  </h4>
                                  <span className="text-xs font-bold text-primary">
                                    {prod.price}
                                  </span>
                                </div>
                              </div>
                              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-zinc-400 group-hover:text-zinc-800 transition-colors shrink-0">
                                View Product
                                <ArrowRight className="h-3 w-3" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : isSearching ? (
                      <div>
                        <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Searching Products...
                        </p>
                        <div className="space-y-1.5">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-xl border border-zinc-100 bg-zinc-50/70 animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* SECTION D: Bottom CTA - "View All Results on Shop" */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(inputValue.trim())}`)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-zinc-800 shadow-xs"
                      >
                        <span>Search for &ldquo;{inputValue.trim()}&rdquo; (View all results)</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* SECTION E: Zero Results State (Only when search finishes with 0 products and 0 categories - e.g. gibberish) */}
                    {!isSearching && searchResults.products.length === 0 && displayCategories.length === 0 && (
                      <div className="py-8 text-center rounded-xl bg-zinc-50 border border-zinc-100">
                        <p className="text-sm font-semibold text-zinc-800">
                          No results found for &ldquo;{inputValue.trim()}&rdquo;
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Check your spelling or try searching for a product name or category.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Shortcut Hint */}
              <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-4 text-[11px] text-zinc-400">
                <span>
                  Press <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px] text-zinc-500">Enter</kbd> to view all results
                </span>
                <span>
                  Press <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px] text-zinc-500">Esc</kbd> to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
