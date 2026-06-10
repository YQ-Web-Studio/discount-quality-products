async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const query = `
    query GetSlugs {
      products(first: 20, where: { status: "PUBLISH", visibility: VISIBLE }) {
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
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    console.log(JSON.stringify(json.data.products.nodes, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
