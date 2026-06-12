import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/AccountDashboard";
import {
  fetchWordPressWishlistIds,
  getCurrentWordPressSession,
} from "@/lib/wordpress-auth.server";
import { orderProductsByWishlist } from "@/lib/wordpress-auth";
import {
  fetchWooCommerceOrders,
  fetchWooCommerceProducts,
  getWooCommerceCustomer,
} from "@/lib/woocommerce";
import type { MappedProduct, WooCommerceOrderResponse, WooCommerceCustomer } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "My Account",
  description: "View your account details and wishlist.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getCurrentWordPressSession();

  if (!session) {
    redirect("/login");
  }

  const { token, user } = session;

  let wishlistItems: MappedProduct[] = [];
  let orders: WooCommerceOrderResponse[] = [];
  let customer: WooCommerceCustomer | null = null;
  let wishlistLoadError: string | null = null;
  let ordersLoadError: string | null = null;

  // Fetch Wishlist, Orders, and Customer in parallel
  try {
    const [wishlistIds, fetchedOrders, fetchedCustomer] = await Promise.all([
      fetchWordPressWishlistIds(token).catch(() => [] as number[]),
      fetchWooCommerceOrders({ customer: user.id }).catch((err) => {
        console.error("Orders fetch error:", err);
        return [] as WooCommerceOrderResponse[];
      }),
      getWooCommerceCustomer(user.id).catch((err) => {
        console.error("Customer fetch error:", err);
        return null;
      }),
    ]);

    orders = fetchedOrders;
    customer = fetchedCustomer;

    if (wishlistIds.length > 0) {
      const { products } = await fetchWooCommerceProducts({
        include: wishlistIds.join(","),
        per_page: 100,
      });

      wishlistItems = orderProductsByWishlist(products, wishlistIds);
    }
  } catch (error) {
    wishlistLoadError =
      error instanceof Error && error.message.trim()
        ? error.message
        : "We could not load your account data right now.";
  }

  return (
    <AccountDashboard
      initialUser={user}
      initialWishlistItems={wishlistItems}
      initialOrders={orders}
      initialCustomer={customer}
      wishlistLoadError={wishlistLoadError}
    />
  );
}
