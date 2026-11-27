import type { MetadataRoute } from "next";
import {
  getAllPostSlugs,
  getSitemapProductChunk,
  getSitemapProductPageCount,
  SITEMAP_PRODUCTS_PER_CHUNK,
} from "@/lib/wordpress";
import { getCategories } from "@/lib/woocommerce";
import { navigationCategories } from "@/lib/navigationConfig";

export const dynamic = "force-static";
export const revalidate = 86400; // Revalidate sitemaps once per day (in seconds)

const BASE_URL = "https://www.discountproducts.co.uk";

const STATIC_PAGES = [
  { path: "", changefreq: "weekly" as const, priority: 1.0 },
  { path: "/shop", changefreq: "daily" as const, priority: 0.9 },
  { path: "/guides", changefreq: "weekly" as const, priority: 0.8 },
  { path: "/contact", changefreq: "monthly" as const, priority: 0.6 },
  { path: "/returns", changefreq: "monthly" as const, priority: 0.5 },
  { path: "/shipping", changefreq: "monthly" as const, priority: 0.5 },
  { path: "/privacy", changefreq: "monthly" as const, priority: 0.3 },
  { path: "/terms", changefreq: "monthly" as const, priority: 0.3 },
  { path: "/refunds", changefreq: "monthly" as const, priority: 0.3 },
];

/**
 * Generates static sitemap chunks:
 * - id = 0: Static pages, parent categories, clean subcategory routes, and trade guides
 * - id = 1..N: Deterministic 5,000-SKU product chunks covering the full 15,000+ catalogue
 */
export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  let productChunks = 1;
  try {
    productChunks = await getSitemapProductPageCount(SITEMAP_PRODUCTS_PER_CHUNK);
  } catch (error) {
    console.error("Error resolving product sitemap chunk count:", error);
  }

  const safeChunks = Math.max(1, productChunks);
  const sitemaps: Array<{ id: number }> = [{ id: 0 }];
  for (let i = 1; i <= safeChunks; i++) {
    sitemaps.push({ id: i });
  }
  return sitemaps;
}

async function buildCoreSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [posts, categoryPaths] = await Promise.all([
    (async () => {
      try {
        return await getAllPostSlugs();
      } catch (error) {
        console.error("Error fetching post slugs for sitemap:", error);
        return [];
      }
    })(),
    (async () => {
      const uniquePaths = new Set<string>();

      // Seed with known static navigation categories so clean subcategory URLs are always indexed
      for (const cat of navigationCategories) {
        if (cat.slug) uniquePaths.add(`/categories/${cat.slug}`);
        for (const sub of cat.subcategories ?? []) {
          if (sub.slug) uniquePaths.add(`/categories/${sub.slug}`);
        }
      }

      try {
        const rawCategories = await getCategories();
        for (const cat of rawCategories) {
          if (cat.slug) uniquePaths.add(`/categories/${cat.slug}`);
          for (const sub of cat.subcategories ?? []) {
            if (sub.slug) uniquePaths.add(`/categories/${sub.slug}`);
          }
        }
      } catch (error) {
        console.error("Error fetching categories for sitemap:", error);
      }

      return Array.from(uniquePaths);
    })(),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: now,
    changeFrequency: page.changefreq,
    priority: page.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categoryPaths.map((catPath) => ({
    url: `${BASE_URL}${catPath}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/guides/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...postEntries];
}

export default async function sitemap(props?: {
  id: Promise<string> | string | number;
}): Promise<MetadataRoute.Sitemap> {
  const rawId = props?.id !== undefined ? await props.id : 0;
  const chunkId = Number(rawId);

  if (!Number.isFinite(chunkId) || chunkId <= 0) {
    return buildCoreSitemapEntries();
  }

  try {
    const chunk = await getSitemapProductChunk(chunkId, SITEMAP_PRODUCTS_PER_CHUNK);
    const fallbackNow = new Date();

    return chunk.items.map((prod) => ({
      url: `${BASE_URL}/products/${prod.slug}`,
      lastModified: prod.date ? new Date(prod.date) : fallbackNow,
      changeFrequency: "daily",
      priority: 0.8,
    }));
  } catch (error) {
    console.error(`Error generating product sitemap chunk ${chunkId}:`, error);
    return [];
  }
}
