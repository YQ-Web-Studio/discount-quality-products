import { getProductBySlug, getProducts } from '@/lib/wordpress';
import type { Product } from '@/lib/wordpress';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  Tag,
  Star,
  Package,
} from 'lucide-react';
import { AddToCartControls } from '@/components/AddToCartControls';
import { ProductDescription } from '@/components/ProductDescription';
import { ProductAttributes } from '@/components/ProductAttributes';
import { ProductGallery } from '@/components/ProductGallery';
import { RelatedProducts } from '@/components/RelatedProducts';
import { RecentlyViewedTracker } from '@/components/RecentlyViewedTracker';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { ProductStructuredData } from '@/components/seo/ProductStructuredData';
import type { Metadata } from 'next';

// ─── ISR: render all slugs on-demand (avoids pre-building 25k pages at build time).
// dynamicParams defaults to true, so any unrecognised slug is fetched live and then
// cached by Next.js for 3 600 s (set on the underlying fetch in wpFetch).
export async function generateStaticParams() {
  return []; // no build-time pre-rendering; all pages rendered on first visit
}

// ─── Per-page metadata ─────────────────────────────────────────────────────────
export async function generateMetadata(
  props: PageProps<'/products/[slug]'>
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: 'Product Not Found | Discount Quality Products' };
  }

  const description =
    product.shortDescription?.replace(/<[^>]*>/g, "").trim().slice(0, 155) ||
    `Buy ${product.name} from Discount Quality Products. Premium quality, competitive prices.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.image?.sourceUrl
        ? [{ url: product.image.sourceUrl, width: 800, height: 800, alt: product.name }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: product.image?.sourceUrl ? [product.image.sourceUrl] : [],
    },
    alternates: {
      canonical: `https://discountqualityproducts.co.uk/products/${slug}`,
    },
  };
}

// ─── Trust signals rendered below the CTA ─────────────────────────────────────
const trustItems = [
  { icon: ShieldCheck, label: 'Secure Checkout' },
  { icon: Truck, label: 'International Shipping' },
  { icon: RotateCcw, label: '30-Day Returns' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductPage(props: PageProps<'/products/[slug]'>) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const categories = product.productCategories?.nodes ?? [];
  
  // Fetch related products from the same category using the established getProducts function
  let relatedProducts: Product[] = [];
  if (categories[0]) {
    const relatedResponse = await getProducts(10, null, categories[0].slug);
    relatedProducts = relatedResponse.products
      .filter(p => p.databaseId !== product.databaseId)
      .slice(0, 5);
      
    // Fallback: If the category only has this single product (common in dev environments),
    // fetch general products so the row still renders and aids discovery.
    if (relatedProducts.length === 0) {
      const fallbackResponse = await getProducts(10);
      relatedProducts = fallbackResponse.products
        .filter(p => p.databaseId !== product.databaseId)
        .slice(0, 5);
    }
  }

  // Helpers
  const getAttr = (name: string) =>
    product.attributes?.nodes?.find((a) =>
      a.name.toLowerCase() === name.toLowerCase()
    )?.options[0];

  const condition = getAttr('condition');
  const rarity = getAttr('rarity');
  const fitting = getAttr('fitting');

  const hasSale =
    product.regularPrice &&
    product.price &&
    product.regularPrice !== product.price;

  // Use full description if available, fall back to shortDescription
  const descriptionHtml =
    product.description || product.shortDescription || '';

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 pt-8 md:px-12 2xl:px-16">
        <Link
          href="/#products"
          id="pdp-back-link"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalogue
        </Link>
      </div>

      <RecentlyViewedTracker product={product} />
      <ProductStructuredData product={product} slug={slug} />

      {/* ── Main content ── */}
      <main className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 pb-8 pt-8 md:px-12 2xl:px-16">
        
        {/* TOP SECTION: Gallery and Buy Box */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-16 xl:gap-24 lg:items-start">
          
          {/* LEFT: Image gallery */}
          <div className="flex flex-col gap-6 lg:col-span-6 order-1">
            <ProductGallery
              mainImage={product.image ?? null}
              galleryImages={product.galleryImages?.nodes ?? []}
              productName={product.name}
              badges={
                <>
                  {rarity && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm shadow-sm">
                      <Star className="h-3 w-3" />
                      {rarity}
                    </span>
                  )}
                  {condition && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 ring-1 ring-zinc-200 backdrop-blur-sm shadow-sm">
                      <Package className="h-3 w-3" />
                      {condition}
                    </span>
                  )}
                </>
              }
              saleRibbon={
                hasSale ? (
                  <div className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                    SALE
                  </div>
                ) : null
              }
            />

            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat.slug}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600"
                  >
                    <Tag className="h-3 w-3 text-primary" />
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product details (Buy Box) */}
          <div className="flex flex-col lg:col-span-6 relative order-2 mt-4 lg:mt-0">
            <div className="sticky top-24">
              <Breadcrumbs 
                paths={[
                  { label: 'Products', href: '/#products' },
                  ...(categories[0] ? [{ label: categories[0].name, href: `/shop?category=${categories[0].slug}` }] : [])
                ]} 
              />

              {fitting && (
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {fitting} Fitting
                </p>
              )}

              <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
                {product.name}
              </h1>

              <div className="mt-5 flex items-baseline gap-4">
                <span className="text-3xl font-extrabold text-zinc-900">
                  {product.price || 'POA'}
                </span>
                {hasSale && (
                  <span className="text-xl font-medium text-zinc-400 line-through">
                    {product.regularPrice}
                  </span>
                )}
                {hasSale && (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-semibold text-red-600">
                    Save {product.regularPrice} → {product.price}
                  </span>
                )}
              </div>

              <hr className="my-6 border-zinc-100" />

              <AddToCartControls
                productId={String(product.databaseId)}
                productName={product.name}
                productPrice={product.price ?? undefined}
                productImage={product.image?.sourceUrl}
                productSlug={product.slug}
                stockStatus={product.stockStatus}
                manageStock={product.manageStock}
                stockQuantity={product.stockQuantity}
              />

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-zinc-100 pt-8">
                {trustItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Description and Specifications (Desktop) */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-16 xl:gap-24 mt-12 pt-12 border-t border-zinc-100">
          <div className="lg:col-span-6">
            {descriptionHtml ? (
              <ProductDescription htmlContent={descriptionHtml} />
            ) : (
              <p className="text-sm text-zinc-400 italic">
                No description available for this product.
              </p>
            )}
          </div>
          <div className="lg:col-span-6">
            <ProductAttributes attributes={product.attributes?.nodes || []} />
          </div>
        </div>

        {/* MOBILE SECTION: Description and Specifications (Stacked) */}
        <div className="flex flex-col gap-8 lg:hidden mt-8">
          {descriptionHtml ? (
            <ProductDescription htmlContent={descriptionHtml} />
          ) : (
            <p className="text-sm text-zinc-400 italic">
              No description available for this product.
            </p>
          )}
          <ProductAttributes attributes={product.attributes?.nodes || []} />
        </div>
      </main>

      <RelatedProducts products={relatedProducts} />
    </div>
  );
}
