"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, Package, Loader2, AlertCircle } from "lucide-react";

// Maximum time to wait for the Stripe webhook to create the WC order (ms).
// Webhooks typically fire within 1–3 s of payment confirmation.
const POLL_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 1_500;

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const pi = searchParams.get("pi") || searchParams.get("payment_intent");          // Stripe PaymentIntent ID
  const directOrder = searchParams.get("order"); // PayPal — order number passed directly

  const [orderNumber, setOrderNumber] = useState<string | null>(
    directOrder ?? null
  );
  const [polling, setPolling] = useState(!!pi && !directOrder);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pi || directOrder) return;

    let elapsed = 0;
    let stopped = false;

    async function poll(isFallback = false) {
      try {
        const url = `/api/checkout/stripe/order-status?pi=${encodeURIComponent(pi!)}${isFallback ? "&fallback=true" : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        if (data.orderId) {
          setOrderNumber(String(data.orderId));
          setPolling(false);
          return;
        }
      } catch {
        // Network hiccup — keep trying
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS && !isFallback) {
        // Timed out normal polling — try one last time with fallback sync to force order creation.
        // This is crucial for local dev without webhook forwarding, or if webhook dropped.
        poll(true);
        return;
      } else if (isFallback) {
         // Fallback also failed.
         setPolling(false);
         setError(true);
         return;
      }

      if (!stopped) {
        setTimeout(() => poll(false), POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => { stopped = true; };
  }, [pi, directOrder]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
      {/* Success icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-6 w-6" />
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl mb-2">
        {orderNumber ? "Order Confirmed" : "Payment Received"}
      </h1>

      <p className="text-sm text-zinc-500 max-w-md mb-6">
        {orderNumber 
          ? "Thank you for your purchase. We've received your order and will begin processing it shortly. A confirmation email has been sent to your inbox."
          : "Thank you for your purchase. Your payment was successful, but we are still verifying the order details. This may take a few moments."}
      </p>

      {/* Order reference */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white px-8 py-5 inline-flex flex-col items-center gap-2 min-w-[220px]">
        {error ? (
           <span className="flex items-center gap-2 text-sm text-amber-600">
             <AlertCircle className="h-4 w-4" />
             Order processing delayed
           </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Order Number
          </span>
        )}

        {polling ? (
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming&hellip;
          </span>
        ) : orderNumber ? (
          <span className="text-xl font-black tracking-wider text-zinc-900">
            #{orderNumber}
          </span>
        ) : (
          <span className="text-sm text-zinc-400 italic">
            Please check your email for order reference.
          </span>
        )}

        {orderNumber && (
          <div className="flex items-center gap-2 mt-1">
            <Package className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">Estimated delivery: 3–5 working days</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          Continue Shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
