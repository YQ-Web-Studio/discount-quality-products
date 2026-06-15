async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const query = `
    query GetLowIdProducts {
      products(first: 50, where: { status: "any" }) {
        nodes {
          databaseId
          slug
          name
          type
        }
      }
    }
  `;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    console.log("Products:", JSON.stringify(json.data.products.nodes, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
