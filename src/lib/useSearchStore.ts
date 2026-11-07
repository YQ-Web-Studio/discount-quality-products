"use client";

import { create } from "zustand";
import { PRODUCT_COUNT_LABEL } from "@/lib/wordpress";

interface SearchStore {
  isOpen: boolean;
  productCountLabel: string;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setProductCountLabel: (label: string) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  isOpen: false,
  productCountLabel: PRODUCT_COUNT_LABEL,
  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false }),
  toggleSearch: () => set((state) => ({ isOpen: !state.isOpen })),
  setProductCountLabel: (label: string) => set({ productCountLabel: label }),
}));
