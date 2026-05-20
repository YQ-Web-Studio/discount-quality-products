"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ─── Types ─── */
export interface BasketItem {
  /**
   * The WooCommerce integer databaseId, coerced to a string (e.g. "14").
   * Do NOT use the GraphQL global id (base64) here — it will break REST API calls.
   */
  id: string;
  name: string;
  /** Raw numeric price in GBP, e.g. 2.49 */
  price: number;
  /** Display price string, e.g. "£2.49" */
  priceFormatted: string;
  image?: string;
  quantity: number;
  slug: string;
  manageStock?: boolean;
  stockQuantity?: number | null;
}

interface BasketState {
  items: BasketItem[];
  activeUserId: string | null;
  baskets: Record<string, BasketItem[]>;

  /* Actions */
  setActiveUser: (userId: string | null) => void;
  addItem: (item: Omit<BasketItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearBasket: () => void;

  /* Derived (computed at call-site via getters) */
  itemCount: () => number;
  subtotal: () => number;
  vat: () => number;
  total: (shippingCost?: number) => number;
}

/**
 * Parse a WooCommerce price string like "£2.49" or "2.49" into a float.
 * Returns 0 for unparseable values.
 */
export function parsePriceString(raw?: string | null): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export const useBasket = create<BasketState>()(
  persist(
    (set, get) => ({
      items: [],
      activeUserId: null,
      baskets: {},

      setActiveUser: (userId) => {
        set((state) => {
          if (state.activeUserId === userId) return {};

          const oldKey = state.activeUserId || "guest";
          const updatedBaskets = {
            ...state.baskets,
            [oldKey]: state.items,
          };

          const newKey = userId || "guest";
          const newItems = updatedBaskets[newKey] || [];

          return {
            activeUserId: userId,
            baskets: updatedBaskets,
            items: newItems,
          };
        });
      },

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          const currentQty = existing ? existing.quantity : 0;
          const newQty = currentQty + quantity;
          
          const maxQty = (item.manageStock && item.stockQuantity != null) ? item.stockQuantity : Infinity;
          const finalQty = newQty > maxQty ? maxQty : newQty;

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: finalQty, manageStock: item.manageStock, stockQuantity: item.stockQuantity } : i
              ),
            };
          } else {
            return { items: [...state.items, { ...item, quantity: finalQty }] };
          }
        });
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (existing && existing.manageStock && existing.stockQuantity != null && quantity > existing.stockQuantity) {
            quantity = existing.stockQuantity;
          }
          return {
            items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
          };
        });
      },

      clearBasket: () => set({ items: [] }),

      /* ─── Derived getters ─── */
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      /** VAT extracted from VAT-inclusive prices: total ÷ 6 (equivalent to 20/120) */
      vat: () => get().subtotal() / 6,

      /** Prices are VAT-inclusive, so total = subtotal + shipping only */
      total: (shippingCost = 0) => get().subtotal() + shippingCost,
    }),
    {
      name: "dqp-basket", // localStorage key
      version: 2, // Bump version to trigger migration for base64 ID fix
      migrate(persistedState: any, version: number) {
        // v1 → v2: Decode any stale base64 WPGraphQL global IDs (e.g. "cG9zdDoxNA==")
        // to clean numeric databaseId strings (e.g. "14"). Drop items with unrecognisable IDs.
        if (version < 2 && persistedState?.items) {
          persistedState.items = persistedState.items
            .map((item: BasketItem) => {
              if (/^\d+$/.test(item.id)) return item; // Already a clean numeric ID
              try {
                const decoded = Buffer.from(item.id, "base64").toString("utf8");
                const match = decoded.match(/:(\d+)$/);
                if (match) return { ...item, id: match[1] };
              } catch {
                // Fall through — drop the item
              }
              console.warn(`[basket] Dropped basket item with unrecognisable ID: "${item.id}"`);
              return null;
            })
            .filter(Boolean);
        }
        
        // Ensure baskets object exists
        if (!persistedState.baskets) {
          persistedState.baskets = {};
        }
        
        return persistedState;
      },
    }
  )
);
