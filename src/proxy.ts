import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DISCONTINUED_PRODUCTS_REGISTRY } from "./lib/discontinued-products";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // 1. Decode percent-encoded and double percent-encoded character strings in path
  let decodedPath = path;
  try {
    let prevPath = "";
    while (decodedPath !== prevPath) {
      prevPath = decodedPath;
      decodedPath = decodeURIComponent(decodedPath);
    }
  } catch (err) {
    decodedPath = path;
  }

  // If path changed due to percent-encoding, 301 redirect to normalized path
  if (decodedPath !== path) {
    const destinationUrl = new URL(decodedPath, request.url);
    destinationUrl.search = url.search;
    return NextResponse.redirect(destinationUrl, 301);
  }

  // Pattern match for product detail page requests: /products/[slug]
  const productMatch = decodedPath.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const slug = productMatch[1];
    const discontinuedRule = DISCONTINUED_PRODUCTS_REGISTRY[slug];

    if (discontinuedRule) {
      // 301 Permanent Redirect to successor product or category
      if (discontinuedRule.status === 301 && discontinuedRule.redirectUrl) {
        const destinationUrl = new URL(discontinuedRule.redirectUrl, request.url);
        return NextResponse.redirect(destinationUrl, 301);
      }

      // 410 Gone with a polished, self-contained, high-performance HTML error view
      if (discontinuedRule.status === 410) {
        const goneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Product Permanently Discontinued | Discount Quality Products</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f9fafb;
      color: #18181b;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .header {
      background-color: #ffffff;
      border-bottom: 1px solid #e4e4e7;
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-weight: 800;
      font-size: 1.25rem;
      letter-spacing: -0.025em;
      color: #18181b;
      text-decoration: none;
    }
    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 32rem;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      text-align: center;
    }
    .badge {
      background-color: #fee2e2;
      color: #ef4444;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin: 0 0 1rem 0;
      line-height: 1.15;
    }
    p {
      color: #71717a;
      font-size: 1rem;
      line-height: 1.6;
      margin: 0 0 2rem 0;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background-color: #18181b;
      color: #ffffff;
      border: 1px solid #18181b;
    }
    .btn-primary:hover {
      background-color: #27272a;
      border-color: #27272a;
    }
    .btn-secondary {
      background-color: #ffffff;
      color: #18181b;
      border: 1px solid #d4d4d8;
    }
    .btn-secondary:hover {
      background-color: #f4f4f5;
    }
    .footer {
      border-top: 1px solid #e4e4e7;
      background-color: #ffffff;
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #a1a1aa;
    }
    @media (min-width: 640px) {
      .btn-group {
        flex-direction: row;
      }
      .btn {
        flex: 1;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="logo">Discount Quality Products</a>
  </div>
  <div class="container">
    <div class="badge">410 Gone</div>
    <h1>Product Permanently Discontinued</h1>
    <p>We apologise for the inconvenience, but the item you are looking for has been permanently discontinued and is no longer available. To preserve structural crawl budget and indexing health, this page has been decommissioned.</p>
    <div class="btn-group">
      <a href="/shop" class="btn btn-primary">Browse All Departments</a>
      <a href="/" class="btn btn-secondary">Back to Home</a>
    </div>
  </div>
  <div class="footer">
    &copy; 2026 Discount Quality Products Ltd. All rights reserved. Registered UK Company.
  </div>
</body>
</html>`;

        return new NextResponse(goneHtml, {
          status: 410,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/products/:slug*",
};
