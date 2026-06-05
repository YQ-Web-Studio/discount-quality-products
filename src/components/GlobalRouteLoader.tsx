"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/70 backdrop-blur-md pointer-events-auto">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-2xl border border-zinc-100/80 animate-in fade-in zoom-in duration-200">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-semibold text-zinc-900">Loading page...</span>
      </div>
    </div>
  );
}
