async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const searchSlug = "100x-2ba-1-5-38mm-slotted-round-head-steel-machine-screws-nut-bolt-set-bzp";
  const query = `
    query SearchProduct($search: String) {
      products(first: 5, where: { search: $search, status: "PUBLISH" }) {
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
      body: JSON.stringify({ query, variables: { search: searchSlug } })
    });
    const json = await res.json();
    console.log("Search Results:", JSON.stringify(json.data.products.nodes, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
