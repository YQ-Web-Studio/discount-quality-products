const fs = require('fs');
const path = require('path');

// We will copy the code from src/lib/wordpress.ts or mock wpFetch to run it
const WP_GRAPHQL_URL = "https://admin.discountproducts.co.uk/graphql";

async function wpFetch(query, variables = {}) {
  const res = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()).data;
}

const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCardFields on Product {
    id
    databaseId
    name
    slug
    shortDescription
    date
    image {
      sourceUrl
      altText
    }
    featuredImage {
      node {
        sourceUrl
        altText
      }
    }
    productCategories {
      nodes {
        name
        slug
        databaseId
      }
    }
    ... on SimpleProduct {
      price
      regularPrice
      stockStatus
      manageStock
      stockQuantity
    }
  }
`;

function mapProductData(product) {
  const image = product.featuredImage?.node || product.image;
  return { ...product, image };
}

async function getProductBySlugInternal(slug) {
  const query = `
    ${PRODUCT_CARD_FRAGMENT}
    query GetProductBySlug($slug: ID!) {
      product(id: $slug, idType: SLUG) {
        ...ProductCardFields
        description
        averageRating
        reviewCount
      }
    }
  `;

  // 1. Try to fetch by exact slug first
  try {
    const data = await wpFetch(query, { slug });
    if (data && data.product) {
      console.log("Found by exact match!");
      return mapProductData(data.product);
    }
  } catch (error) {
    console.warn("Direct fetch failed:", error);
  }

  // 2. Fallback
  const words = slug.split('-').filter(w => w.length > 1);
  if (words.length > 0) {
    const searchTerm = words.slice(0, 3).join(' ');
    console.log("Searching for fallback term:", searchTerm);
    const fallbackQuery = `
      query SearchProduct($search: String) {
        products(first: 20, where: { search: $search, status: "PUBLISH", visibility: VISIBLE }) {
          nodes {
            slug
          }
        }
      }
    `;

    try {
      const searchData = await wpFetch(fallbackQuery, { search: searchTerm });
      const candidates = searchData.products?.nodes || [];
      console.log("Candidates found:", candidates.map(c => c.slug));

      const sanitize = (s) => {
        const decoded = decodeURIComponent(s);
        let clean = decoded
          .toLowerCase()
          .replace(/[\u201C\u201D\u2018\u2019"'`’‘]/g, '')
          .replace(/[^a-z0-9+/|-]/g, '-')
          .replace(/-+/g, '-');
        return clean.replace(/-+$/, '');
      };

      const targetSanitized = sanitize(slug);
      console.log("Target Sanitized:", targetSanitized);
      
      const matchingCandidate = candidates.find(c => {
        const candidateSanitized = sanitize(c.slug);
        console.log(`Comparing candidate "${c.slug}" -> sanitized: "${candidateSanitized}"`);
        return candidateSanitized === targetSanitized;
      });

      if (matchingCandidate) {
        console.log("Matching candidate found:", matchingCandidate.slug);
        const data = await wpFetch(query, { slug: matchingCandidate.slug });
        if (data && data.product) {
          return mapProductData(data.product);
        }
      } else {
        console.log("No matching candidate found in search results.");
      }
    } catch (fallbackError) {
      console.error("Fallback search failed:", fallbackError);
    }
  }
  return null;
}

run();

async function run() {
  const result = await getProductBySlugInternal("100x-2ba-1-5-38mm-slotted-round-head-steel-machine-screws-nut-bolt-set-bzp");
  console.log("Result product name:", result ? result.name : "null");
}
