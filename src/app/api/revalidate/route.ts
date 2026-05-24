import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cache invalidation endpoint.
 * Called by the ingestion engine at the end of each upload run to flush
 * the product cache so new items appear on the storefront immediately.
 *
 * Usage:
 *   POST /api/revalidate
 *   Header: x-revalidate-secret: <REVALIDATE_SECRET from .env.local>
 *   Body: { "tags": ["wc-products"] }   (optional — defaults to all product tags)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tags: string[] = ["wc-products", "wc-categories"];
  try {
    const body = await req.json();
    if (Array.isArray(body?.tags) && body.tags.length > 0) {
      tags = body.tags;
    }
  } catch {
    // No body or invalid JSON — use the default tag list
  }

  // @ts-expect-error - Next.js 16 types incorrectly require a second profile argument
  tags.forEach((tag) => revalidateTag(tag));

  return NextResponse.json({
    revalidated: true,
    tags,
    timestamp: new Date().toISOString(),
  });
}
