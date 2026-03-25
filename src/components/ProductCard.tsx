import Image from 'next/image';
import { Product } from '@/lib/wordpress';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Format price if it's not already formatted (though WooCommerce usually returns formatted strings)
  const displayPrice = product.price || 'N/A';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all hover:shadow-lg">
      <div className="aspect-square overflow-hidden bg-zinc-100">
        {product.image ? (
          <Image
            src={product.image.sourceUrl}
            alt={product.image.altText || product.name}
            width={400}
            height={400}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-200">
            <span className="text-sm text-zinc-400">No image</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-medium text-zinc-900 line-clamp-2 min-h-[2.5rem]">
          <a href={`/products/${product.slug}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {product.name}
          </a>
        </h3>
        <div className="mt-2 flex flex-1 items-end justify-between">
          <p className="text-lg font-bold text-zinc-900">
            {displayPrice}
          </p>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700">
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
