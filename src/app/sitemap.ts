import { MetadataRoute } from "next";
import { getAllProductSlugs, getAllPostSlugs } from "@/lib/wordpress";
import { getCategories } from "@/lib/woocommerce";

export const revalidate = 86400; // Revalidate sitemap once per day (in seconds)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.discountproducts.co.uk";

  // 1. Fetch active products from WordPress backend
  let products: { slug: string; date: string }[] = [];
  try {
    products = await getAllProductSlugs();
  } catch (error) {
    console.error("Error fetching product slugs for sitemap:", error);
  }

  // 2a. Fetch published blog/guide posts
  let posts: { slug: string; date: string }[] = [];
  try {
    posts = await getAllPostSlugs();
  } catch (error) {
    console.error("Error fetching post slugs for sitemap:", error);
  }

  // 2. Fetch categories from WooCommerce backend
  let categories: string[] = [];
  try {
    const rawCategories = await getCategories();
    rawCategories.forEach((cat) => {
      if (cat.slug) {
        categories.push(`/categories/${cat.slug}`);
      }
      cat.subcategories?.forEach((sub) => {
        if (sub.slug) {
          categories.push(`/categories/${cat.slug}?category=${sub.slug}`);
        }
      });
    });
  } catch (error) {
    console.error("Error fetching categories for sitemap:", error);
  }

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
