"use client";

import { create } from "zustand";
import { BasketItem } from "@/lib/useBasket";

interface MiniCartState {
  isOpen: boolean;
  lastAddedItem: BasketItem | null;
  open: (item?: BasketItem) => void;
  close: () => void;
}

export const useMiniCart = create<MiniCartState>()((set) => ({
  isOpen: false,
  lastAddedItem: null,
  open: (item) => set({ isOpen: true, lastAddedItem: item ?? null }),
  close: () => set({ isOpen: false }),
}));
