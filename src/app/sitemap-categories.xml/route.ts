import { NextResponse } from "next/server";
import { getCategories } from "@/lib/woocommerce";

export async function GET() {
  const baseUrl = "https://discountqualityproducts.co.uk";
  
  try {
    const categories = await getCategories();
    
    // Flatten dynamic parent categories and child subcategories
    const categoryUrls: string[] = [];
    categories.forEach((cat) => {
      if (cat.slug) {
        categoryUrls.push(`${baseUrl}/shop?category=${cat.slug}`);
      }
      cat.subcategories?.forEach((sub) => {
        if (sub.slug) {
          categoryUrls.push(`${baseUrl}/shop?category=${cat.slug}&subcategory=${sub.slug}`);
        }
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${categoryUrls.map(url => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('').trim()}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Categories sitemap generation error:", error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
