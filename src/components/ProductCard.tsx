"use client";

import Image from 'next/image';
import { Product } from '@/lib/wordpress';
import { Star, Box, Heart, Loader2, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import type { MouseEvent } from 'react';
import { useBasket, parsePriceString } from '@/lib/useBasket';
import { useMiniCart } from '@/lib/useMiniCart';
import { useWishlist } from '@/lib/useWishlist';
import { PRODUCT_SHIMMER } from '@/lib/shimmer';
import { generateSeoAltText } from '@/lib/seo-utils';
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const displayPrice = product.price || product.regularPrice || 'N/A';
  const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK' || product.stockStatus === 'outofstock' || (product.manageStock && product.stockQuantity === 0);
  const currentBasketQty = useBasket((s) => s.items.find((i) => i.id === String(product.databaseId))?.quantity || 0);
  const maxAvailable = (product.manageStock && product.stockQuantity != null) ? product.stockQuantity : Infinity;
  const isLimitReached = currentBasketQty >= maxAvailable;
  
  const addItem = useBasket((s) => s.addItem);
  const openMiniCart = useMiniCart((s) => s.open);
  const { isWishlisted, isPending, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.databaseId);
  const wishlistPending = isPending(product.databaseId);

  const packMatch = product.name.match(/^(\d+)x\s/i);
  const packLabel = packMatch && packMatch[1] !== "1" ? `${packMatch[1]} Pack` : null;

  const getAttr = (name: string) => 
    product.attributes?.nodes?.find(a => a.name.toLowerCase() === name.toLowerCase())?.options[0];

  const fitting = getAttr('fitting');
  const basketPrice = parsePriceString(product.price || product.regularPrice);

  function handleQuickAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || isLimitReached) {
      if (isLimitReached) {
        window.alert('You have reached the maximum available limit for this item.');
      }
      return;
    }

    const item = {
      id: String(product.databaseId),
      name: product.name,
      price: basketPrice,
      priceFormatted: displayPrice,
      image: product.image?.sourceUrl,
      slug: product.slug,
      manageStock: product.manageStock,
      stockQuantity: product.stockQuantity,
    };

    addItem(item, 1);
    
    if (wishlisted) {
      void toggleWishlist(product.databaseId).catch(() => undefined);
    }
    
    openMiniCart({ ...item, quantity: 1 });
  }

  function handleWishlistClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    void toggleWishlist(product.databaseId).catch(() => undefined);
  }

  return (
    <motion.div 
      className="group relative flex flex-col"
    >
      {/* img-shimmer provides the animated sweep while the image is loading */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl img-shimmer">
        {product.image?.sourceUrl ? (
          <Image
            src={product.image.sourceUrl}
            alt={product.image.altText || generateSeoAltText(product.name, product.productCategories?.nodes?.[0]?.name)}
            fill
            /**
             * sizes tells the browser how wide this image will actually render
             * so it fetches the smallest adequate srcset candidate:
             *   mobile  (<640px)  → full viewport width
             *   tablet  (<1024px) → ~50vw (2-col grid)
             *   desktop           → ~25vw (4-col grid)
             */
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            priority={priority}
            placeholder="blur"
            blurDataURL={PRODUCT_SHIMMER}
          />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50">
              <Box className="h-8 w-8 text-zinc-200" />
              <span className="mt-2 text-[10px] font-medium uppercase tracking-tighter text-zinc-300">
                No Preview
              </span>
            </div>
          )}

        {/* Wishlist Button (Top Right) */}
        <div className="absolute right-3 top-3 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 group/wishlist">
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-pressed={wishlisted}
            aria-label={
              wishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-xl ring-1 ring-white/50 backdrop-blur-md transition-all duration-200"
          >
            {wishlistPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  wishlisted ? "fill-zinc-950 text-zinc-950" : "group-hover/wishlist:fill-zinc-950"
                )}
              />
            )}
          </button>
        </div>

        {/* Blur Overlay (Bottom) */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/20 to-transparent backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none hidden lg:block" />

        {/* Add to Basket Bar (Floating Bottom) */}
        <div className="absolute inset-x-3 bottom-3 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out hidden lg:block">
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isLimitReached}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur-sm transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {isOutOfStock ? (
              "Sold Out"
            ) : isLimitReached ? (
              "Limit Reached"
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                {wishlisted ? "Move to Basket" : "Add to Basket"}
              </>
            )}
          </button>
        </div>
        
        {/* Attribute Badges on Image */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-30">
          {isOutOfStock ? (
            <Badge className="bg-red-600 backdrop-blur-sm text-[10px] h-6 px-2.5 border-none shadow-sm uppercase font-bold text-white w-fit">
              Sold Out
            </Badge>
          ) : packLabel && (
            <div className="flex h-7 items-center justify-center rounded-md bg-white/90 px-3 text-[11px] font-extrabold tracking-tight text-zinc-900 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md w-fit">
              {packLabel}
            </div>
          )}
        </div>
      </div>

      <a href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-label={`View ${product.name}`} />

      <div className="flex flex-col pt-5">
        {fitting && (
          <span className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {fitting} Fitting
          </span>
        )}
        
        <h3 className="text-sm font-medium text-zinc-900 line-clamp-2">
          {product.name}
        </h3>

        <p className="mt-2 text-base font-bold tracking-tight text-zinc-900">
          {displayPrice}
        </p>
      </div>
    </motion.div>
  );
}
