import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cache invalidation endpoint.
 * Called by the ingestion engine or admin tools to selectively flush caches.
 *
 * IMPORTANT: Callers MUST specify which tags/paths to invalidate.
 * Using "wc-products" invalidates EVERY cached product page and should be
 * avoided — prefer per-product tags like "product-{slug}" instead.
 *
 * Usage:
 *   POST /api/revalidate
 *   Header: x-revalidate-secret: <REVALIDATE_SECRET from .env.local>
 *   Body: { "tags": ["product-my-slug"], "paths": ["/products/my-slug"] }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tags: string[] = [];
  let paths: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.tags) && body.tags.length > 0) {
      tags = body.tags;
    }
    if (Array.isArray(body?.paths)) {
      paths = body.paths;
    }
  } catch {
    // No body or invalid JSON — tags stays empty (safe no-op)
  }

  // Guard: refuse to run with no tags AND no paths (caller probably forgot the body)
  if (tags.length === 0 && paths.length === 0) {
    console.warn("[revalidate] Called with no tags or paths — returning no-op to prevent accidental mass invalidation.");
    return NextResponse.json({
      revalidated: false,
      reason: "No tags or paths specified. You must explicitly specify what to invalidate.",
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  // Warn if the nuclear "wc-products" tag is used — it invalidates ALL product caches
  if (tags.includes("wc-products")) {
    console.warn(`[revalidate] ⚠ Nuclear tag "wc-products" used — this will invalidate ALL cached product data and trigger mass ISR writes.`);
  }

  console.log(`[revalidate] Invalidating ${tags.length} tag(s): [${tags.join(", ")}] and ${paths.length} path(s): [${paths.join(", ")}]`);

  // @ts-expect-error - Next.js 16 types incorrectly require a second profile argument
  tags.forEach((tag) => revalidateTag(tag));
  
  paths.forEach((path) => {
    if (path.startsWith("/")) {
      revalidatePath(path);
    }
  });

  return NextResponse.json({
    revalidated: true,
    tags,
    paths,
    timestamp: new Date().toISOString(),
  });
}

