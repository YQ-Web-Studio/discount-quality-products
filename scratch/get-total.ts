import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const WP_GRAPHQL_URL = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://admin.discountproducts.co.uk").replace(/\/$/, "") + "/graphql";

async function run() {
  const query = `
    query GetTotalProducts {
      products(where: { status: "PUBLISH" }) {
        pageInfo {
          total
        }
      }
    }
  `;
  try {
    const response = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const json = await response.json();
    console.log("Total published products:", json.data?.products?.pageInfo?.total);
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
