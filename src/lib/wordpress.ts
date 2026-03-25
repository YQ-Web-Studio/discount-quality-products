const WP_GRAPHQL_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'http://discount-products-backend.local/graphql';

export interface Product {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  shortDescription?: string;
  image?: {
    sourceUrl: string;
    altText?: string;
  };
  price?: string;
  regularPrice?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface ProductsResponse {
  products: Product[];
  pageInfo: PageInfo;
}

async function wpFetch<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
      next: { revalidate: 3600 }, // Default revalidation for ISR
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    if (json.errors) {
      console.error('GraphQL Errors:', json.errors);
      throw new Error('GraphQL query failed');
    }

    return json.data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Connection timeout - Wordpress backend is taking too long to respond.');
    }
    console.error('WordPress Fetch Error:', error);
    throw error;
  }
}

export async function getProducts(first: number = 12, after: string | null = null): Promise<ProductsResponse> {
  const query = `
    query GetProducts($first: Int, $after: String) {
      products(first: $first, after: $after, where: { status: "PUBLISH" }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          databaseId
          name
          slug
          shortDescription
          image {
            sourceUrl
            altText
          }
          ... on SimpleProduct {
            price
            regularPrice
          }
          ... on VariableProduct {
            price
            regularPrice
          }
        }
      }
    }
  `;

  const data = await wpFetch<{ products: { nodes: Product[]; pageInfo: PageInfo } }>(query, { first, after });
  
  return {
    products: data.products.nodes,
    pageInfo: data.products.pageInfo,
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const query = `
    query GetProductBySlug($slug: ID!) {
      product(id: $slug, idType: SLUG) {
        id
        databaseId
        name
        slug
        shortDescription
        image {
          sourceUrl
          altText
        }
        ... on SimpleProduct {
          price
          regularPrice
        }
        ... on VariableProduct {
          price
          regularPrice
        }
      }
    }
  `;

  const data = await wpFetch<{ product: Product }>(query, { slug });
  return data.product || null;
}

export async function getProductSlugs(first: number = 50): Promise<string[]> {
  const query = `
    query GetProductSlugs($first: Int) {
      products(first: $first, where: { status: "PUBLISH" }) {
        nodes {
          slug
        }
      }
    }
  `;

  const data = await wpFetch<{ products: { nodes: { slug: string }[] } }>(query, { first });
  return data.products.nodes.map((node) => node.slug);
}
