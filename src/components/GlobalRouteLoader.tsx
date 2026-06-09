"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Auto-dismiss the loader when the page pathname or search parameters change
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const startLoading = () => setLoading(true);
    const stopLoading = () => setLoading(false);

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
          setLoading(true);
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

  // Animate the progress bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setVisible(true);
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev; // cap at 90% until finished
          const step = prev < 50 ? 15 : prev < 75 ? 5 : 0.5;
          return prev + step;
        });
      }, 150);
    } else {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200); // match fade out duration
      return () => clearTimeout(timer);
    }
    return () => clearInterval(interval);
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] h-1 w-full pointer-events-none transition-opacity duration-200"
      style={{
        opacity: progress === 100 ? 0 : 1,
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 shadow-[0_0_8px_#10b981,0_0_4px_#14b8a6] transition-all"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? "width 150ms ease-out" : "width 300ms cubic-bezier(0.1, 0.8, 0.1, 1)",
        }}
      />
    </div>
  );
}

