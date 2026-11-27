import { NextResponse } from "next/server";
import { getTotalProductCount, getFormattedProductCount } from "@/lib/wordpress";

export const revalidate = 86400;

export async function GET() {
  try {
    const total = await getTotalProductCount();
    const label = getFormattedProductCount(total);
    return NextResponse.json(
      {
        total,
        label,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/products/count:", error);
    return NextResponse.json(
      { total: 15156, label: "15,000+" },
      { status: 200 }
    );
  }
}
