import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const WP_GRAPHQL_URL = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://admin.discountproducts.co.uk").replace(/\/$/, "") + "/graphql";

async function wpFetch(query: string, variables: any) {
  const response = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

async function testBatchSize(batchSize: number) {
  const query = `
    query GetAllProductSlugs($first: Int, $after: String) {
      products(first: $first, after: $after, where: { status: "PUBLISH" }) {
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

  console.log(`Testing batch size: ${batchSize}...`);
  const start = Date.now();
  let resultsCount = 0;
  let hasNextPage = true;
  let after: string | null = null;
  let requestCount = 0;

  try {
    while (hasNextPage && resultsCount < 1000) {
      requestCount++;
      const data: any = await wpFetch(query, { first: batchSize, after });
      const nodes = data.products?.nodes || [];
      resultsCount += nodes.length;
      hasNextPage = data.products?.pageInfo?.hasNextPage ?? false;
      after = data.products?.pageInfo?.endCursor ?? null;
      if (!hasNextPage || !after || nodes.length === 0) break;
    }
    const duration = Date.now() - start;
    console.log(`Batch size ${batchSize}: Fetched ${resultsCount} products in ${requestCount} request(s) taking ${duration}ms`);
  } catch (error) {
    console.error(`Error with batch size ${batchSize}:`, error);
  }
}

async function run() {
  await testBatchSize(100);
  await testBatchSize(250);
  await testBatchSize(500);
}

run();
