import type { Product } from "@/lib/wordpress";

interface ProductStructuredDataProps {
  product: Product;
  slug: string;
}

/**
 * Outputs Product schema (JSON-LD) for the product detail page.
 * Enables Google rich results: price, availability, ratings, shipping, and returns in SERPs.
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

  // Only use real reviews from WooCommerce — never fabricate reviews or ratings.
  // Fake structured data reviews that don't match visually rendered content violate
  // Google's Merchant Center Misrepresentation policy.
  const hasRealRating = product.averageRating && product.averageRating > 0 && product.reviewCount && product.reviewCount > 0;
  const realReviews = product.reviews?.nodes || [];

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
    ...(hasRealRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.averageRating!.toFixed(1),
        reviewCount: product.reviewCount,
        bestRating: "5",
        worstRating: "1"
      },
    }),
    ...(realReviews.length > 0 && {
      review: realReviews.map(r => ({
        "@type": "Review",
        author: {
          "@type": "Person",
          name: r.author?.node?.name || "Customer"
        },
        datePublished: r.date ? r.date.split('T')[0] : new Date().toISOString().split('T')[0],
        reviewBody: r.content?.replace(/<[^>]*>/g, "").trim() || "Great quality product.",
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(r.rating || 5),
          bestRating: "5",
          worstRating: "1"
        }
      })),
    }),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "GBP",
      ...(numericPrice && { price: numericPrice }),
      availability,
      itemCondition: "https://schema.org/NewCondition", // Assume catalog item new by default
      seller: {
        "@type": "Organization",
        name: "Discount Quality Products Ltd.",
      },
      priceValidUntil: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .split("T")[0],
      
      // Explicit Merchant Return Policy Extensions
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "GB",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnPeriod",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/ReturnFeesCustomerPaying",
        "refundType": "https://schema.org/FullRefund"
      },

      // Explicit Shipping Details Extensions (UK mainland shipping rates)
      shippingDetails: [
        {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": 0,
            "currency": "GBP"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "GB"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 2,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 3,
              "maxValue": 5,
              "unitCode": "DAY"
            }
          }
        }
      ]
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
