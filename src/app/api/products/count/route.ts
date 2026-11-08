import { NextResponse } from "next/server";
import { getTotalProductCount, getFormattedProductCount } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const total = await getTotalProductCount();
    const label = getFormattedProductCount(total);
    return NextResponse.json({
      total,
      label,
    });
  } catch (error) {
    console.error("Error in /api/products/count:", error);
    return NextResponse.json(
      { total: 15156, label: "15,000+" },
      { status: 200 }
    );
  }
}
