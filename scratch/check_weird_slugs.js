async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const query = `
    query GetAllSlugs($after: String) {
      products(first: 100, after: $after, where: { status: "PUBLISH", visibility: VISIBLE }) {
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
    let count = 0;
    const weirdSlugs = [];

    while (hasNextPage && count < 1000) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { after } })
      });
      const json = await res.json();
      const nodes = json.data.products.nodes;
      for (const node of nodes) {
        const slug = node.slug;
        const hasEncoded = slug.includes('%');
        const hasBadPunc = /[\u201C\u201D\u2018\u2019"']/.test(slug);
        const hasDoubleHyphen = slug.includes('--');
        const isNotLower = slug !== slug.toLowerCase();
        
        if (hasEncoded || hasBadPunc || hasDoubleHyphen || isNotLower) {
          weirdSlugs.push(slug);
        }
      }
      count += nodes.length;
      hasNextPage = json.data.products.pageInfo.hasNextPage;
      after = json.data.products.pageInfo.endCursor;
    }

    console.log("Total products checked:", count);
    console.log("Weird slugs found:", weirdSlugs);
  } catch (err) {
    console.error(err);
  }
}
run();
