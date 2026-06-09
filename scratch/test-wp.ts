import { getAllProductSlugs } from "../src/lib/wordpress";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  console.log("Fetching product slugs...");
  const start = Date.now();
  try {
    const slugs = await getAllProductSlugs();
    const duration = Date.now() - start;
    console.log(`Fetched ${slugs.length} product slugs in ${duration}ms`);
  } catch (error) {
    console.error("Error fetching slugs:", error);
  }
}

run();
