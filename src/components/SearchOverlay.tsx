"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ChevronDown, ArrowRight, Zap, Box } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { navigationCategories } from "@/lib/navigationConfig";
import { searchProductsAction } from "@/lib/actions";
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

const getFrontendCategoryData = (slug: string) => {
  for (const parent of navigationCategories) {
    if (parent.slug === slug) return { name: parent.label, parentName: null, topLevel: parent.label, accentColor: parent.accentColor };
    for (const sub of parent.subcategories) {
      if (sub.slug === slug || sub.wcSlug === slug) {
        return { name: sub.label, parentName: parent.label, topLevel: parent.label, accentColor: parent.accentColor };
      }
    }
  }
  return null;
};

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  cyan: "bg-cyan-100 text-cyan-800",
  violet: "bg-violet-100 text-violet-800",
  purple: "bg-purple-100 text-purple-800",
};

const getCategoryBadgeColor = (topLevelName: string, categoryName: string, accentColor?: string) => {
  // Specific purple overrides for requested departments
  if (categoryName === "Fittings & Accessories") return COLOR_MAP.purple;
  if (categoryName === "Light Bulbs" || topLevelName === "Lighting") return "bg-purple-200 text-purple-900";
  
  // Static mapping based on frontend config accent colors to ensure Tailwind picks up the classes
  if (accentColor) {
    const base = accentColor.replace('text-', '').replace('-600', '');
    return COLOR_MAP[base] || "bg-purple-50 text-purple-700";
  }

  return "bg-purple-50 text-purple-700";
};

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Portal & mount guard */
  useEffect(() => { setMounted(true); }, []);

  /* Focus input when overlay opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setExpandedCategory(null);
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

  /* Debounced live search */
  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      // 1. Fetch Backend Results (if query is at least 2 chars to save API load, or 1 if we want aggressive)
      // Actually let's keep it 2 for backend to avoid heavy junk, but show local at 1.
      const backendResults = query.length >= 2 ? await searchProductsAction(query) : [];
      
      // 2. Collect Local Category Matches (Always)
      const localMatches: UnifiedSearchResult[] = [];
      const lowerQuery = query.toLowerCase();
      
      navigationCategories.forEach(parent => {
        const parentMatch = parent.label.toLowerCase().includes(lowerQuery) || parent.slug.toLowerCase().includes(lowerQuery);
        if (parentMatch) {
          localMatches.push({
            type: 'category',
            id: `local-${parent.id}`,
            name: parent.label,
            slug: parent.slug,
            parentName: null,
          });
        }
        parent.subcategories.forEach(sub => {
          const subMatch = sub.label.toLowerCase().includes(lowerQuery) || sub.slug.toLowerCase().includes(lowerQuery);
          if (subMatch) {
            localMatches.push({
              type: 'category',
              id: `local-${sub.id}`,
              name: sub.label,
              slug: sub.slug,
              parentName: parent.label,
            });
          }
        });
      });

      // 3. Merge and Deduplicate
      const seenSlugs = new Set();
      const combined = [...localMatches, ...backendResults].filter(item => {
        if (seenSlugs.has(item.slug)) return false;
        
        // Strict Category Filter: Only show categories that exist in our frontend config
        if (item.type === 'category' && !getFrontendCategoryData(item.slug)) {
          return false;
        }
        
        seenSlugs.add(item.slug);
        return true;
      });

      // 4. Score and Sort by Relevance
      const scoredResults = combined.map(item => {
        const name = item.name.toLowerCase();
        const slug = item.slug.toLowerCase();
        let score = 0;

        if (name === lowerQuery || slug === lowerQuery) score += 100;
        else if (name.startsWith(lowerQuery) || slug.startsWith(lowerQuery)) score += 50;
        else if (name.includes(lowerQuery) || slug.includes(lowerQuery)) score += 10;
        
        // Prioritize categories over products for same text matches
        if (item.type === 'category') score += 5;

        return { ...item, score };
      });

      // Filter out low relevance backend junk if we have better local matches
      // but only if the user has typed something
      const sorted = scoredResults.sort((a, b) => b.score - a.score);

      setResults(sorted);
      setLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = useCallback((href: string) => {
    onClose();
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
            {/* ── Search bar row ── */}
            <motion.div variants={panelChildVariants} className="border-b border-zinc-100 px-4 py-4 md:px-6 2xl:px-8">
              <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1750px] items-center gap-4">
                <Search className="h-5 w-5 shrink-0 text-zinc-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search 25,000+ products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && query.trim()) {
                      handleNavigate(`/shop?q=${encodeURIComponent(query.trim())}`);
                    }
                  }}
                  className="flex-1 bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-400 outline-none"
                />
                <button
                  onClick={() => {
                    if (query) {
                      setQuery("");
                      inputRef.current?.focus();
                    } else {
                      onClose();
                    }
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                  aria-label={query ? "Clear search" : "Close search"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 py-6 md:px-6 2xl:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* ── Left Column: Search Results ── */}
                <div className="lg:col-span-9 flex flex-col">
              
              {/* ── Dynamic Search Results Stream ── */}
              <AnimatePresence mode="wait">
                {query.trim().length > 0 ? (
                  <motion.div
                    key="search-results"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <div className="pb-6">
                      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        {loading ? "Searching..." : "Search Results"}
                      </p>

                      {loading && (
                        <div className="flex flex-col gap-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 rounded-xl border border-zinc-100 p-3 animate-pulse">
                              <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-100" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-3/4 rounded bg-zinc-100" />
                                <div className="h-3 w-1/3 rounded bg-zinc-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!loading && results.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex flex-col gap-2">
                            {results.slice(0, 8).map((item) => {
                              const isCategory = item.type === 'category';
                              const route = isCategory ? `/shop?category=${item.slug}` : `/products/${item.slug}`;
                              
                              // Frontend Mapping Logic
                              const frontendData = isCategory ? getFrontendCategoryData(item.slug) : null;
                              const mappedName = frontendData?.name || item.name;
                              const parentName = frontendData?.parentName || item.parentName;
                              const topLevelName = frontendData?.topLevel || "Other";
                              const badgeColor = getCategoryBadgeColor(topLevelName, mappedName, frontendData?.accentColor);

                              return (
                                <button
                                  key={`${item.type}-${item.id}`}
                                  onClick={() => handleNavigate(route)}
                                  className="flex items-center gap-4 rounded-xl border border-transparent p-2 text-left transition-all hover:border-zinc-100 hover:bg-zinc-50"
                                >
                                  {!isCategory && (
                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                                      {item.imageUrl ? (
                                        <Image src={item.imageUrl} alt={item.imageAlt || item.name} fill sizes="56px" className="object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          <Box className="h-5 w-5 text-zinc-300" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-1 flex-col overflow-hidden">
                                    <span className={cn(
                                      "truncate text-sm font-semibold",
                                      isCategory && !parentName ? frontendData?.accentColor : "text-zinc-900"
                                    )}>
                                      {mappedName}
                                    </span>
                                    {isCategory ? (
                                      <span className={cn(
                                        "mt-1 w-fit rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                                        parentName ? badgeColor : "bg-zinc-100 text-zinc-600"
                                      )}>
                                        {parentName || "Department"}
                                      </span>
                                    ) : (
                                      <span className="mt-0.5 text-xs font-bold text-primary">
                                        {item.price ?? "View product"}
                                      </span>
                                    )}
                                  </div>
                                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 mr-2" />
                                </button>
                              );
                            })}
                          </div>
                          
                          {results.length > 8 && (
                            <button
                              onClick={() => handleNavigate(`/shop?q=${encodeURIComponent(query)}`)}
                              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
                            >
                              View all {results.length} results
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}
                        </motion.div>
                      )}

                      {!loading && results.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-20 text-center"
                        >
                          <p className="text-sm font-medium text-zinc-400">
                            No results for <span className="font-bold text-zinc-700">"{query}"</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Try a different term.
                          </p>
                        </motion.div>
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
                      Find exactly what you need across our range of 25,000+ premium products and trade accessories.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                {/* ── Right Column: Persistent Browse Categories ── */}
                <div className="lg:col-span-3">
              <motion.div variants={panelChildVariants}>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Browse by Category
                </p>
                <div className="flex flex-col gap-3">
                  {navigationCategories.map((category) => (
                    <div key={category.slug} className="rounded-xl border border-zinc-100 p-4">
                      <button
                        onClick={() => handleNavigate(`/shop?category=${category.slug}`)}
                        className={cn("text-sm font-bold mb-3 transition-opacity hover:opacity-70", category.accentColor)}
                      >
                        {category.label}
                      </button>
                      <div className="flex flex-col gap-2">
                        {category.subcategories.map((sub) => (
                          <button
                            key={sub.slug}
                            onClick={() => handleNavigate(`/shop?category=${category.slug}&subcategory=${sub.slug}`)}
                            className="flex items-center justify-between text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
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
