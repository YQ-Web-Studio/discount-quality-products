"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Auto-dismiss the loader when the page pathname or search parameters change
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const startLoading = () => setLoading(true);
    const stopLoading = () => setLoading(false);

    window.addEventListener("trigger-global-loading", startLoading);
    window.addEventListener("stop-global-loading", stopLoading);

    return () => {
      window.removeEventListener("trigger-global-loading", startLoading);
      window.removeEventListener("stop-global-loading", stopLoading);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-[3px] w-full overflow-hidden bg-zinc-100/50">
      <div 
        className="h-full bg-emerald-600 rounded-r"
        style={{
          width: '50%',
          animation: 'global-route-loading-bar 1.2s infinite ease-in-out',
        }}
      />
      <style>{`
        @keyframes global-route-loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}
