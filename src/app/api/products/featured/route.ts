import { NextResponse } from "next/server";
import { getSmartFeaturedProducts } from "@/lib/wordpress";

export const revalidate = 3600;

export async function GET() {
  try {
    const products = await getSmartFeaturedProducts();
    return NextResponse.json(products, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error in /api/products/featured:", error);
    return NextResponse.json([], { status: 200 });
  }
}
