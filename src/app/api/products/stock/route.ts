import { NextResponse } from "next/server";
import { fetchWooCommerceProductsDirect } from "@/lib/woocommerce";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");

  if (!id && !slug) {
    return NextResponse.json({ error: "Missing id or slug" }, { status: 400 });
  }

  try {
    const params: Record<string, string | number> = { per_page: 1 };
    if (id) {
      params.include = id;
    } else if (slug) {
      params.slug = slug;
    }

    const { products } = await fetchWooCommerceProductsDirect(params);
    const product = products[0];

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: product.databaseId,
        slug: product.slug,
        stockStatus: product.stockStatus,
        manageStock: product.manageStock,
        stockQuantity: product.stockQuantity,
        bypassLowStock: Boolean(product.bypassLowStock),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[api/products/stock] Error fetching real-time stock:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
