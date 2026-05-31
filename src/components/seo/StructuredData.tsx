import React from "react";

export function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    name: "Discount Quality Products",
    legalName: "Discount Quality Products Ltd.",
    description:
      "Your premier destination for premium lighting, electric fittings, computing, rare coins & stamps, DVDs, and books.",
    url: "https://discountqualityproducts.co.uk",
    foundingDate: "2011",
    logo: {
      "@type": "ImageObject",
      url: "https://discountqualityproducts.co.uk/images/og-image.jpg",
      width: 1200,
      height: 630,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "256 London Road",
      addressLocality: "Westcliff-on-Sea",
      addressRegion: "Essex",
      postalCode: "SS0 7JG",
      addressCountry: "GB", // ISO 3166-1 alpha-2 — must be "GB", not "UK"
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+44-1702-339033",
        contactType: "customer service",
        email: "sales@discountqualityproducts.org.uk",
        areaServed: "GB",
        availableLanguage: "English",
      },
    ],
    areaServed: {
      "@type": "GeoShape",
      name: "Worldwide",
    },
    // TODO: Add social profile URLs here once accounts are live
    sameAs: [],
    potentialAction: {
      "@type": "SearchAction",
      // NOTE: The shop route (not /search) is the actual search destination
      target: "https://discountqualityproducts.co.uk/shop?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
