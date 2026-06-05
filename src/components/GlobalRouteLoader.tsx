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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/60 pointer-events-auto animate-in fade-in duration-150">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
    </div>
  );
}
