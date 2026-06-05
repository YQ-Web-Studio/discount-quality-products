import { NextResponse } from "next/server";
import { fetchWooCommerceShippingRates } from "@/lib/checkout";

export async function POST(req: Request) {
  try {
    const { items, address } = await req.json();
    if (!items || !address) {
      return NextResponse.json({ error: "Missing items or address in request." }, { status: 400 });
    }

    const rates = await fetchWooCommerceShippingRates(items, address);
    return NextResponse.json({ shippingRates: rates });
  } catch (error: any) {
    console.error("Failed to dynamically fetch shipping rates:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch shipping rates." }, { status: 500 });
  }
}
