"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, SlidersHorizontal, ChevronDown, Check, Search, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedProduct } from "@/lib/woocommerce";
import { getCanonicalAttribute, slugifyTermValue, splitAttributeOptions } from "./filterAttributes";
import { buildShopUrl, setPageParam } from "./filterUrl";

type FilterModalProps = {
  products: MappedProduct[];
};

type AvailableAttribute = {
  slug: string;
  label: string;
  valueKind: "wattage" | "default";
  terms: {
    label: string;
    value: string;
  }[];
};

export default function FilterModal({ products }: FilterModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);

  // Parse active parameters from URL
  const activeParams = useMemo(() => {
    const params: Record<string, string[]> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("pa_")) {
        const valueKind = key === "pa_wattage" ? "wattage" : "default";
        const values = value.split(",").map((term) => slugifyTermValue(term, valueKind)).filter(Boolean);
        params[key] = Array.from(new Set([...(params[key] || []), ...values]));
      }
    }
    return params;
  }, [searchParams]);

  // Local state for the modal selections
  const [localSelections, setLocalSelections] = useState<Record<string, string[]>>(activeParams);

  // Dynamically extract available attributes
  const availableAttributes = useMemo<AvailableAttribute[]>(() => {
    const attrMap: Record<string, { label: string; valueKind: AvailableAttribute["valueKind"]; terms: Map<string, string> }> = {};
    
    products.forEach((product) => {
      product.attributes?.forEach((attr) => {
        if (!attr.name) return;
        
        const canonical = getCanonicalAttribute(attr.name);
        
        if (!attrMap[canonical.slug]) {
          attrMap[canonical.slug] = {
            label: canonical.label,
            valueKind: canonical.valueKind,
            terms: new Map(),
          };
        }
        
        splitAttributeOptions(attr.options).forEach((opt) => {
          if (!opt) return;
          const value = slugifyTermValue(opt, canonical.valueKind);
          if (!value) return;

          const existingLabel = attrMap[canonical.slug].terms.get(value);
          if (!existingLabel || existingLabel.length > opt.length) {
            attrMap[canonical.slug].terms.set(value, opt);
          }
        });
      });
    });

    return Object.entries(attrMap).map(([slug, data]) => ({
      slug,
      label: data.label,
      valueKind: data.valueKind,
      terms: Array.from(data.terms, ([value, label]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [products]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAttributes = useMemo(() => {
    if (!searchQuery) return availableAttributes;
    const lowerQ = searchQuery.toLowerCase();
    
    return availableAttributes.map(attr => {
      const matchLabel = attr.label.toLowerCase().includes(lowerQ);
      const matchTerms = attr.terms.filter(term => term.label.toLowerCase().includes(lowerQ));
      
      if (matchLabel) {
        return attr; 
      }
      if (matchTerms.length > 0) {
        return { ...attr, terms: matchTerms };
      }
      
      return null;
    }).filter(Boolean) as typeof availableAttributes;
  }, [availableAttributes, searchQuery]);

  const toggleTerm = (slug: string, value: string) => {
    setLocalSelections((prev) => {
      const current = prev[slug] || [];
      if (current.includes(value)) {
        const next = current.filter((t) => t !== value);
        return { ...prev, [slug]: next };
      } else {
        return { ...prev, [slug]: [...current, value] };
      }
    });
  };

  const handleClearAll = () => {
    setLocalSelections({});
  };

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Clear all existing pa_ params
    for (const key of Array.from(params.keys())) {
      if (key.startsWith("pa_")) {
        params.delete(key);
      }
    }
    
    // Add new selections
    for (const [slug, terms] of Object.entries(localSelections)) {
      if (terms && terms.length > 0) {
        params.set(slug, terms.join(","));
      }
    }
    
    // Reset to page 1 on filter change
    setPageParam(params, 1);
    
    setOpen(false);
    router.push(buildShopUrl(params), { scroll: false });
  };

  if (availableAttributes.length === 0) return null;

  const totalSelections = Object.values(localSelections).reduce((acc, terms) => acc + terms.length, 0);

  return (
    <>
      <button
        onClick={() => {
          setLocalSelections(activeParams);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900 cursor-pointer shadow-xs"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {totalSelections > 0 && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
            {totalSelections}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-50/95 backdrop-blur-md animate-in fade-in duration-200">
          
          {/* Main Top Header Control Bar */}
          <div className="bg-white border-b border-zinc-200/60 sticky top-0 z-20">
            <div className="mx-auto max-w-[1600px] 2xl:max-w-[1850px] px-6 sm:px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
                  <SlidersHorizontal className="h-6 w-6 text-primary" />
                  Store Filters
                  {totalSelections > 0 && (
                    <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-bold text-primary">
                      {totalSelections} active
                    </span>
                  )}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Refine your search across all dynamic specifications.</p>
              </div>

              {/* Dynamic Filter Search & Close Buttons */}
              <div className="flex items-center gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search specifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-zinc-200 bg-zinc-50/60 py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <button 
                  onClick={() => setOpen(false)} 
                  className="rounded-full p-2.5 border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shadow-xs"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid Content Area (Highly Optimized) */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-8 md:py-10">
            <div className="mx-auto max-w-[1600px] 2xl:max-w-[1850px]">
              
              {filteredAttributes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200/50 shadow-xs">
                  <SlidersHorizontal className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-zinc-800">No matching filters found</h3>
                  <p className="text-sm text-zinc-500 mt-1">Try refining your keyword query above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {filteredAttributes.map((attr) => {
                    const selectedTerms = localSelections[attr.slug] || [];
                    
                    return (
                      <div 
                        key={attr.slug} 
                        className="bg-white rounded-2xl border border-zinc-200/60 shadow-xs p-5 hover:shadow-md transition-shadow flex flex-col"
                      >
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-3 mb-4">
                          {attr.label}
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto max-h-64 pr-2 space-y-2.5">
                          {attr.terms.map((term) => {
                            const isChecked = selectedTerms.includes(term.value);
                            return (
                              <label 
                                key={term.value} 
                                className="group flex cursor-pointer items-start gap-3 py-0.5"
                                onClick={(e) => { e.preventDefault(); toggleTerm(attr.slug, term.value); }}
                              >
                                <div
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all mt-0.5",
                                    isChecked 
                                      ? "border-primary bg-primary text-white scale-105" 
                                      : "border-zinc-300 bg-white group-hover:border-zinc-400"
                                  )}
                                >
                                  {isChecked && <Check className="h-2.5 w-2.5" />}
                                </div>
                                <span className="text-xs font-semibold text-zinc-600 group-hover:text-zinc-900 leading-snug">
                                  {term.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="bg-white border-t border-zinc-200/60 sticky bottom-0 z-20 py-4 shadow-lg">
            <div className="mx-auto max-w-[1600px] 2xl:max-w-[1850px] px-6 sm:px-8 flex items-center justify-between">
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-rose-600 transition-colors uppercase tracking-wider outline-none cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Reset Filters
              </button>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-zinc-200 px-6 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="rounded-full bg-primary px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-primary/95 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  Apply {totalSelections > 0 && `(${totalSelections})`}
                </button>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
