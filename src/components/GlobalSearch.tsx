"use client";

import { useEffect } from "react";
import { useSearchStore } from "@/lib/useSearchStore";
import { SearchOverlay } from "./SearchOverlay";

export function GlobalSearch() {
  const { isOpen, closeSearch, toggleSearch } = useSearchStore();

  /* Ctrl/Cmd + K global shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSearch();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleSearch]);

  return <SearchOverlay open={isOpen} onClose={closeSearch} />;
}
