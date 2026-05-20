const WP_GRAPHQL_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'http://discount-products-backend.local/graphql';

const query = `
  query SearchUnified($search: String, $first: Int) {
    products(first: $first, where: { search: $search, status: "PUBLISH" }) {
      nodes {
        id
        name
        slug
      }
    }
    productCategories(first: $first, where: { search: $search }) {
      nodes {
        id
        name
        slug
      }
    }
  }
`;

fetch(WP_GRAPHQL_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { search: "led", first: 5 } }),
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
