"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, SlidersHorizontal, Check, Search, RotateCcw } from "lucide-react";
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

  // Local state for selections
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
    
    // Add selections
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
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900 cursor-pointer"
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
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          
          {/* Header Bar */}
          <div className="border-b border-zinc-100 bg-white sticky top-0 z-20">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-10 py-6 sm:py-8 flex items-center justify-between gap-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-zinc-900 flex items-center gap-3">
                  Filters
                  {totalSelections > 0 && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary tracking-normal normal-case">
                      {totalSelections} active
                    </span>
                  )}
                </h2>
              </div>

              {/* Close Button */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setOpen(false)} 
                  className="rounded-full p-2.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Clean, Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 sm:py-12 bg-white">
            <div className="mx-auto max-w-[1440px] space-y-10 sm:space-y-12">
              
              {/* Premium, Unified Specification Search Bar */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search specifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-zinc-800 outline-none transition-all focus:border-primary focus:bg-white"
                />
              </div>

              {filteredAttributes.length === 0 ? (
                <div className="text-center py-20">
                  <SlidersHorizontal className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">No matching options</h3>
                  <p className="text-xs text-zinc-500 mt-1">Try refining your keyword query above.</p>
                </div>
              ) : (
                <div className="space-y-10 sm:space-y-12">
                  {filteredAttributes.map((attr) => {
                    const selectedTerms = localSelections[attr.slug] || [];
                    
                    return (
                      <div key={attr.slug} className="animate-in fade-in duration-300">
                        {/* Elegant group label */}
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-5">
                          {attr.label}
                        </h3>
                        
                        {/* Clean wrapping chips for terms */}
                        <div className="flex flex-wrap gap-2.5">
                          {attr.terms.map((term) => {
                            const isChecked = selectedTerms.includes(term.value);
                            return (
                              <button
                                key={term.value}
                                onClick={() => toggleTerm(attr.slug, term.value)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border select-none active:scale-[0.98]",
                                  isChecked 
                                    ? "bg-primary border-primary text-white shadow-xs" 
                                    : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100/50"
                                )}
                              >
                                {isChecked && <Check className="h-3 w-3 shrink-0" />}
                                {term.label}
                              </button>
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

          {/* Sticky Bottom Footer Control Bar */}
          <div className="border-t border-zinc-100 bg-white sticky bottom-0 z-20 py-6 sm:py-8 shadow-xs">
            <div className="mx-auto max-w-[1440px] px-6 sm:px-10 flex items-center justify-between">
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-rose-600 transition-colors uppercase tracking-[0.15em] outline-none cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </button>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-xs font-bold text-zinc-700 hover:border-zinc-900 transition-colors cursor-pointer uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="rounded-full bg-primary px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-sm hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Apply Filters {totalSelections > 0 && `(${totalSelections})`}
                </button>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
