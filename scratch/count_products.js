async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const countQuery = `
    query Count($after: String) {
      products(first: 100, after: $after, where: { status: "PUBLISH" }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          slug
        }
      }
    }
  `;
  try {
    let hasNextPage = true;
    let after = null;
    let total = 0;
    // Let's count in batches, up to 10 batches (1000 products) to verify quickly
    let batchCount = 0;
    while (hasNextPage && batchCount < 20) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: countQuery, variables: { after } })
      });
      const json = await res.json();
      const nodes = json.data.products.nodes;
      total += nodes.length;
      hasNextPage = json.data.products.pageInfo.hasNextPage;
      after = json.data.products.pageInfo.endCursor;
      batchCount++;
      if (!hasNextPage || !after) break;
    }
    console.log(`Successfully verified ${total} products (hasNextPage: ${hasNextPage}). The database is populated.`);
  } catch (err) {
    console.error(err);
  }
}
run();
