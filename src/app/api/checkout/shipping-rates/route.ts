import { NextResponse } from "next/server";
import { fetchWooCommerceCartSession } from "@/lib/checkout";

export async function POST(req: Request) {
  try {
    const { items, address, couponCode } = await req.json();
    if (!items || !items.length || !address) {
      return NextResponse.json({ error: "Missing items or address in request." }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: "Cart exceeds maximum allowed items (50)." }, { status: 400 });
    }

    const { shippingRates, couponDiscount, couponError } = await fetchWooCommerceCartSession(items, address, couponCode);
    return NextResponse.json({ shippingRates, couponDiscount, couponError });
  } catch (error: any) {
    console.error("Failed to dynamically fetch shipping rates:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch shipping rates." }, { status: 500 });
  }
}
