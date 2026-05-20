import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutFlow from "./CheckoutFlow";
import { getProductBySlug } from "@/lib/wordpress";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase securely with card or PayPal.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Parse a WooCommerce price string like "£2.49" or "2.49" into a float.
 * Returns 0 for unparseable values.
 */
function parsePriceString(raw?: string | null): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default async function CheckoutPage(props: PageProps) {
  const searchParams = await props.searchParams;
  
  const buyNowSlug = typeof searchParams.buyNow === "string" ? searchParams.buyNow : null;
  const qtyRaw = typeof searchParams.qty === "string" ? searchParams.qty : "1";
  const quantity = Math.max(1, parseInt(qtyRaw, 10) || 1);

  let directCheckoutItem = undefined;

  if (buyNowSlug) {
    const product = await getProductBySlug(buyNowSlug);
    if (product) {
      directCheckoutItem = {
        id: product.id,
        name: product.name,
        price: parsePriceString(product.price),
        priceFormatted: product.price || "POA",
        image: product.image?.sourceUrl,
        slug: product.slug,
        quantity,
      };
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-primary" />
        </div>
      }
    >
      <CheckoutFlow directCheckoutItem={directCheckoutItem} />
    </Suspense>
  );
}
