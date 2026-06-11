import { getSmartFeaturedProducts, getLatestProducts, Product } from "@/lib/wordpress";
import ProductCard from "@/components/ProductCard";
import { HeroSection } from "@/components/HeroSection";
import { BentoGrid } from "@/components/BentoGrid";
import { MotionProductGrid } from "@/components/MotionProductGrid";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discount Quality Products | Light Bulbs, Electricals, Magazines & Collectibles",
  description:
    "Shop 14,000+ discounted products: premium lighting, electric fittings, computing, rare coins & stamps, DVDs, and magazines. Free UK delivery.",
  openGraph: {
    title: "Discount Quality Products | Light Bulbs, Electricals, Magazines & Collectibles",
    description:
      "Shop 14,000+ discounted products: premium lighting, electric fittings, computing, rare coins & stamps, DVDs, and magazines.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Discount Quality Products — 14,000+ Discounted Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: "https://discountqualityproducts.co.uk",
  },
};

export const revalidate = 2592000; // 30 days — data freshness is handled by unstable_cache on the underlying functions

export default async function Home() {
  let products: Product[] = [];
  let newArrivals: Product[] = [];
  let featuredError: string | null = null;
  let newArrivalsError: string | null = null;

  // Fetch Featured Products and New Arrivals in Parallel to reduce latency
  try {
    const [featuredResult, latestResult] = await Promise.allSettled([
      getSmartFeaturedProducts(),
      getLatestProducts(6),
    ]);

    if (featuredResult.status === "fulfilled") {
      products = featuredResult.value;
    } else {
      console.error("Home Page Featured Fetch Error:", featuredResult.reason);
      featuredError = featuredResult.reason?.message || "Failed to fetch featured products";
    }

    if (latestResult.status === "fulfilled") {
      newArrivals = latestResult.value;
    } else {
      console.error("Home Page New Arrivals Fetch Error:", latestResult.reason);
      newArrivalsError = latestResult.reason?.message || "Failed to fetch new arrivals";
    }
  } catch (e: any) {
    console.error("Home Page Parallel Fetch Error:", e);
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
      <main id="products" className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 sm:px-8 pt-24 pb-24 md:px-12 2xl:px-16 scroll-mt-32">
        <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Featured Products
            </h2>
            <p className="max-w-2xl text-lg text-zinc-500">
              Highlights from across our major departments.
            </p>
          </div>
          <Link href="/shop" className="flex items-center gap-2 text-sm font-bold text-zinc-900 hover:underline">
            View All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center mb-24">
            <h3 className="text-lg font-bold text-red-800">Featured Products Connection Error</h3>
            <p className="mt-2 text-red-600 text-sm">
              The database timed out loading this section. Refreshing the browser or clearing the cache should resolve this.
            </p>
          </div>
        ) : products.length > 0 ? (
          <MotionProductGrid>
            {products.slice(0, 6).map((product, idx) => (
              <div key={`featured-${product.databaseId}`} className={idx === 5 ? "xl:hidden" : ""}>
                <ProductCard product={product} priority={idx < 2} />
              </div>
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

        {newArrivalsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h3 className="text-lg font-bold text-red-800">New Arrivals Connection Error</h3>
            <p className="mt-2 text-red-600 text-sm">
              The server was slow fetching fresh arrivals. Please check back shortly.
            </p>
          </div>
        ) : newArrivals.length > 0 ? (
          <MotionProductGrid>
            {newArrivals.slice(0, 6).map((product, idx) => (
              <div key={`new-${product.databaseId}`} className={idx === 5 ? "xl:hidden" : ""}>
                <ProductCard product={product} priority={idx < 2} />
              </div>
            ))}
          </MotionProductGrid>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-100 bg-zinc-50/30">
            <p className="text-lg font-medium text-zinc-500">
              Fresh arrivals are loading soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}