"use client";

import { Product } from "@/lib/wordpress";
import ProductCard from "./ProductCard";

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  // If no related items are found, we don't render the section
  if (!products || products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-zinc-100 pt-16 pb-24">
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 md:px-12 2xl:px-16">
        {/* Heading consistent with other site rows */}
        <div className="mb-12 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            You may also like
          </h2>
          <p className="max-w-2xl text-lg text-zinc-500">
            Discover more engineered pieces from this collection
          </p>
        </div>

        {/* Standard responsive grid for product discovery */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={`related-${product.id}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
