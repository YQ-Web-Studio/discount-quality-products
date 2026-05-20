"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, SlidersHorizontal, ChevronDown, Check, Search } from "lucide-react";
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Parse active parameters from URL on mount and whenever URL changes
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

  // Dynamically extract available attributes from currently loaded products
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
        return attr; // Show the whole group if the category name matches
      }
      if (matchTerms.length > 0) {
        return { ...attr, terms: matchTerms }; // Show only matching terms if category doesn't match
      }
      
      return null;
    }).filter(Boolean) as typeof availableAttributes;
  }, [availableAttributes, searchQuery]);

  const toggleGroup = (slug: string) => {
    setExpandedGroups((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

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

  // If no dynamic attributes available for this view, we can just hide the button entirely
  if (availableAttributes.length === 0) return null;

  const totalSelections = Object.values(localSelections).reduce((acc, terms) => acc + terms.length, 0);

  return (
    <>
      <button
        onClick={() => {
          setLocalSelections(activeParams);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-semibold text-zinc-600 transition-all hover:border-zinc-400 hover:text-zinc-900"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {totalSelections > 0 && (
          <span className="ml-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white">
            {totalSelections}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28 sm:p-6 sm:pt-32">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          
          {/* Modal Container */}
          <div className="relative z-10 flex max-h-[calc(100vh-9rem)] w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl rounded-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
              <h2 className="text-lg font-bold text-zinc-900">All Filters</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 transition-colors hover:bg-zinc-100">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="border-b border-zinc-100 px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search filters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {filteredAttributes.map((attr) => {
                const isExpanded = expandedGroups[attr.slug] ?? true; // Default expanded
                const selectedTerms = localSelections[attr.slug] || [];
                
                return (
                  <div key={attr.slug} className="border-b border-zinc-100 py-4 last:border-0">
                    <button
                      onClick={() => toggleGroup(attr.slug)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="text-sm font-bold text-zinc-900">{attr.label}</span>
                      <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-4 flex flex-col gap-3">
                        {attr.terms.map((term) => {
                          const isChecked = selectedTerms.includes(term.value);
                          return (
                            <label 
                              key={term.value} 
                              className="group flex cursor-pointer items-center gap-3"
                              onClick={(e) => { e.preventDefault(); toggleTerm(attr.slug, term.value); }}
                            >
                              <div
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                  isChecked 
                                    ? "border-primary bg-primary text-white" 
                                    : "border-zinc-300 bg-white group-hover:border-zinc-400"
                                )}
                              >
                                {isChecked && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900">
                                {term.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleClearAll}
                  className="text-sm font-semibold text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApply}
                  className="rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-xl transition-colors hover:bg-primary/90"
                >
                  Apply Filters
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
