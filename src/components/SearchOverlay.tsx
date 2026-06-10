"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Zap, Box, Tag } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { navigationCategories } from "@/lib/navigationConfig";
import { UnifiedSearchResult } from "@/lib/wordpress";

const panelContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const panelChildVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  },
};

function getSearchTermSuggestions(query: string, products: UnifiedSearchResult[]): string[] {
  const q = query.toLowerCase().trim();
  const termsSet = new Set<string>();

  products.forEach(p => {
    // Clean name of suffix noise like "Issue X", "Vol X", brackets, parentheses, etc.
    const cleanName = p.name
      .replace(/\s*[\(\[].*?[\)\]]/g, '') // remove bracketed/parenthesized content
      .replace(/(?:issue|vol|volume|pack|size|no\.?|part|edition)\s*\d+/gi, '') // remove issue, vol, size etc
      .replace(/\s+\d+(\s*pcs|\s*pk)?$/gi, '') // remove trailing numbers
      .replace(/[\s\-\,\.\:]+$/g, '') // remove trailing punctuation
      .trim();

    if (cleanName.toLowerCase().includes(q)) {
      if (cleanName.toLowerCase() !== q) {
        termsSet.add(cleanName.toLowerCase());
      }
    } else {
      if (p.name.toLowerCase() !== q) {
        termsSet.add(p.name.toLowerCase());
      }
    }
  });

  return Array.from(termsSet).map(term => {
    // Find matching product name to keep original capitalization where possible
    const match = products.find(p => p.name.toLowerCase().includes(term));
    if (match) {
      const idx = match.name.toLowerCase().indexOf(term);
      if (idx !== -1) {
        return match.name.substring(idx, idx + term.length);
      }
    }
    return term.replace(/\b\w/g, c => c.toUpperCase());
  });
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCache = useRef<Record<string, { suggestions: string[], bestMatch: UnifiedSearchResult | null }>>({});
  const hasEverLoadedRef = useRef(false); // true after first successful backend response this session

  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [localCategories, setLocalCategories] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [bestMatch, setBestMatch] = useState<UnifiedSearchResult | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Portal & mount guard */
  useEffect(() => { setMounted(true); }, []);

  /* Reset state and focus input when overlay status changes */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setInputValue("");
      setQuery("");
      setLocalCategories([]);
      setSuggestions([]);
      setBestMatch(null);
      setProductsLoading(false);
      searchCache.current = {}; // Clear client cache when overlay closes
      hasEverLoadedRef.current = false; // Reset so skeleton shows on next open
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* Escape key handler */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* Debounce input → query. 30ms is enough to batch paste/auto-repeat; AbortController handles stale requests */
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 30);
    return () => clearTimeout(timer);
  }, [inputValue]);

  /* Synchronous local category matching for instant feedback */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setLocalCategories([]);
      return;
    }
    
    const lower = trimmed.toLowerCase();
    const matches: any[] = [];

    navigationCategories.forEach(parent => {
      const parentMatch = parent.label.toLowerCase().includes(lower) || parent.slug.toLowerCase().includes(lower);
      if (parentMatch) {
        matches.push({
          id: `local-${parent.id}`,
          name: parent.label,
          slug: parent.slug,
          parentName: null,
          parentSlug: null,
          route: `/categories/${parent.slug}`,
          accentColor: parent.accentColor,
        });
      }
      parent.subcategories.forEach(sub => {
        const subMatch = sub.label.toLowerCase().includes(lower) || sub.slug.toLowerCase().includes(lower);
        if (subMatch) {
          matches.push({
            id: `local-${sub.id}`,
            name: sub.label,
            slug: sub.slug,
            parentName: parent.label,
            parentSlug: parent.slug,
            route: `/categories/${parent.slug}?category=${sub.slug}`,
            accentColor: parent.accentColor,
          });
        }
      });
    });

    setLocalCategories(matches);
  }, [query]);

  /* Remote product search — uses fetch + AbortController so stale requests cancel instantly */
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setBestMatch(null);
      setProductsLoading(false);
      return;
    }

    // Serve instantly from client cache if already queried
    if (searchCache.current[trimmed]) {
      const cached = searchCache.current[trimmed];
      setSuggestions(cached.suggestions);
      setBestMatch(cached.bestMatch);
      setProductsLoading(false);
      return;
    }

    // Stale suggestions stay on screen; only show loading if nothing cached yet
    setProductsLoading(true);

    const controller = new AbortController();

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const backendResults: UnifiedSearchResult[] = await res.json();

        // Filter for products only
        const productResults = backendResults.filter(item => item.type === 'product');

        // Scoring for Best Match (Exact or high-relevance score >= 90)
        let highestScore = 0;
        let bestItem: UnifiedSearchResult | null = null;

        productResults.forEach(item => {
          const name = item.name.toLowerCase();
          let score = 0;

          if (name === trimmed) {
            score = 100;
          } else if (name.startsWith(trimmed)) {
            score = 95;
          } else {
            const queryWords = trimmed.split(/\s+/).filter(Boolean);
            const nameWords = name.split(/\s+/).filter(Boolean);
            let matchCount = 0;
            queryWords.forEach(qw => {
              if (nameWords.includes(qw)) {
                matchCount++;
              }
            });
            if (queryWords.length > 0) {
              const ratio = matchCount / queryWords.length;
              if (ratio === 1) {
                score = 90;
              } else {
                score = Math.round(ratio * 80);
              }
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestItem = item;
          }
        });

        let finalBestMatch: UnifiedSearchResult | null = null;
        if (highestScore >= 90 && bestItem) {
          finalBestMatch = bestItem;
        }

        const derivedSuggestions = getSearchTermSuggestions(trimmed, productResults);

        // Cache results for instant backspace/repeat
        searchCache.current[trimmed] = {
          suggestions: derivedSuggestions,
          bestMatch: finalBestMatch
        };

        setBestMatch(finalBestMatch);
        setSuggestions(derivedSuggestions);
        hasEverLoadedRef.current = true; // mark that results have loaded at least once
      } catch (error: any) {
        if (error?.name === 'AbortError') return; // request was cancelled — ignore
        console.error("Failed to fetch products:", error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchResults();

    return () => {
      controller.abort(); // cancel any in-flight request when query changes
    };
  }, [query]);

  const handleNavigate = useCallback((href: string) => {
    onClose();
    window.dispatchEvent(new CustomEvent("trigger-global-loading"));
    router.push(href);
  }, [onClose, router]);

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[10002] bg-black/60"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-x-0 top-0 z-[10003] max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-b border-zinc-200"
            variants={panelContainerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Search bar row */}
            <motion.div variants={panelChildVariants} className="border-b border-zinc-100 px-4 py-4 md:px-6 2xl:px-8">
              <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1750px] items-center gap-4">
                <Search className="h-5 w-5 shrink-0 text-zinc-400" />
                 <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search 14,000+ products..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue.trim()) {
                      handleNavigate(`/shop?q=${encodeURIComponent(inputValue.trim())}`);
                    }
                  }}
                  className="flex-1 bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-400 outline-none"
                />
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                  aria-label={inputValue ? "Clear search" : "Close search"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 py-6 md:px-6 2xl:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Left Column: Search Results */}
                <div className="lg:col-span-9 flex flex-col">
                  <AnimatePresence mode="wait">
                    {inputValue.trim().length > 0 ? (
                      <motion.div
                        key="search-results"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="pb-6"
                      >
                        {/* Instant Categories matching local Config */}
                        {localCategories.length > 0 && (
                          <div className="mb-6">
                            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                              Categories & Departments
                            </h4>
                            <div className="flex flex-col gap-1.5">
                              {localCategories.slice(0, 5).map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => handleNavigate(cat.route)}
                                  className="group flex items-center justify-between rounded-xl px-4 py-2.5 text-left transition-all hover:bg-zinc-50 border border-transparent hover:border-zinc-100/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 group-hover:bg-white group-hover:text-emerald-700 transition-colors border border-zinc-100/50">
                                      <Tag className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-baseline">
                                      <span className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-950 transition-colors">
                                        {cat.name}
                                      </span>
                                      {cat.parentName && (
                                        <span className="ml-2 text-xs text-zinc-400">
                                          in {cat.parentName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-zinc-400 transition-all transform group-hover:translate-x-1" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Product suggestions */}
                        <div>
                          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            Search Suggestions
                          </h4>

                          {/* Top line: always instant, never skeletonised */}
                          {inputValue.trim().length >= 2 && (
                            <button
                              onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(inputValue.trim())}`)}
                              className="group flex items-center justify-between rounded-xl px-4 py-2.5 text-left transition-all hover:bg-zinc-50 border border-transparent hover:border-zinc-100/50 mb-1.5"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 group-hover:bg-white group-hover:text-emerald-700 transition-colors border border-zinc-100/50">
                                  <Search className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold text-zinc-900 truncate transition-colors">
                                  {inputValue.trim()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">Search term</span>
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-zinc-400 transition-all transform group-hover:translate-x-1" />
                              </div>
                            </button>
                          )}

                          {/* Skeleton: only on first cold load (no results ever received yet) */}
                          {productsLoading && !hasEverLoadedRef.current && suggestions.length === 0 ? (
                            <div className="space-y-1.5">
                              {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 border border-zinc-50 rounded-xl animate-pulse bg-zinc-50/50">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-zinc-100" />
                                    <div className="h-4 w-48 rounded bg-zinc-100" />
                                  </div>
                                  <div className="h-4 w-12 rounded bg-zinc-100" />
                                </div>
                              ))}
                            </div>
                          ) : suggestions.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {/* Exact query match suggestion (updates instantly with inputValue) — already rendered above as top line */}

                              {/* Other suggestions from the backend (sliced to 5) */}
                              {suggestions
                                .filter(s => s.toLowerCase() !== inputValue.trim().toLowerCase())
                                .slice(0, 5)
                                .map((suggestion, idx) => (
                                  <button
                                    key={`suggestion-${idx}`}
                                    onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(suggestion)}`)}
                                    className="group flex items-center justify-between rounded-xl px-4 py-2.5 text-left transition-all hover:bg-zinc-50 border border-transparent hover:border-zinc-100/50"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 group-hover:bg-white group-hover:text-emerald-700 transition-colors border border-zinc-100/50">
                                        <Search className="h-4 w-4" />
                                      </div>
                                      <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-950 truncate transition-colors">
                                        {suggestion}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-zinc-400 transition-all transform group-hover:translate-x-1" />
                                    </div>
                                  </button>
                                ))
                              }

                              {/* View all button */}
                              {suggestions.length > 5 && (
                                <button
                                  onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(query)}`)}
                                  className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline py-2 w-fit mx-auto"
                                >
                                  View all
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            !productsLoading && localCategories.length === 0 && (
                              <div className="py-16 text-center">
                                <p className="text-sm font-medium text-zinc-400">
                                  No results for <span className="font-bold text-zinc-700">"{query}"</span>
                                </p>
                                <p className="mt-1 text-xs text-zinc-400">
                                  Try searching for something else.
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="initial-state"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-12 pb-24"
                      >
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-300 mx-auto">
                          <Search className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">Search our catalogue</h3>
                        <p className="mt-2 max-w-sm text-sm font-medium text-zinc-400 mx-auto">
                          Find exactly what you need across our range of 14,000+ premium products and trade accessories.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right Column: Persistent Browse Categories OR Best Match */}
                <div className="lg:col-span-3">
                  <AnimatePresence mode="wait">
                    {bestMatch ? (
                      <motion.div
                        key="best-match"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
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
                                alt={bestMatch.imageAlt || bestMatch.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 300px"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Box className="h-10 w-10 text-zinc-300" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-zinc-900 group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] text-sm leading-snug">
                            {bestMatch.name}
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
                    ) : (
                      <motion.div
                        key="browse-categories"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          Browse by Category
                        </p>
                        <div className="flex flex-col gap-3">
                          {navigationCategories.map((category) => (
                            <div key={category.slug} className="rounded-xl border border-zinc-100 p-4 bg-zinc-50/50">
                              <button
                                onClick={() => handleNavigate(`/categories/${category.slug}`)}
                                className={cn("text-sm font-bold mb-3 transition-opacity hover:opacity-70 text-left w-full", category.accentColor)}
                              >
                                {category.label}
                              </button>
                              <div className="flex flex-col gap-2">
                                {category.subcategories.map((sub) => (
                                  <button
                                    key={sub.slug}
                                    onClick={() => handleNavigate(`/categories/${category.slug}?category=${sub.slug}`)}
                                    className="flex items-center justify-between text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 text-left"
                                  >
                                    {sub.label}
                                    <ArrowRight className="h-3 w-3 text-zinc-300" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Shortcut hint */}
                  <p className="mt-10 text-[10px] text-zinc-400">
                    Press <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono font-medium text-zinc-500">Esc</kbd> to close
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
