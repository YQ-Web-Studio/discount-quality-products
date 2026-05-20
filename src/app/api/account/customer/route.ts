import { NextResponse } from "next/server";
import { getCurrentWordPressSession } from "@/lib/wordpress-auth.server";
import { getWooCommerceCustomer, updateWooCommerceCustomer } from "@/lib/woocommerce";

export async function GET(request: Request) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await getWooCommerceCustomer(session.user.id);
    
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: "Failed to load customer profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getCurrentWordPressSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const updatedCustomer = await updateWooCommerceCustomer(session.user.id, data);
    
    if (!updatedCustomer) {
      return NextResponse.json({ error: "Failed to update customer" }, { status: 400 });
    }

    return NextResponse.json({ customer: updatedCustomer, success: true });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update customer profile" }, { status: 500 });
  }
}
