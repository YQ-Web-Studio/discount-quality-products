import type { MappedProduct } from "@/lib/woocommerce";

export function orderProductsByWishlist(
  products: MappedProduct[],
  wishlistIds: number[]
) {
  const productMap = new Map(
    products.map((product) => [product.databaseId, product])
  );

  return wishlistIds
    .map((id) => productMap.get(id))
    .filter((product): product is MappedProduct => Boolean(product));
}

