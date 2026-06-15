async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const query = `
    query GetPost38 {
      post(id: "38", idType: DATABASE_ID) {
        databaseId
        slug
        title
        uri
      }
      product(id: "38", idType: DATABASE_ID) {
        databaseId
        slug
        name
        type
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
    console.log("Post 38:", JSON.stringify(json.data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
