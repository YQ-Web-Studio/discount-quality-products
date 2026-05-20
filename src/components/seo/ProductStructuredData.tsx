import type { Product } from "@/lib/wordpress";

interface ProductStructuredDataProps {
  product: Product;
  slug: string;
}

/**
 * Outputs Product schema (JSON-LD) for the product detail page.
 * Enables Google rich results: price, availability, ratings in SERPs.
 * Must be a Server Component — no "use client" directive.
 */
export function ProductStructuredData({ product, slug }: ProductStructuredDataProps) {
  const baseUrl = "https://discountqualityproducts.co.uk";
  const productUrl = `${baseUrl}/products/${slug}`;

  // Parse GBP price string like "£12.99" -> "12.99"
  const rawPrice = product.price || product.regularPrice;
  const numericPrice = rawPrice?.replace(/[^0-9.]/g, "") ?? undefined;

  // Map WooCommerce stock status to Schema.org ItemAvailability
  const availabilityMap: Record<string, string> = {
    IN_STOCK: "https://schema.org/InStock",
    instock: "https://schema.org/InStock",
    OUT_OF_STOCK: "https://schema.org/OutOfStock",
    outofstock: "https://schema.org/OutOfStock",
    ON_BACKORDER: "https://schema.org/BackOrder",
    onbackorder: "https://schema.org/BackOrder",
  };
  const availability =
    availabilityMap[product.stockStatus ?? ""] ??
    "https://schema.org/InStock";

  // Collect all image URLs for the schema
  const images: string[] = [];
  if (product.image?.sourceUrl) images.push(product.image.sourceUrl);
  product.galleryImages?.nodes?.forEach((img) => {
    if (img.sourceUrl && !images.includes(img.sourceUrl)) {
      images.push(img.sourceUrl);
    }
  });

  const category = product.productCategories?.nodes?.[0];

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.shortDescription?.replace(/<[^>]*>/g, "").slice(0, 500) ||
      product.description?.replace(/<[^>]*>/g, "").slice(0, 500) ||
      `${product.name} from Discount Quality Products.`,
    url: productUrl,
    image: images.length > 0 ? images : undefined,
    brand: {
      "@type": "Brand",
      name: "Discount Quality Products",
    },
    ...(category && {
      category: category.name,
    }),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "GBP",
      ...(numericPrice && { price: numericPrice }),
      availability,
      seller: {
        "@type": "Organization",
        name: "Discount Quality Products",
      },
      priceValidUntil: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .split("T")[0],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
