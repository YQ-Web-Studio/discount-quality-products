import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "dqp-revalidate-ingestion-2026";
const TARGET_URL = "https://www.discountproducts.co.uk/api/revalidate";

async function run() {
  console.log(`Sending POST to ${TARGET_URL}...`);
  try {
    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": REVALIDATE_SECRET,
      },
      body: JSON.stringify({
        tags: ["wc-products", "wc-product-example-product"],
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const json = await response.json();
    console.log("Response Body:", JSON.stringify(json, null, 2));
  } catch (error) {
    console.error("Error pinging revalidation endpoint:", error);
  }
}

run();
