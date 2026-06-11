"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      const blockNavigation = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest("a");
        if (link) {
          e.preventDefault();
          e.stopPropagation();
          console.warn("Navigation is disabled in live portfolio preview mode.");
        }
      };

      document.addEventListener("click", blockNavigation, true);
      return () => document.removeEventListener("click", blockNavigation, true);
    }
  }, []);

  return null;
}
