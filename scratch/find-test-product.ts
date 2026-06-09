import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const WOOCOMMERCE_URL = process.env.WOOCOMMERCE_URL;
const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

async function run() {
  const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const authHeader = { Authorization: `Basic ${authString}` };

  try {
    // We query products page by page with status=any
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      console.log(`Fetching page ${page}...`);
      const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/v3/products?per_page=100&page=${page}&status=any`, {
        headers: { ...authHeader }
      });
      const products = await response.json();
      if (!Array.isArray(products) || products.length === 0) {
        hasMore = false;
        break;
      }
      for (const p of products) {
        // Look for:
        // - visibility 'hidden'
        // - price '1' or '1.00' (or £1 / 30p, maybe the sale_price or regular_price matches)
        const isHidden = p.catalog_visibility === "hidden";
        const matchesPrice = p.price === "1" || p.price === "1.00" || p.regular_price === "1" || p.sale_price === "1" || p.price === "0.3" || p.price === "0.30";
        const matchesTest = p.name.toLowerCase().includes("test") || p.slug.toLowerCase().includes("test");
        
        if (isHidden || matchesPrice || matchesTest) {
          console.log(`MATCH: ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}, Status: ${p.status}, Visibility: ${p.catalog_visibility}, Price: ${p.price}, Regular: ${p.regular_price}, Sale: ${p.sale_price}`);
        }
      }
      page++;
    }
    console.log("Search complete.");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
