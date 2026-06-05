import { unstable_cache } from "next/cache";
import { navigationCategories } from "./navigationConfig";


function getWordPressGraphqlUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
    "https://admin.discountproducts.co.uk";

  const trimmedUrl = baseUrl.replace(/\/$/, "");

  if (trimmedUrl.endsWith("/graphql")) {
    return trimmedUrl;
  }

  return `${trimmedUrl}/graphql`;
}

const WP_GRAPHQL_URL = getWordPressGraphqlUrl();

export interface ProductCategory {
  name: string;
  slug: string;
  databaseId: number;
}

export interface Product {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  date?: string;
  image?: {
    sourceUrl: string;
    altText?: string;
  };
  featuredImage?: {
    node?: {
      sourceUrl: string;
      altText?: string;
    };
  };
  price?: string;
  regularPrice?: string;
  salePrice?: string;
  productCategories?: {
    nodes: ProductCategory[];
  };
  stockStatus?: string;
  manageStock?: boolean;
  stockQuantity?: number | null;
  galleryImages?: {
    nodes: {
      sourceUrl: string;
      altText?: string;
    }[];
  };
  attributes?: {
    nodes: {
      name: string;
      options: string[];
    }[];
  };
  averageRating?: number;
  reviewCount?: number;
  reviews?: {
    nodes: {
      id: string;
      author?: {
        node?: {
          name?: string;
        };
      };
      content?: string;
      date?: string;
      rating?: number;
    }[];
  };
}

/**
 * Shared GraphQL fragment for product cards to ensure consistency across the catalogue.
 * This includes the correct featuredImage structure as required by the shop logic.
 */
export const PRODUCT_CARD_FRAGMENT = `
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
    galleryImages(first: 1) {
      nodes {
        sourceUrl
        altText
      }
    }
    ... on SimpleProduct {
      price
      regularPrice
      stockStatus
      manageStock
      stockQuantity
      attributes {
        nodes {
          name
          options
        }
      }
    }
    ... on VariableProduct {
      price
      regularPrice
      attributes {
        nodes {
          name
          options
        }
      }
    }
    ... on ExternalProduct {
      price
      regularPrice
      externalUrl
      buttonText
    }
    ... on GroupProduct {
      price
    }
  }
`;

/**
 * Synchronises product data by ensuring the primary image is correctly assigned.
 * Favours featuredImage.node over the standard image field for maximum consistency.
 */
function mapProductData(product: Product): Product {
  // Synchronise images by cascading: Featured -> Gallery -> Standard
  const image = 
    product.featuredImage?.node || 
    product.galleryImages?.nodes?.[0] || 
    product.image;

  return {
    ...product,
    image,
  };
}

export interface UnifiedSearchResult {
  type: 'product' | 'category';
  id: string;
  name: string;
  slug: string;
  price?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  parentName?: string | null;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface ProductsResponse {
  products: Product[];
  pageInfo: PageInfo;
}

async function wpFetch<T>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal,
      next: { revalidate: 3600, tags: ["wc-products"] }, // Default revalidation for ISR
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const looksLikeJson =
      contentType.includes("application/json") ||
      responseText.trim().startsWith("{") ||
      responseText.trim().startsWith("[");

    if (!response.ok) {
      throw new Error(
        `WordPress GraphQL request failed with status ${response.status}.`
      );
    }

    if (!looksLikeJson) {
      throw new Error(
        "WordPress GraphQL returned HTML or another non-JSON response. Check that the backend GraphQL endpoint is correct and reachable."
      );
    }

    const json = JSON.parse(responseText) as {
      data?: T;
      errors?: { message?: string; path?: string[] }[];
    };

    if (json.errors) {
      console.error('GraphQL Errors Details:', JSON.stringify(json.errors, null, 2));
      
      const isNotFound = json.errors.some(err => 
        err.message?.toLowerCase().includes("no product id was found") ||
        err.message?.toLowerCase().includes("invalid") ||
        err.message?.toLowerCase().includes("not found")
      );

      if (isNotFound && json.data) {
        return json.data;
      }
      
      throw new Error('GraphQL query failed');
    }

    if (!json.data) {
      throw new Error("WordPress GraphQL response did not include any data.");
    }

    return json.data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(
        "Connection timeout - WordPress backend is taking too long to respond."
      );
    }
    console.error('WordPress Fetch Error:', error);
    throw error;
  }
}

export async function getProducts(first: number = 12, after: string | null = null, categorySlug: string | null = null, searchTerm: string | null = null): Promise<ProductsResponse> {
  const query = `
    ${PRODUCT_CARD_FRAGMENT}
    query GetProducts($first: Int, $after: String${categorySlug ? ', $categoryIn: [String]' : ''}${searchTerm ? ', $search: String' : ''}) {
      products(first: $first, after: $after, where: { status: "PUBLISH", visibility: VISIBLE${categorySlug ? ', categoryIn: $categoryIn' : ''}${searchTerm ? ', search: $search' : ''} }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...ProductCardFields
        }
      }
    }
  `;

  const variables: Record<string, any> = { first, after };
  if (categorySlug) variables.categoryIn = [categorySlug];
  if (searchTerm) variables.search = searchTerm;
  console.log('[GraphQL] Variables:', variables);

  const data = await wpFetch<{ products: { nodes: Product[]; pageInfo: PageInfo } }>(query, variables);
  
  return {
    products: data.products.nodes.map(mapProductData),
    pageInfo: data.products.pageInfo,
  };
}

export const getSmartFeaturedProducts = unstable_cache(
  async (): Promise<Product[]> => {
    // Step A: Query featured products
    const queryFeatured = `
      ${PRODUCT_CARD_FRAGMENT}
      query GetFeaturedProducts {
        products(first: 6, where: { featured: true, status: "PUBLISH", visibility: VISIBLE, orderby: [{ field: DATE, order: DESC }] }) {
          nodes {
            ...ProductCardFields
          }
        }
      }
    `;

    const dataFeatured = await wpFetch<{ products: { nodes: Product[] } }>(queryFeatured);
    let featuredProducts = dataFeatured.products.nodes.map(mapProductData);

    // Step B: Calculate deficit and fetch fallback if needed
    // The homepage displays exactly 5 featured products, but we'll fetch up to 6 as a safety margin.
    const deficit = 6 - featuredProducts.length;

    if (featuredProducts.length === 0) {
      // If none are featured, get the first subcategory slug for each of the 5 parent categories
      const fallbackSlugs = navigationCategories
        .map(cat => {
          const sub = cat.subcategories[0];
          return sub ? (sub.wcSlug || sub.slug) : null;
        })
        .filter((s): s is string => !!s);

      // Build a single highly optimized aliased GraphQL query to get the latest product from each subcategory
      let queryFallback = PRODUCT_CARD_FRAGMENT;
      queryFallback += `\nquery GetFallbackCategoryProducts {`;
      fallbackSlugs.forEach((slug, idx) => {
        queryFallback += `\n  cat_${idx}: products(first: 1, where: { categoryIn: ["${slug}"], status: "PUBLISH", visibility: VISIBLE, orderby: [{ field: DATE, order: DESC }] }) {\n    nodes {\n      ...ProductCardFields\n    }\n  }`;
      });
      queryFallback += `\n}`;

      try {
        const dataFallback = await wpFetch<Record<string, { nodes: Product[] }>>(queryFallback);
        const fallbackProducts: Product[] = [];
        
        fallbackSlugs.forEach((_, idx) => {
          const catData = dataFallback[`cat_${idx}`];
          if (catData && catData.nodes && catData.nodes.length > 0) {
            fallbackProducts.push(mapProductData(catData.nodes[0]));
          }
        });

        featuredProducts = fallbackProducts;
      } catch (error) {
        console.error("Error fetching category-based fallback products:", error);
      }

      // If we still have a deficit (e.g. less than 5 products because a category had no products),
      // fill the remaining slots with globally recent products.
      const currentDeficit = 6 - featuredProducts.length;
      if (currentDeficit > 0) {
        const excludeIds = featuredProducts.map(p => p.id);

        const queryGlobalFallback = `
          ${PRODUCT_CARD_FRAGMENT}
          query GetGlobalFallbackProducts($first: Int) {
            products(first: $first, where: { status: "PUBLISH", visibility: VISIBLE, orderby: [{ field: MENU_ORDER, order: ASC }] }) {
              nodes {
                ...ProductCardFields
              }
            }
          }
        `;

        // Query slightly more to allow client-side filtering without exclusions in GraphQL
        const variables: Record<string, any> = { first: currentDeficit + excludeIds.length };

        try {
          const dataGlobalFallback = await wpFetch<{ products: { nodes: Product[] } }>(queryGlobalFallback, variables);
          const filtered = dataGlobalFallback.products.nodes
            .map(mapProductData)
            .filter(p => !excludeIds.includes(p.id))
            .slice(0, currentDeficit);
          featuredProducts = [...featuredProducts, ...filtered];
        } catch (error) {
          console.error("Error fetching global fallback products:", error);
        }
      }
    } else if (deficit > 0) {
      // If we have some featured products, fill the deficit with menu-ordered fallback products.
      const excludeIds = featuredProducts.map(p => p.id);
      
      const queryFallback = `
        ${PRODUCT_CARD_FRAGMENT}
        query GetFallbackProducts($first: Int) {
          products(first: $first, where: { status: "PUBLISH", visibility: VISIBLE, orderby: [{ field: MENU_ORDER, order: ASC }] }) {
            nodes {
              ...ProductCardFields
            }
          }
        }
      `;

      // Query slightly more to allow client-side filtering without exclusions in GraphQL
      const variables: Record<string, any> = { first: deficit + excludeIds.length };

      try {
        const dataFallback = await wpFetch<{ products: { nodes: Product[] } }>(queryFallback, variables);
        const filtered = dataFallback.products.nodes
          .map(mapProductData)
          .filter(p => !excludeIds.includes(p.id))
          .slice(0, deficit);
        featuredProducts = [...featuredProducts, ...filtered];
      } catch (error) {
        console.error("Error fetching fallback products for deficit:", error);
      }
    }

    return featuredProducts;
  },
  ['smart-featured-products'],
  { revalidate: 3600 }
);

export async function getLatestProducts(first: number = 6): Promise<Product[]> {
  const query = `
    ${PRODUCT_CARD_FRAGMENT}
    query GetLatestProducts($first: Int) {
      products(first: $first, where: { status: "PUBLISH", visibility: VISIBLE, orderby: [{ field: DATE, order: DESC }] }) {
        nodes {
          ...ProductCardFields
        }
      }
    }
  `;

  const data = await wpFetch<{ products: { nodes: Product[] } }>(query, { first });
  return data.products.nodes.map(mapProductData);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const query = `
    ${PRODUCT_CARD_FRAGMENT}
    query GetProductBySlug($slug: ID!) {
      product(id: $slug, idType: SLUG) {
        ...ProductCardFields
        description
        averageRating
        reviewCount
        allGalleryImages: galleryImages(first: 10) {
          nodes {
            sourceUrl
            altText
          }
        }
      }
    }
  `;

  const data = await wpFetch<{ product: Product & { allGalleryImages?: { nodes: { sourceUrl: string; altText?: string }[] } } }>(query, { slug });
  if (!data.product) return null;

  // Merge allGalleryImages back under the standard galleryImages key for the rest of the app.
  const product = {
    ...data.product,
    galleryImages: data.product.allGalleryImages ?? data.product.galleryImages,
  };

  return mapProductData(product);
}

export async function getProductSlugs(first: number = 50): Promise<string[]> {
  const query = `
    query GetProductSlugs($first: Int) {
      products(first: $first, where: { status: "PUBLISH", visibility: VISIBLE }) {
        nodes {
          slug
        }
      }
    }
  `;

  const data = await wpFetch<{ products: { nodes: { slug: string }[] } }>(query, { first });
  return data.products.nodes.map((node) => node.slug);
}

interface SlugsResponse {
  products: {
    pageInfo: PageInfo;
    nodes: {
      slug: string;
      date: string;
    }[];
  };
}

export async function getAllProductSlugs(limit: number = 10000): Promise<{ slug: string; date: string }[]> {
  const query = `
    query GetAllProductSlugs($first: Int, $after: String) {
      products(first: $first, after: $after, where: { status: "PUBLISH", visibility: VISIBLE }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          slug
          date
        }
      }
    }
  `;

  let results: { slug: string; date: string }[] = [];
  let hasNextPage = true;
  let after: string | null = null;
  const batchSize = 100;

  try {
    while (hasNextPage && results.length < limit) {
      const data: SlugsResponse = await wpFetch<SlugsResponse>(
        query,
        { first: batchSize, after }
      );
      
      const nodes = data.products?.nodes || [];
      results = [...results, ...nodes.map((n) => ({ slug: n.slug, date: n.date || new Date().toISOString() }))];
      
      hasNextPage = data.products?.pageInfo?.hasNextPage ?? false;
      after = data.products?.pageInfo?.endCursor ?? null;

      if (!hasNextPage || !after) break;
    }
  } catch (error) {
    console.error("Error fetching all product slugs for sitemap:", error);
  }

  return results;
}

// ─── WordPress Posts (Trade Hub / Guides) ────────────────────────────────────

export interface WpPost {
  id: string;
  databaseId: number;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  date: string;
  modified: string;
  author?: {
    node?: {
      name?: string;
    };
  };
  featuredImage?: {
    node?: {
      sourceUrl: string;
      altText?: string;
      mediaDetails?: {
        width?: number;
        height?: number;
      };
    };
  };
  categories?: {
    nodes: { name: string; slug: string }[];
  };
}

/**
 * Fetches a single WordPress post by its slug.
 * Returns null if the post does not exist.
 */
export async function getPostBySlug(slug: string): Promise<WpPost | null> {
  const query = `
    query GetPostBySlug($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        id
        databaseId
        slug
        title
        content
        excerpt
        date
        modified
        author {
          node {
            name
          }
        }
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
      }
    }
  `;

  try {
    const data = await wpFetch<{ post: WpPost | null }>(query, { slug });
    return data.post ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches a paginated list of published WordPress posts for the guides index.
 */
export async function getPosts(first: number = 12, after: string | null = null): Promise<{
  posts: WpPost[];
  pageInfo: PageInfo;
}> {
  const query = `
    query GetPosts($first: Int, $after: String) {
      posts(first: $first, after: $after, where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          databaseId
          slug
          title
          excerpt
          date
          modified
          author {
            node {
              name
            }
          }
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  `;

  try {
    const data = await wpFetch<{ posts: { nodes: WpPost[]; pageInfo: PageInfo } }>(query, { first, after });
    return {
      posts: data.posts.nodes,
      pageInfo: data.posts.pageInfo,
    };
  } catch {
    return { posts: [], pageInfo: { hasNextPage: false, endCursor: '' } };
  }
}

/**
 * Fetches all published post slugs and their last-modified dates.
 * Used for sitemap generation.
 */
export async function getAllPostSlugs(): Promise<{ slug: string; date: string }[]> {
  const query = `
    query GetAllPostSlugs($first: Int, $after: String) {
      posts(first: $first, after: $after, where: { status: PUBLISH }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          slug
          modified
        }
      }
    }
  `;

  let results: { slug: string; date: string }[] = [];
  let hasNextPage = true;
  let after: string | null = null;
  const batchSize = 100;

  type PostSlugsResponse = {
    posts: { nodes: { slug: string; modified: string }[]; pageInfo: PageInfo };
  };

  try {
    while (hasNextPage) {
      const data: PostSlugsResponse = await wpFetch<PostSlugsResponse>(query, { first: batchSize, after });

      const nodes: { slug: string; modified: string }[] = data.posts?.nodes || [];
      results = [...results, ...nodes.map((n: { slug: string; modified: string }) => ({ slug: n.slug, date: n.modified || new Date().toISOString() }))];

      hasNextPage = data.posts?.pageInfo?.hasNextPage ?? false;
      after = data.posts?.pageInfo?.endCursor ?? null;
      if (!hasNextPage || !after) break;
    }
  } catch (error) {
    console.error('Error fetching all post slugs for sitemap:', error);
  }

  return results;
}

export async function searchProducts(search: string, first: number = 10): Promise<UnifiedSearchResult[]> {
  const query = `
    ${PRODUCT_CARD_FRAGMENT}
    query SearchUnified($search: String, $first: Int) {
      products(first: $first, where: { search: $search, status: "PUBLISH", visibility: VISIBLE }) {
        nodes {
          ...ProductCardFields
        }
      }
      productCategories(first: $first, where: { search: $search }) {
        nodes {
          id
          name
          slug
          image {
            sourceUrl
            altText
          }
          parent {
            node {
              name
            }
          }
        }
      }
    }
  `;

  let data = await wpFetch<{
    products: { nodes: any[] };
    productCategories: { nodes: any[] };
  }>(query, { search, first });

  // Fuzzy Search Secondary Fallback
  if ((!data.products?.nodes?.length) && (!data.productCategories?.nodes?.length)) {
    const fallbackQuery = `
      ${PRODUCT_CARD_FRAGMENT}
      query SearchUnifiedFallback($search: String, $first: Int) {
        products(first: $first, where: { tag: [$search], status: "PUBLISH", visibility: VISIBLE }) {
          nodes {
            ...ProductCardFields
          }
        }
        productCategories(first: $first, where: { slug: [$search] }) {
          nodes {
            id
            name
            slug
            image { sourceUrl altText }
            parent { node { name } }
          }
        }
      }
    `;
    const fallbackData = await wpFetch<any>(fallbackQuery, { search, first });
    if (fallbackData) {
      data = fallbackData;
    }
  }

  const results: UnifiedSearchResult[] = [];

  // Add categories first so they appear at the top
  if (data.productCategories?.nodes) {
    data.productCategories.nodes.forEach((cat) => {
      results.push({
        type: 'category',
        id: cat.id,
        name: cat.name,
        parentName: cat.parent?.node?.name || null,
        slug: cat.slug,
        imageUrl: cat.image?.sourceUrl || null,
        imageAlt: cat.image?.altText || null,
      });
    });
  }

    if (data.products?.nodes) {
      data.products.nodes.forEach((prod) => {
        const mappedProd = mapProductData(prod);
        results.push({
          type: 'product',
          id: mappedProd.id,
          name: mappedProd.name,
          slug: mappedProd.slug,
          price: mappedProd.price,
          imageUrl: mappedProd.image?.sourceUrl || null,
          imageAlt: mappedProd.image?.altText || null,
        });
      });
    }

  return results;
}
