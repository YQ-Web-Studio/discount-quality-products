"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  fetchAccountWishlistIds,
  toggleAccountWishlist,
} from "@/lib/auth-api";

type SessionStatus = "checking" | "authenticated" | "unauthenticated";

interface WishlistStoreState {
  wishlistIds: number[];
  isLoading: boolean;
  error: string | null;
  pendingProductIds: number[];
  setWishlistIds: (ids: number[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addPendingProductId: (productId: number) => void;
  removePendingProductId: (productId: number) => void;
  reset: () => void;
}

const useWishlistStore = create<WishlistStoreState>((set) => ({
  wishlistIds: [],
  isLoading: true,
  error: null,
  pendingProductIds: [],
  setWishlistIds: (wishlistIds) => set({ wishlistIds }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  addPendingProductId: (productId) =>
    set((state) => ({
      pendingProductIds: state.pendingProductIds.includes(productId)
        ? state.pendingProductIds
        : [...state.pendingProductIds, productId],
    })),
  removePendingProductId: (productId) =>
    set((state) => ({
      pendingProductIds: state.pendingProductIds.filter((id) => id !== productId),
    })),
  reset: () =>
    set({
      wishlistIds: [],
      isLoading: false,
      error: null,
      pendingProductIds: [],
    }),
}));

let syncPromise: Promise<number[]> | null = null;
let syncStatus: SessionStatus | null = null;

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not update your wishlist right now.";
}

async function syncWishlist(sessionStatus: SessionStatus) {
  const store = useWishlistStore.getState();

  if (sessionStatus === "checking") {
    return store.wishlistIds;
  }

  if (sessionStatus !== "authenticated") {
    store.reset();
    syncPromise = null;
    syncStatus = sessionStatus;
    return [];
  }

  if (syncPromise && syncStatus === sessionStatus) {
    return syncPromise;
  }

  syncStatus = sessionStatus;

  syncPromise = (async () => {
    store.setIsLoading(true);
    store.setError(null);

    try {
      const ids = await fetchAccountWishlistIds();
      store.setWishlistIds(ids);
      return ids;
    } catch (wishlistError) {
      const message = getFriendlyErrorMessage(wishlistError);
      store.setError(message);
      throw wishlistError instanceof Error
        ? wishlistError
        : new Error(message);
    } finally {
      store.setIsLoading(false);
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function useWishlist() {
  const { sessionStatus, logout } = useAuth();
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const isLoading = useWishlistStore((state) => state.isLoading);
  const error = useWishlistStore((state) => state.error);
  const pendingProductIds = useWishlistStore(
    (state) => state.pendingProductIds
  );

  useEffect(() => {
    void syncWishlist(sessionStatus as SessionStatus).catch(
      async (wishlistError) => {
        if (wishlistError instanceof ApiError && wishlistError.status === 401) {
          await logout();
        }
      }
    );
  }, [sessionStatus, logout]);

  function isWishlisted(productId: number) {
    return wishlistIds.includes(productId);
  }

  function isPending(productId: number) {
    return pendingProductIds.includes(productId);
  }

  async function fetchWishlist() {
    if (sessionStatus !== "authenticated") {
      useWishlistStore.getState().reset();
      return [];
    }

    try {
      return await syncWishlist(sessionStatus as SessionStatus);
    } catch (wishlistError) {
      if (wishlistError instanceof ApiError && wishlistError.status === 401) {
        await logout();
      }

      throw wishlistError instanceof Error
        ? wishlistError
        : new Error("We could not load your wishlist right now.");
    }
  }

  async function toggleWishlist(productId: number) {
    if (sessionStatus !== "authenticated") {
      const message = "Please sign in to manage your wishlist.";
      useWishlistStore.getState().setError(message);
      throw new Error(message);
    }

    if (isPending(productId)) {
      return wishlistIds;
    }

    const store = useWishlistStore.getState();
    const previousWishlist = store.wishlistIds;
    const nextWishlist = previousWishlist.includes(productId)
      ? previousWishlist.filter((id) => id !== productId)
      : [...previousWishlist, productId];

    store.setError(null);
    store.setWishlistIds(nextWishlist);
    store.addPendingProductId(productId);

    try {
      const updatedWishlist = await toggleAccountWishlist(productId);
      store.setWishlistIds(updatedWishlist);
      return updatedWishlist;
    } catch (wishlistError) {
      store.setWishlistIds(previousWishlist);

      const message = getFriendlyErrorMessage(wishlistError);
      store.setError(message);

      if (wishlistError instanceof ApiError && wishlistError.status === 401) {
        await logout();
      }

      throw wishlistError instanceof Error
        ? wishlistError
        : new Error(message);
    } finally {
      store.removePendingProductId(productId);
    }
  }

  return {
    wishlistIds,
    isLoading,
    error,
    isPending,
    isWishlisted,
    fetchWishlist,
    toggleWishlist,
  };
}
