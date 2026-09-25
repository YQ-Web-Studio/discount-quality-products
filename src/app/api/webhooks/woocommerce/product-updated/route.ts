import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    console.error("[woocommerce-product-webhook] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch (err) {
    console.error("[woocommerce-product-webhook] Failed to read body text:", err);
    return NextResponse.json({ error: "Failed to read body text" }, { status: 400 });
  }

  if (!bodyText || bodyText.trim() === "") {
    return NextResponse.json({ success: true, message: "Ping verified" });
  }

  let product: any;
  try {
    product = JSON.parse(bodyText);
  } catch (err) {
    return NextResponse.json({ success: true, message: "Non-JSON verified" });
  }

  const { slug, id, webhook_id } = product;
  if (webhook_id && !slug) {
    return NextResponse.json({ success: true, message: "Ping verified" });
  }

  if (slug) {
    console.log(`[woocommerce-product-webhook] Revalidating cache for product #${id} (${slug})`);
    try {
      // @ts-expect-error Next.js 16 profile argument
      revalidateTag(`product-${slug}`);
      // @ts-expect-error Next.js 16 profile argument
      revalidateTag(`wc-product-${slug}`);
      revalidatePath(`/products/${slug}`);
      revalidatePath("/shop");
      revalidatePath("/");
    } catch (revalidateErr) {
      console.error("[woocommerce-product-webhook] Revalidation error:", revalidateErr);
    }
  }

  return NextResponse.json({ success: true, revalidated: slug || null });
}
