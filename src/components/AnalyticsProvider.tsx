"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

export function AnalyticsProvider() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem("dqp_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    } else if (consent === "granted") {
      updateConsent(true);
    }
  }, []);

  const updateConsent = (granted: boolean) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
        ad_storage: granted ? "granted" : "denied",
        ad_user_data: granted ? "granted" : "denied",
        ad_personalization: granted ? "granted" : "denied",
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem("dqp_cookie_consent", "granted");
    updateConsent(true);
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem("dqp_cookie_consent", "denied");
    updateConsent(false);
    setShowBanner(false);
  };

  if (!mounted || !showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 z-[9999] animate-in slide-in-from-bottom-8 duration-300">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Cookie Consent</h3>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
            We use cookies to improve your experience, analyze site traffic, and support personalized marketing. Please accept or reject cookies. Read our{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleReject}
              className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all text-center"
            >
              Reject All
            </button>
            <button
              onClick={handleAccept}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-white text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all text-center"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
