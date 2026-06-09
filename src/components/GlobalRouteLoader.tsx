"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const styleContent = `
  body.route-loading {
    cursor: wait !important;
  }
  body.route-loading a, body.route-loading button {
    cursor: wait !important;
  }
  .link-loading-active {
    opacity: 0.6 !important;
    pointer-events: none !important;
    transition: opacity 150ms ease-in-out !important;
  }
`;

export function GlobalRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Auto-dismiss the loader when the page pathname or search parameters change
  useEffect(() => {
    setLoading(false);
    document.body.classList.remove("route-loading");
    document.querySelectorAll(".link-loading-active").forEach((el) => {
      el.classList.remove("link-loading-active");
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const startLoading = () => {
      setLoading(true);
      document.body.classList.add("route-loading");
    };
    const stopLoading = () => {
      setLoading(false);
      document.body.classList.remove("route-loading");
      document.querySelectorAll(".link-loading-active").forEach((el) => {
        el.classList.remove("link-loading-active");
      });
    };

    window.addEventListener("trigger-global-loading", startLoading);
    window.addEventListener("stop-global-loading", stopLoading);

    // Global click listener to intercept anchor tags and trigger loading immediately
    const handleAnchorClick = (e: MouseEvent) => {
      // Find the nearest parent anchor tag
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Skip external links, mailto/tel, target="_blank", downloads, and hashes
      const isExternal =
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("sms:");

      let isInternal = !isExternal;
      if (isExternal) {
        try {
          const url = new URL(href);
          if (url.origin === window.location.origin) {
            isInternal = true;
          }
        } catch (_) {}
      }

      const isModified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
      const hasTargetBlank = target.target === "_blank";
      const isDownload = target.hasAttribute("download");
      const isHash = href.startsWith("#") || (href.includes("#") && href.split("#")[0] === window.location.pathname);

      if (isInternal && !isModified && !hasTargetBlank && !isDownload && !isHash) {
        const currentUrl = window.location.pathname + window.location.search;
        let targetUrl = href;
        try {
          if (href.startsWith("http")) {
            const url = new URL(href);
            targetUrl = url.pathname + url.search;
          }
        } catch (_) {}

        if (targetUrl !== currentUrl && targetUrl !== "") {
          target.classList.add("link-loading-active");
          startLoading();
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      window.removeEventListener("trigger-global-loading", startLoading);
      window.removeEventListener("stop-global-loading", stopLoading);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      {loading && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/10 backdrop-blur-[1px] pointer-events-auto animate-in fade-in duration-150">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
        </div>
      )}
    </>
  );
}


