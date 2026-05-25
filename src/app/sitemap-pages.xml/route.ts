import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://discountqualityproducts.co.uk";
  
  const pages = [
    { loc: `${baseUrl}`, changefreq: "weekly", priority: "1.0" },
    { loc: `${baseUrl}/shop`, changefreq: "daily", priority: "0.9" },
    { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.6" },
    { loc: `${baseUrl}/returns`, changefreq: "monthly", priority: "0.5" },
    { loc: `${baseUrl}/shipping`, changefreq: "monthly", priority: "0.5" },
    { loc: `${baseUrl}/privacy`, changefreq: "monthly", priority: "0.3" },
    { loc: `${baseUrl}/terms`, changefreq: "monthly", priority: "0.3" },
    { loc: `${baseUrl}/refunds`, changefreq: "monthly", priority: "0.3" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(p => `
  <url>
    <loc>${p.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('').trim()}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
