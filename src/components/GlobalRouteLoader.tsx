"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  const [showSpinner, setShowSpinner] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = (spinner: boolean) => {
    setShowSpinner(spinner);
    setVisible(true);
    setProgress(0);
    document.body.classList.add("route-loading");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        // Asymptotically approach 90%
        return prev + (90 - prev) * 0.15;
      });
    }, 150);
  };

  const stopLoading = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    document.body.classList.remove("route-loading");
    document.querySelectorAll(".link-loading-active").forEach((el) => {
      el.classList.remove("link-loading-active");
    });

    setTimeout(() => {
      setVisible(false);
      setShowSpinner(false);
    }, 200);
  };

  // Auto-dismiss the loader when the page pathname or search parameters change
  useEffect(() => {
    stopLoading();
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleStartEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const spinner = customEvent.detail !== false;
      startLoading(spinner);
    };

    window.addEventListener("trigger-global-loading", handleStartEvent);
    window.addEventListener("stop-global-loading", stopLoading);

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

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
          const hasSkeleton =
            targetUrl.startsWith("/products/") ||
            targetUrl.startsWith("/shop") ||
            targetUrl.startsWith("/categories/") ||
            targetUrl === "/" ||
            targetUrl === "";

          target.classList.add("link-loading-active");
          startLoading(!hasSkeleton);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("trigger-global-loading", handleStartEvent);
      window.removeEventListener("stop-global-loading", stopLoading);
      document.removeEventListener("click", handleAnchorClick);
    };
  }, [pathname, searchParams]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      
      {/* Sleek top progress bar */}
      {visible && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "3px",
            backgroundColor: "#059669",
            width: `${progress}%`,
            transition: progress === 100 ? "width 200ms ease-out, opacity 150ms ease-in-out" : "width 300ms ease-out",
            opacity: progress === 100 ? 0 : 1,
            zIndex: 99999,
            pointerEvents: "none",
            boxShadow: "0 0 10px #34d399, 0 0 5px #059669",
          }}
        />
      )}

      {/* Full screen spinner (only shown for pages without skeletons) */}
      {visible && showSpinner && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/10 backdrop-blur-[1px] pointer-events-auto animate-in fade-in duration-150">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
        </div>
      )}
    </>
  );
}
