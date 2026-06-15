async function run() {
  const url = "https://admin.discountproducts.co.uk/graphql";
  const ids = [4, 5, 6, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 23, 25, 26];
  
  // We'll query using node(id) or standard posts queries
  let query = `query GetPostsByIds {`;
  ids.forEach(id => {
    query += `
      post_${id}: post(id: "${id}", idType: DATABASE_ID) {
        databaseId
        slug
        title
        uri
      }
      product_${id}: product(id: "${id}", idType: DATABASE_ID) {
        databaseId
        slug
        name
      }
    `;
  });
  query += `}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    console.log(JSON.stringify(json.data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
