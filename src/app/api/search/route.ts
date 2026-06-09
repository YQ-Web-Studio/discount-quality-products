import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/wordpress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const results = await searchProducts(q, 8);
    return NextResponse.json(results, {
      status: 200,
      headers: {
        // Cache at CDN / browser for 5 min, stale-while-revalidate for 10 min
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
