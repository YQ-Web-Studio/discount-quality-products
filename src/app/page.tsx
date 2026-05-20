import { getSmartFeaturedProducts, getLatestProducts, Product } from "@/lib/wordpress";
import ProductCard from "@/components/ProductCard";
import { HeroSection } from "@/components/HeroSection";
import { BentoGrid } from "@/components/BentoGrid";
import { MotionProductGrid } from "@/components/MotionProductGrid";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discount Quality Products | Essentials & Rare Finds",
  description:
    "Shop 25,000+ discounted products: premium electricals, curated collectibles, computing, and more. Professional quality, competitive prices. Shipped worldwide from the UK.",
  openGraph: {
    title: "Discount Quality Products | Essentials & Rare Finds",
    description:
      "Shop 25,000+ discounted products: premium electricals, curated collectibles, computing, and more.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Discount Quality Products — 25,000+ Discounted Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og-image.jpg"],
  },
  alternates: {
    canonical: "https://discountqualityproducts.co.uk",
  },
};

export default async function Home() {
  let products: Product[] = [];
  let newArrivals: Product[] = [];
  let error = null;

  try {
    const [featuredRes, latestProducts] = await Promise.all([
      getSmartFeaturedProducts(),
      getLatestProducts(6)
    ]);
    products = featuredRes;
    newArrivals = latestProducts;
  } catch (e: any) {
    console.error("Home Page Fetch Error:", e);
    error = e.message;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Phase 2: Modern UI Components */}
      <div className="relative z-40">
        <HeroSection />
      </div>
      <div className="relative z-0">
        <BentoGrid />
      </div>

      {/* Featured Products Grid */}
      <main id="products" className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 sm:px-8 pt-12 md:pt-16 pb-24 md:px-12 2xl:px-16 scroll-mt-32">
        <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Featured Products
            </h2>
            <p className="max-w-2xl text-lg text-zinc-500">
              Curated highlights from across our major departments.
            </p>
          </div>
          <Link href="/shop" className="flex items-center gap-2 text-sm font-bold text-zinc-900 hover:underline">
            View All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center mb-24">
            <h3 className="text-lg font-bold text-red-800">Connection Error</h3>
            <p className="mt-2 text-red-600">
              {error}. Please verify the WordPress backend is active.
            </p>
          </div>
        ) : products.length > 0 ? (
          <MotionProductGrid>
            {products.slice(0, 5).map((product, idx) => (
              <ProductCard key={`featured-${product.databaseId}`} product={product} priority={idx < 2} />
            ))}
          </MotionProductGrid>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-100 bg-zinc-50/30 mb-24">
            <p className="text-lg font-medium text-zinc-500">
              The product catalogue is currently being updated.
            </p>
          </div>
        )}

        {/* New Arrivals Grid */}
        <div className="mt-24 mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              New Arrivals
            </h2>
            <p className="max-w-2xl text-lg text-zinc-500">
              Fresh additions to our catalogue.
            </p>
          </div>
          <Link href="/shop?orderby=date&order=desc" className="flex items-center gap-2 text-sm font-bold text-zinc-900 hover:underline">
            View All New <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!error && newArrivals.length > 0 && (
          <MotionProductGrid>
            {newArrivals.slice(0, 5).map((product, idx) => (
              <ProductCard key={`new-${product.databaseId}`} product={product} priority={idx < 2} />
            ))}
          </MotionProductGrid>
        )}
      </main>

    </div>
  );
}
