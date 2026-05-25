import { NextResponse } from "next/server";
import { getAllProductSlugs } from "@/lib/wordpress";

export async function GET() {
  const baseUrl = "https://discountqualityproducts.co.uk";
  
  try {
    // Dynamically retrieve up to 10,000 active products via cursor-based batching
    const products = await getAllProductSlugs(10000);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${products.map(p => `
  <url>
    <loc>${baseUrl}/products/${p.slug}</loc>
    <lastmod>${p.date.split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`).join('').trim()}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Products sitemap generation error:", error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
