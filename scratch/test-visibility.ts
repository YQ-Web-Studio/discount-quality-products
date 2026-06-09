import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const WP_GRAPHQL_URL = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://admin.discountproducts.co.uk").replace(/\/$/, "") + "/graphql";

async function wpFetch(query: string, variables?: any) {
  const response = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  return json.data;
}

async function run() {
  const queryWith = `
    query TestWith {
      products(first: 20, where: { search: "example-product", status: "PUBLISH", visibility: VISIBLE }) {
        nodes {
          name
          slug
        }
      }
    }
  `;

  const queryWithout = `
    query TestWithout {
      products(first: 20, where: { search: "example-product", status: "PUBLISH" }) {
        nodes {
          name
          slug
        }
      }
    }
  `;

  try {
    const dataWith = await wpFetch(queryWith);
    console.log("With visibility: VISIBLE:", JSON.stringify(dataWith, null, 2));

    const dataWithout = await wpFetch(queryWithout);
    console.log("Without visibility filter:", JSON.stringify(dataWithout, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
