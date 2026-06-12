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
  itemsByUser: Record<string, RecentlyViewedItem[]>;
  add: (userId: string | number | undefined, product: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clear: (userId: string | number | undefined) => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      itemsByUser: {},
      add: (userId, product) => {
        const key = userId ? `user_${userId}` : "guest";
        set((state) => {
          const now = Date.now();
          const userItems = state.itemsByUser[key] || [];
          // Remove if it already exists to move it to the top
          const filtered = userItems.filter((i) => i.databaseId !== product.databaseId);
          // Add to top, keep only last 10
          const updatedItems = [{ ...product, viewedAt: now }, ...filtered].slice(0, 10);
          return {
            itemsByUser: {
              ...state.itemsByUser,
              [key]: updatedItems,
            },
          };
        });
      },
      clear: (userId) => {
        const key = userId ? `user_${userId}` : "guest";
        set((state) => ({
          itemsByUser: {
            ...state.itemsByUser,
            [key]: [],
          },
        }));
      },
    }),
    {
      name: "dqp-recently-viewed-v2",
    }
  )
);
