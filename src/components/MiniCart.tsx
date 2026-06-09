"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, Trash2, ArrowRight, Package } from "lucide-react";
import { useMiniCart } from "@/lib/useMiniCart";
import { useBasket } from "@/lib/useBasket";
import { THUMB_SHIMMER } from "@/lib/shimmer";

export function MiniCart() {
  const { isOpen, close } = useMiniCart();
  const items = useBasket((s) => s.items);
  const removeItem = useBasket((s) => s.removeItem);
  const subtotal = useBasket((s) => s.subtotal);
  const router = useRouter();

  // Refresh RSC payload on open to validate stock silently
  useEffect(() => {
    if (isOpen) {
      router.refresh();
    }
  }, [isOpen, router]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-[10000] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping basket"
        className={`fixed right-0 top-0 z-[10001] flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-zinc-900">Your Basket</h2>
            {items.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={close}
            aria-label="Close basket"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-zinc-400">
              <Package className="h-12 w-12 opacity-30" strokeWidth={1} />
              <p className="text-sm font-medium text-zinc-600">Your basket is empty</p>
              <button
                onClick={close}
                className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-100 img-shimmer">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-contain"
                        placeholder="blur"
                        blurDataURL={THUMB_SHIMMER}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-zinc-300" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={close}
                        className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug hover:text-primary transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-900">{item.priceFormatted}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-zinc-100 px-6 py-5 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-bold text-zinc-900">
                £{subtotal().toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 -mt-2">
              VAT included · Shipping calculated at checkout
            </p>

            {/* CTA */}
            <Link
              href="/checkout"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
            >
              Checkout Now
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={close}
              className="w-full text-center text-xs font-medium text-zinc-500 underline-offset-2 hover:underline"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
