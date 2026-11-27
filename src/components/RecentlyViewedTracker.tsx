"use client";

import { useEffect } from "react";
import { useRecentlyViewed, type RecentlyViewedItem } from "@/lib/useRecentlyViewed";
import { useAuth } from "@/context/AuthContext";

type RecentlyViewedProductInput = Omit<RecentlyViewedItem, "viewedAt">;

interface Props {
  product: RecentlyViewedProductInput;
}

export function RecentlyViewedTracker({ product }: Props) {
  const { user } = useAuth();
  const add = useRecentlyViewed((state) => state.add);

  useEffect(() => {
    add(user?.id, {
      databaseId: product.databaseId,
      name: product.name,
      slug: product.slug,
      price: product.price ?? null,
      regularPrice: product.regularPrice ?? null,
      salePrice: product.salePrice ?? null,
      stockStatus: product.stockStatus ?? null,
      image: product.image
        ? { sourceUrl: product.image.sourceUrl, altText: product.image.altText || "" }
        : null,
    });
  }, [product, add, user?.id]);

  return null;
}
