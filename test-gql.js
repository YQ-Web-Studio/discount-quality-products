
const fetch = require("node-fetch") || globalThis.fetch;
const WP_GRAPHQL_URL = "http://discount-products-backend.local/graphql";

async function test() {
  const queryFallback = `
        query GetFallbackProducts($first: Int, $notIn: [ID]) {
          products(first: $first, where: { status: "PUBLISH", notIn: $notIn, orderby: [{ field: MENU_ORDER, order: ASC }] }) {
            nodes { id }
          }
        }
  `;

  const res = await fetch(WP_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: queryFallback, variables: { first: 6, notIn: ["xyz"] } })
  });
  console.log(await res.text());
}
test();

