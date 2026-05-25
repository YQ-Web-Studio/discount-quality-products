import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/checkout",
        "/account",
        // Facet Shielding: prevent indexing of duplicate faceted search permutations
        "*?*min_price=*",
        "*?*max_price=*",
        "*?*pa_*",
        "*?*orderby=*",
        "*?*order=*",
        "*?*q=*", // prevent dynamic search pages from consuming crawl budget
      ],
    },
    sitemap: "https://discountqualityproducts.co.uk/sitemap.xml",
  };
}
