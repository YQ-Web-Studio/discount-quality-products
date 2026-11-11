"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Custom hook to determine if the component has mounted on the client.
 * Useful for resolving hydration mismatches where server and client
 * initial renders must match without triggering setState within an effect.
 */
export function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
