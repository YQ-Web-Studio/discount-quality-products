"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "@/lib/useSearchStore";

export function SearchCommand() {
  const { openSearch } = useSearchStore();

  return (
    <>
      <button
        onClick={openSearch}
        className="flex h-10 w-full max-w-none items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100/40 backdrop-blur-md px-4 text-sm text-zinc-500 transition-all hover:bg-zinc-100/60 shadow-sm"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">
          <span className="hidden 2xl:inline">Search 13,000+ products...</span>
          <span className="hidden lg:inline 2xl:hidden">Search</span>
          <span className="lg:hidden">Search...</span>
        </span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-tight shadow-xs 2xl:flex">
          (Ctrl / ⌘) + K
        </kbd>
      </button>
    </>
  );
}
