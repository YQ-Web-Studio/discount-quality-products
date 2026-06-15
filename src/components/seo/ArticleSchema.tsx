import type { WpPost } from "@/lib/wordpress";

interface ArticleSchemaProps {
  post: WpPost;
}

/**
 * ArticleSchema: Pure React Server Component that generates and injects
 * a strictly valid JSON-LD BlogPosting schema for Google rich results.
 *
 * Spec: https://developers.google.com/search/docs/appearance/structured-data/article
 */
export function ArticleSchema({ post }: ArticleSchemaProps) {
  const baseUrl = "https://www.discountproducts.co.uk";
  const articleUrl = `${baseUrl}/guides/${post.slug}`;

  const headline = post.title
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 110); // Google recommends ≤ 110 chars

  const description = post.excerpt
    ? post.excerpt.replace(/<[^>]*>/g, "").trim().slice(0, 300)
    : post.content?.replace(/<[^>]*>/g, "").trim().slice(0, 300) || "";

  const authorName = post.author?.node?.name || "Discount Quality Products Team";

  const featuredImg = post.featuredImage?.node;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    url: articleUrl,
    datePublished: post.date,
    dateModified: post.modified || post.date,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Discount Quality Products",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.svg`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    ...(featuredImg?.sourceUrl && {
      image: {
        "@type": "ImageObject",
        url: featuredImg.sourceUrl,
        ...(featuredImg.mediaDetails?.width && { width: featuredImg.mediaDetails.width }),
        ...(featuredImg.mediaDetails?.height && { height: featuredImg.mediaDetails.height }),
        ...(featuredImg.altText && { caption: featuredImg.altText }),
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
