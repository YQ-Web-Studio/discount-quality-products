import { getProductBySlug, getProductSlugs } from "@/lib/wordpress";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart, Tag } from "lucide-react";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getProductSlugs(50);
  return slugs.map((slug) => ({
    slug,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 py-4">
        <div className="container mx-auto px-4">
          <a href="/" className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image Section */}
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100">
            {product.image ? (
              <Image
                src={product.image.sourceUrl}
                alt={product.image.altText || product.name}
                width={800}
                height={800}
                className="h-full w-full object-cover object-center"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-400">
                No image available
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            <div className="mb-4 inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800 w-fit">
              <Tag className="mr-1 h-3 w-3" />
              In Stock
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
              {product.name}
            </h1>
            
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-extrabold text-zinc-900">
                {product.price || 'N/A'}
              </span>
              {product.regularPrice && product.regularPrice !== product.price && (
                <span className="ml-4 text-xl text-zinc-500 line-through">
                  {product.regularPrice}
                </span>
              )}
            </div>

            <div className="mt-8 space-y-6">
              <div 
                className="prose prose-zinc max-w-none text-zinc-600"
                dangerouslySetInnerHTML={{ __html: product.shortDescription || '' }}
              />

              <div className="flex flex-col gap-4 pt-8">
                <button className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white transition-all hover:bg-zinc-700">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Basket
                </button>
                <p className="text-center text-xs text-zinc-500">
                  Free UK delivery on orders over £50. Easy 30-day returns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
