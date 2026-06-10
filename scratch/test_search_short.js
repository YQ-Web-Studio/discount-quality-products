async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const queryText = "100x 2ba";
  const query = `
    query SearchProduct($search: String) {
      products(first: 10, where: { search: $search, status: "PUBLISH" }) {
        nodes {
          slug
          name
        }
      }
    }
  `;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { search: queryText } })
    });
    const json = await res.json();
    console.log("Search Results:", JSON.stringify(json.data.products.nodes, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
