'use client';

import { useState } from 'react';
import { ShoppingCart, Minus, Plus, Check, Loader2, Zap } from 'lucide-react';
import { useBasket, parsePriceString } from '@/lib/useBasket';
import { useMiniCart } from '@/lib/useMiniCart';
import { useRouter } from 'next/navigation';

interface AddToCartControlsProps {
  productId: string;
  productName: string;
  productPrice?: string;
  productImage?: string;
  productSlug: string;
  stockStatus?: string;
}

export function AddToCartControls({
  productId,
  productName,
  productPrice,
  productImage,
  productSlug,
  stockStatus,
}: AddToCartControlsProps) {
  const isOutOfStock = stockStatus === 'OUT_OF_STOCK' || stockStatus === 'outofstock';
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const addItem = useBasket((s) => s.addItem);
  const openMiniCart = useMiniCart((s) => s.open);
  const router = useRouter();

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  function increment() {
    setQuantity((q) => q + 1);
  }

  function handleAdd() {
    if (status !== 'idle' || isBuyingNow) return;
    setStatus('adding');

    const item = {
      id: productId,
      name: productName,
      price: parsePriceString(productPrice),
      priceFormatted: productPrice || 'POA',
      image: productImage,
      slug: productSlug,
    };

    // Optimistic update — instant Zustand state mutation
    addItem(item, quantity);

    // Open flyout with the item that was just added
    openMiniCart({ ...item, quantity });

    // Transition button through adding → added → idle
    setTimeout(() => {
      setStatus('added');
      setTimeout(() => setStatus('idle'), 2000);
    }, 300);

    setQuantity(1);
  }

  async function handleBuyItNow() {
    if (status !== 'idle' || isBuyingNow) return;
    setIsBuyingNow(true);

    try {
      const item = {
        id: productId,
        name: productName,
        price: parsePriceString(productPrice),
        priceFormatted: productPrice || 'POA',
        image: productImage,
        slug: productSlug,
      };

      // Bypass the global state completely
      // Immediate redirect to checkout with query params for direct flow
      router.push(`/checkout?buyNow=${productSlug}&qty=${quantity}`);
    } catch (e) {
      console.error('Failed to process Buy It Now', e);
      setIsBuyingNow(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Quantity Selector */}
      <div className="flex flex-col gap-3">
        <div
          className="inline-flex w-fit items-center rounded-xl border border-zinc-200 bg-white shadow-sm"
          role="group"
          aria-label="Quantity selector"
        >
          <button
            id="pdp-qty-decrement"
            onClick={decrement}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-12 w-12 items-center justify-center rounded-l-xl text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="w-10 select-none text-center text-sm font-semibold text-zinc-900"
          >
            {quantity}
          </span>
          <button
            id="pdp-qty-increment"
            onClick={increment}
            aria-label="Increase quantity"
            className="flex h-12 w-12 items-center justify-center rounded-r-xl text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        </div>

        {/* Action Buttons */}
        {isOutOfStock ? (
          <button
            disabled
            className="flex w-full items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-base font-semibold tracking-tight text-zinc-400 bg-zinc-100 border border-zinc-200 cursor-not-allowed shadow-none"
          >
            Sold Out
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Buy It Now (Dominant) */}
            <button
              id="pdp-buy-now"
              onClick={handleBuyItNow}
              disabled={isBuyingNow || status === 'adding'}
              aria-label={`Buy ${quantity} × ${productName} now`}
              className={`
                flex flex-1 items-center justify-center gap-2.5 rounded-xl px-6 py-3.5
                text-base font-semibold tracking-tight text-white
                shadow-md transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                disabled:cursor-wait disabled:opacity-50
                ${isBuyingNow
                  ? 'bg-primary/80 scale-[0.98]'
                  : 'bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] focus-visible:ring-primary'
                }
              `}
            >
              {isBuyingNow ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Zap className="h-5 w-5 shrink-0" />}
              {isBuyingNow ? 'Processing...' : 'Buy It Now'}
            </button>

            {/* Add to Basket (Secondary) */}
            <button
              id="pdp-add-to-basket"
              onClick={handleAdd}
              disabled={isBuyingNow || status === 'adding'}
              aria-label={`Add ${quantity} × ${productName} to basket`}
              className={`
                flex flex-1 items-center justify-center gap-2.5 rounded-xl px-6 py-3.5
                text-base font-semibold tracking-tight transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                border-2
                disabled:cursor-wait disabled:opacity-50
                ${status === 'added'
                  ? 'scale-[0.98] bg-primary/5 border-primary text-primary'
                  : status === 'adding'
                  ? 'bg-zinc-50 border-zinc-300 text-zinc-500'
                  : 'bg-white border-primary text-primary hover:bg-primary/5 active:scale-[0.98] focus-visible:ring-primary'
                }
              `}
            >
              {status === 'added' ? <Check className="h-5 w-5 shrink-0" /> : status === 'adding' ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <ShoppingCart className="h-5 w-5 shrink-0" />}
              {status === 'added' ? 'Added to Basket' : status === 'adding' ? 'Adding...' : 'Add to Basket'}
            </button>
          </div>
        )}
    </div>
  );
}
