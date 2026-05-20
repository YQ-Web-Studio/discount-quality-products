import { NextResponse } from "next/server";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";

export async function POST(request: Request) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wpUrl = (process.env.NEXT_PUBLIC_WORDPRESS_API_URL || process.env.WOOCOMMERCE_URL)?.replace(/\/$/, "");
  
  if (!wpUrl) {
    return NextResponse.json({ error: "Server configuration error: missing WP URL" }, { status: 500 });
  }

  try {
    const { payment_method_id } = await request.json();

    if (!payment_method_id) {
      return NextResponse.json({ error: "payment_method_id is required" }, { status: 400 });
    }

    console.log(`[api/wallet/add-card] Sending PM ID to WP: ${payment_method_id}`);

    const response = await fetch(`${wpUrl}/wp-json/custom/v1/add-payment-method`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ payment_method_id }),
      cache: "no-store",
    });

    const text = await response.text();
    console.log(`[api/wallet/add-card] WP Raw Response:`, text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse WP response as JSON. Raw response:", text);
      return NextResponse.json(
        { error: `WordPress Fatal Error: ${text.substring(0, 200)}...` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("WP API returned an error:", data);
      return NextResponse.json(
        { error: data.message || data.error || "Failed to add payment method" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding payment method (Next.js):", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add payment method" },
      { status: 500 }
    );
  }
}
