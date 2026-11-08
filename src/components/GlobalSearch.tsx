"use client";

import { useEffect } from "react";
import { useSearchStore } from "@/lib/useSearchStore";
import { SearchOverlay } from "./SearchOverlay";

export function GlobalSearch() {
  const { isOpen, closeSearch, toggleSearch, setProductCountLabel } = useSearchStore();

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

  /* Refresh dynamic product count on client mount */
  useEffect(() => {
    fetch("/api/products/count")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.label) {
          setProductCountLabel(data.label);
        }
      })
      .catch(() => {});
  }, [setProductCountLabel]);

  return <SearchOverlay open={isOpen} onClose={closeSearch} />;
}
