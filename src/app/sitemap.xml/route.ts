import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://discountqualityproducts.co.uk";
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-categories.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-products.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
