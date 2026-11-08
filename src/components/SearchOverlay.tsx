"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Tag, Box, ChevronRight, Loader2, Zap, Sparkles } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  /* Portal & mount guard */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Pre-fetch curated featured products for instant zero-input display in the blank space */
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
                imageUrl:
                  (item.image as { sourceUrl?: string } | undefined)?.sourceUrl ||
                  (item.featuredImage as { node?: { sourceUrl?: string } } | undefined)?.node?.sourceUrl ||
                  null,
                category:
                  (item.productCategories as { nodes?: Array<{ name?: string }> } | undefined)?.nodes?.[0]?.name || null,
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

  // 4. Calculate Best Match product
  const bestMatch = useMemo<InstantSearchProduct | null>(() => {
    if (!hasSearchQuery || searchResults.products.length === 0 || searchResults.isFallback) {
      return null;
    }

    const lower = trimmedInput.toLowerCase();
    let highestScore = 0;
    let candidate: InstantSearchProduct | null = null;

    for (const item of searchResults.products) {
      const name = item.name.toLowerCase();
      let score = 0;

      if (name === lower) {
        score = 100;
      } else if (name.startsWith(lower)) {
        score = 95;
      } else {
        const queryWords = lower.split(/\s+/).filter(Boolean);
        const nameWords = name.split(/\s+/).filter(Boolean);
        let matchCount = 0;
        for (const qw of queryWords) {
          if (nameWords.includes(qw)) matchCount++;
        }
        if (queryWords.length > 0) {
          const ratio = matchCount / queryWords.length;
          score = ratio === 1 ? 90 : Math.round(ratio * 80);
        }
      }

      if (score > highestScore) {
        highestScore = score;
        candidate = item;
      }
    }

    return highestScore >= 90 ? candidate : searchResults.products[0] || null;
  }, [hasSearchQuery, searchResults.products, searchResults.isFallback, trimmedInput]);

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
              <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1750px] items-center gap-3">
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

            {/* Content Container */}
            <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 py-6 md:px-6 2xl:px-8">
              
              {/* ─────────────────────────────────────────────────────────────
                  ROW 1: CATEGORY CARDS ACROSS THE WHOLE BOX ALONG THE TOP (1 ROW)
                 ───────────────────────────────────────────────────────────── */}
              <div className="mb-6">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Browse by Department
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {navigationCategories.map((category) => (
                    <div
                      key={category.slug}
                      className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 hover:bg-white hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        <button
                          onClick={() => handleNavigate(`/categories/${category.slug}`)}
                          className={cn(
                            "text-xs sm:text-sm font-bold mb-2 transition-opacity hover:opacity-80 text-left w-full flex items-center justify-between group",
                            category.accentColor
                          )}
                        >
                          <span className="truncate">{category.label}</span>
                          <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                        <div className="flex flex-col gap-1">
                          {category.subcategories.map((sub) => (
                            <button
                              key={sub.slug}
                              onClick={() => handleNavigate(`/categories/${category.slug}?category=${sub.slug}`)}
                              className="flex items-center justify-between text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 text-left py-0.5 truncate group"
                            >
                              <span className="truncate">{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  ROW 2: DYNAMIC CONTENT (FEATURED CARDS BEFORE TYPING, OR SEARCH STREAM)
                 ───────────────────────────────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {!hasSearchQuery ? (
                  /* Initial State: Curated Featured Products filling the space below category cards */
                  <motion.div
                    key="initial-featured-state"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-t border-zinc-100 pt-5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                          <Sparkles className="h-3.5 w-3.5 fill-current" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-900">
                          Featured Products
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

                    {featuredLoading && featuredProducts.length === 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="h-44 rounded-xl border border-zinc-100 bg-zinc-50/70 animate-pulse p-3"
                          />
                        ))}
                      </div>
                    ) : featuredProducts.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {featuredProducts.map((prod) => (
                          <button
                            key={`featured-${prod.id}`}
                            onClick={() => handleNavigate(`/products/${prod.slug}`)}
                            className="group flex flex-col rounded-xl border border-zinc-200/70 bg-white p-2.5 text-left transition-all hover:border-zinc-300 hover:shadow-xs"
                          >
                            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100 mb-2">
                              {prod.imageUrl ? (
                                <Image
                                  src={prod.imageUrl}
                                  alt={decodeHtmlEntities(prod.name)}
                                  fill
                                  sizes="160px"
                                  className="object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                  <Box className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                              <div>
                                {prod.category && (
                                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 truncate mb-0.5">
                                    {prod.category}
                                  </span>
                                )}
                                <h4 className="text-xs font-medium text-zinc-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                  {decodeHtmlEntities(prod.name)}
                                </h4>
                              </div>
                              <p className="mt-1 text-xs font-bold text-primary">
                                {prod.price}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {/* Shortcut hint */}
                    <div className="border-t border-zinc-100 pt-3 text-[10px] text-zinc-400 flex justify-between">
                      <span>Select a department above or type to search products</span>
                      <span>Press <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-zinc-500">Esc</kbd> to close</span>
                    </div>
                  </motion.div>
                ) : (
                  /* Active Search Stream with Best Match alongside */
                  <motion.div
                    key="search-active-stream"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="border-t border-zinc-100 pt-5"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                      
                      {/* Left Column: Search Results */}
                      <div className={cn(bestMatch ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12", "flex flex-col space-y-5")}>
                        {/* Section A: Matching Departments */}
                        {displayCategories.length > 0 && (
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5 sm:p-3">
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

                        {/* Section B: Suggestions */}
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

                        {/* Section C: Products Stream */}
                        {searchResults.products.length > 0 ? (
                          <div>
                            <div className="px-2 mb-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                {searchResults.isFallback
                                  ? "Popular Products"
                                  : searchResults.broadenedQuery
                                  ? `Matching Products for "${searchResults.broadenedQuery}"`
                                  : "Matching Products"}
                              </p>
                              {searchResults.isFallback && (
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  No exact matches for &ldquo;{inputValue.trim()}&rdquo; &mdash; you may be interested in:
                                </p>
                              )}
                            </div>

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

                        {/* Section D: Clean Text Button */}
                        <div className="pt-2 flex justify-center">
                          <button
                            onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(inputValue.trim())}`)}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-600 hover:text-zinc-950 hover:underline transition-colors py-2"
                          >
                            <span>Search for &ldquo;{inputValue.trim()}&rdquo; in all products</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Section E: Zero Results State (Only for True Gibberish) */}
                        {!isSearching && searchResults.products.length === 0 && displayCategories.length === 0 && (
                          <div className="py-12 text-center rounded-xl bg-zinc-50/50 border border-zinc-100">
                            <p className="text-sm font-semibold text-zinc-800">
                              No results found for &ldquo;{inputValue.trim()}&rdquo;
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              Check your spelling or choose a department above.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Best Match Card (when active match found) */}
                      {bestMatch && (
                        <div className="lg:col-span-4 xl:col-span-3">
                          <motion.div
                            key={`best-match-${bestMatch.id}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                          >
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                              Best Match
                            </p>
                            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                              <div className="absolute top-3 left-3 z-10 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                <Zap className="h-3 w-3 fill-current" />
                                Best Match
                              </div>
                              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 mb-4 mt-2">
                                {bestMatch.imageUrl ? (
                                  <Image
                                    src={bestMatch.imageUrl}
                                    alt={decodeHtmlEntities(bestMatch.name)}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 300px"
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                    <Box className="h-10 w-10 text-zinc-300" />
                                  </div>
                                )}
                              </div>
                              <h4 className="font-bold text-zinc-900 group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] text-sm leading-snug">
                                {decodeHtmlEntities(bestMatch.name)}
                              </h4>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-extrabold text-primary">
                                  {bestMatch.price || "View Price"}
                                </span>
                              </div>
                              <button
                                onClick={() => handleNavigate(`/products/${bestMatch.slug}`)}
                                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-bold text-white transition-all hover:bg-zinc-800"
                              >
                                View Details
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
