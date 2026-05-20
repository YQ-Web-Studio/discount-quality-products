'use server';

import { searchProducts } from "@/lib/wordpress";

export async function searchProductsAction(query: string) {
  if (!query || query.length < 2) return [];
  try {
    return await searchProducts(query, 8);
  } catch (error) {
    console.error("Search Action Error:", error);
    return [];
  }
}
