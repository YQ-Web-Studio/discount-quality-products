'use client';

import { useEffect } from 'react';
import { sendGAEvent } from '@next/third-parties/google';
import { parsePriceString } from '@/lib/useBasket';

interface ProductViewTrackerProps {
  productId: string;
  productName: string;
  productPrice?: string;
  productSku?: string;
}

/**
 * Fires a GA4 `view_item` event once when the product detail page mounts.
 * This is a minimal client component kept separate from the server-rendered
 * page so that the page itself can remain an async Server Component.
 */
export function ProductViewTracker({
  productId,
  productName,
  productPrice,
  productSku,
}: ProductViewTrackerProps) {
  useEffect(() => {
    const price = parsePriceString(productPrice);

    sendGAEvent('event', 'view_item', {
      currency: 'GBP',
      value: price,
      items: [
        {
          item_id: productSku || productId,
          item_name: productName,
          price,
          quantity: 1,
        },
      ],
    });
  // Run once on mount — intentionally no deps beyond stable identifiers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders nothing — tracking-only component.
  return null;
}
