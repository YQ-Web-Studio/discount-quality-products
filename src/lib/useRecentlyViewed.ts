"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedItem {
  databaseId: number;
  name: string;
  slug: string;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: string | null;
  image: {
    sourceUrl: string;
    altText?: string;
  } | null;
  viewedAt: number;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  add: (product: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (product) => {
        set((state) => {
          const now = Date.now();
          // Remove if it already exists to move it to the top
          const filtered = state.items.filter((i) => i.databaseId !== product.databaseId);
          // Add to top, keep only last 10
          return {
            items: [{ ...product, viewedAt: now }, ...filtered].slice(0, 10),
          };
        });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: "dqp-recently-viewed",
    }
  )
);
