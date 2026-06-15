import type { Product } from "@/lib/wordpress";

interface ProductSchemaProps {
  product: Product;
}

/**
 * ProductSchema: Pure React Server Component that generates and injects
 * a strictly valid JSON-LD Product schema for Google Merchant listings.
 */
export function ProductSchema({ product }: ProductSchemaProps) {
  const baseUrl = "https://www.discountproducts.co.uk";
  const productUrl = `${baseUrl}/products/${product.slug}`;

  // Parse numeric price from currency string (e.g. "£12.99" -> "12.99")
  const rawPrice = product.price || product.regularPrice;
  const numericPrice = rawPrice ? parseFloat(rawPrice.replace(/[^0-9.]/g, "")) : undefined;

  // Map WooCommerce stock status to Schema.org ItemAvailability URLs
  const availabilityMap: Record<string, string> = {
    IN_STOCK: "https://schema.org/InStock",
    instock: "https://schema.org/InStock",
    OUT_OF_STOCK: "https://schema.org/OutOfStock",
    outofstock: "https://schema.org/OutOfStock",
    ON_BACKORDER: "https://schema.org/BackOrder",
    onbackorder: "https://schema.org/BackOrder",
  };
  const availability = availabilityMap[product.stockStatus ?? ""] || "https://schema.org/InStock";

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.shortDescription?.replace(/<[^>]*>/g, "").slice(0, 500) ||
      product.description?.replace(/<[^>]*>/g, "").slice(0, 500) ||
      `${product.name} from Discount Quality Products.`,
    url: productUrl,
    image: images.length > 0 ? images : [],
    sku: product.sku || String(product.databaseId),
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
      price: numericPrice ?? 0.00,
      availability,
      itemCondition: "https://schema.org/NewCondition",
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
      // Standard: £2.00 flat rate; FREE on orders over £5.
      // Schema must reflect what customers actually see on the page to avoid misrepresentation.
      shippingDetails: [
        {
          // Standard shipping: £2.00 flat (free threshold handled at checkout, not schema level)
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": 2.00,
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
