import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://discountqualityproducts.co.uk";

  // 1. Core static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/returns`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // 2. Dynamic WooCommerce Product Routes
  // TODO: Once the backend CSV data is imported, we will fetch the ~25,000 product URLs here.
  // Example implementation structure to map over the products:
  //
  // const products = await fetchWooCommerceProducts(); // e.g., [{ slug: '...', updatedAt: '...' }]
  // const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
  //   url: `${baseUrl}/product/${product.slug}`,
  //   lastModified: new Date(product.updatedAt),
  //   changeFrequency: "daily",
  //   priority: 0.6,
  // }));
  //
  const productRoutes: MetadataRoute.Sitemap = []; // Placeholder until data is ready

  return [...staticRoutes, ...productRoutes];
}
