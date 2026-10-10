import { NextResponse } from "next/server";
import { fetchWooCommerceCartSession } from "@/lib/checkout";

export async function POST(req: Request) {
  try {
    const { items, address, couponCode } = await req.json();

    if (!items || !items.length || !couponCode) {
      return NextResponse.json({ error: "Missing items or coupon code." }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: "Cart exceeds maximum allowed items (50)." }, { status: 400 });
    }

    const effectiveAddress = {
      country: address?.country || "GB",
      city: address?.city || "",
      postcode: address?.postcode || "",
      email: address?.email || "",
    };

    const session = await fetchWooCommerceCartSession(items, effectiveAddress, couponCode.trim());

    if (session.couponError) {
      return NextResponse.json(
        { isValid: false, error: session.couponError },
        { status: 400 }
      );
    }

    return NextResponse.json({
      isValid: true,
      couponCode: couponCode.trim().toUpperCase(),
      couponDiscount: session.couponDiscount,
      shippingRates: session.shippingRates,
    });
  } catch (error: any) {
    console.error("[apply-coupon] Validation error:", error);
    return NextResponse.json(
      { isValid: false, error: error.message || "Failed to validate coupon code." },
      { status: 500 }
    );
  }
}
