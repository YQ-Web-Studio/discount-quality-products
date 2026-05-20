"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to determine if the component has mounted on the client.
 * Useful for resolving hydration mismatches where server and client
 * initial renders must match.
 */
export function useIsMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
