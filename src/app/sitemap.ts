import { MetadataRoute } from "next";
import { getAllProductSlugs, getAllPostSlugs } from "@/lib/wordpress";
import { getCategories } from "@/lib/woocommerce";

export const revalidate = 86400; // Revalidate sitemap once per day (in seconds)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.discountproducts.co.uk";

  // Fetch all resources in parallel to minimize overall build time
  const [products, posts, categories] = await Promise.all([
    (async () => {
      try {
        // Cap to 1000 products to avoid build timeouts on Vercel from slow WordPress sequential requests
        return await getAllProductSlugs(1000);
      } catch (error) {
        console.error("Error fetching product slugs for sitemap:", error);
        return [];
      }
    })(),
    (async () => {
      try {
        return await getAllPostSlugs();
      } catch (error) {
        console.error("Error fetching post slugs for sitemap:", error);
        return [];
      }
    })(),
    (async () => {
      try {
        const rawCategories = await getCategories();
        const paths: string[] = [];
        rawCategories.forEach((cat) => {
          if (cat.slug) {
            paths.push(`/categories/${cat.slug}`);
          }
          cat.subcategories?.forEach((sub) => {
            if (sub.slug) {
              paths.push(`/categories/${cat.slug}?category=${sub.slug}`);
            }
          });
        });
        return paths;
      } catch (error) {
        console.error("Error fetching categories for sitemap:", error);
        return [];
      }
    })(),
  ]);

  // 3. Define standard static pages
  const staticPages = [
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

  // Map static pages to sitemap entries
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changefreq,
    priority: page.priority,
  }));

  // Map category pages to sitemap entries
  const categoryEntries: MetadataRoute.Sitemap = categories.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Map dynamic products to sitemap entries
  const productEntries: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${baseUrl}/products/${prod.slug}`,
    lastModified: prod.date ? new Date(prod.date) : new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Map guide/blog posts to sitemap entries
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/guides/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries, ...postEntries];
}
