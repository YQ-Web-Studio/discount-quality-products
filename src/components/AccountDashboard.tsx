"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_SHIMMER, THUMB_SHIMMER } from "@/lib/shimmer";
import {
  Heart,
  Loader2,
  LogOut,
  User,
  LayoutDashboard,
  Package,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Box,
  ShoppingCart,
  MapPin,
  CreditCard,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth-types";
import type { MappedProduct, WooCommerceOrderResponse } from "@/lib/woocommerce";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/lib/useWishlist";
import { useRecentlyViewed } from "@/lib/useRecentlyViewed";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { useBasket } from "@/lib/useBasket";
import { useMiniCart } from "@/lib/useMiniCart";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { IdentityForm } from "@/components/settings/IdentityForm";
import { AddressForm } from "@/components/settings/AddressForm";
import { WalletSection } from "@/components/settings/WalletSection";
import type { WooCommerceCustomer } from "@/lib/woocommerce";

interface AccountDashboardProps {
  initialUser: AuthUser | null;
  initialWishlistItems: MappedProduct[];
  initialOrders?: WooCommerceOrderResponse[];
  initialCustomer?: WooCommerceCustomer | null;
  wishlistLoadError?: string | null;
}

type TabType = "dashboard" | "orders" | "wishlist" | "profile";

function formatPrice(product: MappedProduct) {
  return product.salePrice || product.price || product.regularPrice || "View details";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AccountDashboard({
  initialUser,
  initialWishlistItems,
  initialOrders = [],
  initialCustomer = null,
  wishlistLoadError = null,
}: AccountDashboardProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    wishlistIds,
    isLoading: wishlistIsLoading,
    error: wishlistError,
    toggleWishlist,
    isPending,
  } = useWishlist();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const addItem = useBasket((s) => s.addItem);
  const basketItems = useBasket((s) => s.items);
  const openMiniCart = useMiniCart((s) => s.open);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  const activeUser = user || initialUser;
  const userKey = activeUser?.id ? `user_${activeUser.id}` : "guest";
  const recentlyViewedItems = useRecentlyViewed((state) => state.itemsByUser[userKey] || []);
  const wishlistStatusMessage = wishlistError || wishlistLoadError;

  const wishlistItems = useMemo(() => {
    if (wishlistIsLoading) {
      return initialWishlistItems;
    }

    if (!wishlistIds.length) {
      return [];
    }

    const wishlistMap = new Map(
      initialWishlistItems.map((product) => [product.databaseId, product])
    );

    return wishlistIds
      .map((wishlistId) => wishlistMap.get(wishlistId))
      .filter((product): product is MappedProduct => Boolean(product));
  }, [initialWishlistItems, wishlistIds, wishlistIsLoading]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleQuickAdd(e: React.MouseEvent<HTMLButtonElement>, product: MappedProduct) {
    e.preventDefault();
    e.stopPropagation();

    const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK' || product.stockStatus === 'outofstock';
    if (isOutOfStock) return;

    const priceString = product.price || product.regularPrice || "0";
    const numericPrice = parseFloat(priceString.replace(/[^0-9.-]+/g, "")) || 0;

    const item = {
      id: String(product.databaseId),
      name: decodeHtmlEntities(product.name),
      price: numericPrice,
      priceFormatted: formatPrice(product),
      image: product.image?.sourceUrl,
      slug: product.slug,
    };

    addItem(item, 1);
    
    if (wishlistIds.includes(product.databaseId)) {
      void toggleWishlist(product.databaseId).catch(() => undefined);
    }
    
    openMiniCart({ ...item, quantity: 1 });
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Package },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "profile", label: "Settings", icon: Settings },
  ] as const;

  return (
    <section className="min-h-screen bg-zinc-50 px-0 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-4 sm:px-0">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-0.5 shadow-sm ring-1 ring-zinc-200">
              {activeUser?.avatarUrl && !avatarError ? (
                <Image
                  src={activeUser.avatarUrl}
                  alt={activeUser.name}
                  width={64}
                  height={64}
                  className="h-full w-full rounded-lg object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-zinc-50 to-white text-primary shadow-inner">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">My Account</p>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                  {activeUser?.name}
                </h1>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all lg:hidden",
                    activeTab === "profile" 
                      ? "bg-primary text-white shadow-md ring-2 ring-primary/20" 
                      : "bg-white border border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 shadow-sm"
                  )}
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>


        </div>

        <div className="mb-6 overflow-x-auto px-4 pb-2 lg:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex items-center justify-center gap-2">
            {navItems.filter(item => item.id !== "profile").map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  activeTab === item.id
                    ? "bg-primary text-white font-bold shadow-md"
                    : "bg-white border border-zinc-200 text-zinc-600 font-medium hover:border-zinc-300 hover:text-zinc-900 shadow-sm"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block space-y-6">
            <nav className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors",
                    activeTab === item.id
                      ? "bg-primary/10 font-bold text-primary"
                      : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-primary" : "text-zinc-400")} />
                  {item.label}
                  {activeTab === item.id && (
                    <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                  )}
                </button>
              ))}

              <div className="my-2 border-t border-zinc-100" />

              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
                Sign Out
              </button>
            </nav>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-emerald-600 p-6 shadow-md text-white">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <p className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Customer Support
              </p>
              <h3 className="relative z-10 mt-2 text-base font-bold text-white">
                Need help?
              </h3>
              <p className="relative z-10 mt-1 text-sm text-emerald-50">
                Contact our team for help with your account or orders.
              </p>
              <Link
                href="/contact"
                className="relative z-10 mt-4 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-zinc-50"
              >
                Contact Us
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="min-h-[600px] rounded-none border-x-0 border-y border-zinc-200 bg-white p-4 shadow-none sm:rounded-xl sm:border-x sm:p-8 sm:shadow-sm">
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Welcome to your account. Here you can manage your orders, view your wishlist, and update your profile settings.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
                  {/* Orders Card */}
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-emerald-500/10 text-primary shadow-sm ring-1 ring-primary/20 transition-all duration-300 group-hover:from-primary group-hover:to-emerald-500 group-hover:text-white">
                          <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Orders</p>
                        <h3 className="mt-1 text-xl sm:text-2xl font-bold text-zinc-900">{initialOrders.length}</h3>
                      </div>

                      {/* Image Previews */}
                      {initialOrders.length > 0 && (
                        <div className="flex items-center -space-x-2 pt-2">
                          {initialOrders
                            .flatMap(order => order.line_items)
                            .filter(item => item.image?.src)
                            .slice(0, 4)
                            .map((item, idx) => (
                              <div key={idx} className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full border-2 border-white img-shimmer shadow-sm ring-1 ring-zinc-200">
                                <Image src={item.image!.src} alt="Preview" fill sizes="40px" className="object-cover" placeholder="blur" blurDataURL={THUMB_SHIMMER} />
                              </div>
                            ))}
                          {initialOrders.flatMap(order => order.line_items).filter(item => item.image?.src).length > 4 && (
                            <div className="relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[9px] sm:text-[10px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                              +{initialOrders.flatMap(order => order.line_items).filter(item => item.image?.src).length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Basket Card */}
                  <button
                    onClick={() => openMiniCart()}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-emerald-500/10 text-primary shadow-sm ring-1 ring-primary/20 transition-all duration-300 group-hover:from-primary group-hover:to-emerald-500 group-hover:text-white">
                          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Basket</p>
                        <h3 className="mt-1 text-xl sm:text-2xl font-bold text-zinc-900">{basketItems.length}</h3>
                      </div>

                      {/* Image Previews */}
                      {basketItems.length > 0 && (
                        <div className="flex items-center -space-x-2 pt-2">
                          {basketItems.filter(item => item.image).slice(0, 4).map((item, idx) => (
                            <div key={idx} className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full border-2 border-white img-shimmer shadow-sm ring-1 ring-zinc-200">
                              <Image src={item.image!} alt="Preview" fill sizes="40px" className="object-cover" placeholder="blur" blurDataURL={THUMB_SHIMMER} />
                            </div>
                          ))}
                          {basketItems.filter(item => item.image).length > 4 && (
                            <div className="relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[9px] sm:text-[10px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                              +{basketItems.filter(item => item.image).length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Wishlist Card */}
                  <button
                    onClick={() => setActiveTab("wishlist")}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-emerald-500/10 text-primary shadow-sm ring-1 ring-primary/20 transition-all duration-300 group-hover:from-primary group-hover:to-emerald-500 group-hover:text-white">
                          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Wishlist</p>
                        <h3 className="mt-1 text-xl sm:text-2xl font-bold text-zinc-900">{wishlistItems.length}</h3>
                      </div>

                      {/* Image Previews */}
                      {wishlistItems.filter(item => item.image?.sourceUrl).length > 0 && (
                        <div className="flex items-center -space-x-2 pt-2">
                          {wishlistItems.filter(item => item.image?.sourceUrl).slice(0, 4).map((item, idx) => (
                            <div key={idx} className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full border-2 border-white img-shimmer shadow-sm ring-1 ring-zinc-200">
                              <Image src={item.image!.sourceUrl} alt="Preview" fill sizes="40px" className="object-cover" placeholder="blur" blurDataURL={THUMB_SHIMMER} />
                            </div>
                          ))}
                          {wishlistItems.filter(item => item.image?.sourceUrl).length > 4 && (
                            <div className="relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[9px] sm:text-[10px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                              +{wishlistItems.filter(item => item.image?.sourceUrl).length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-base font-bold text-zinc-900">Recently Viewed</h3>
                  </div>
                  {recentlyViewedItems.length > 0 ? (
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                      {recentlyViewedItems.slice(0, 4).map((product) => {
                        // Cast RecentlyViewedItem to a partial MappedProduct and provide defaults for missing fields
                        const mappedProduct: MappedProduct = {
                          ...product,
                          id: `rv-${product.databaseId}`,
                          permalink: `/products/${product.slug}`,
                          categories: [],
                          attributes: [],
                          stockStatus: product.stockStatus || 'instock',
                          price: product.price || null,
                          regularPrice: product.regularPrice || null,
                          salePrice: product.salePrice || null,
                          image: product.image ? {
                            sourceUrl: product.image.sourceUrl,
                            altText: product.image.altText || product.name
                          } : null,
                          manageStock: false,
                          stockQuantity: null,
                        };

                        const isOutOfStock = mappedProduct.stockStatus === 'OUT_OF_STOCK' || mappedProduct.stockStatus === 'outofstock';
                        const isProductWishlisted = wishlistIds.includes(mappedProduct.databaseId);
                        const pending = isPending(mappedProduct.databaseId);
                        const decodedName = decodeHtmlEntities(mappedProduct.name);

                        return (
                          <div key={mappedProduct.databaseId} className="group relative flex flex-col">
                            <div className="relative aspect-square w-full overflow-hidden rounded-xl img-shimmer">
                              {mappedProduct.image?.sourceUrl ? (
                                <Image
                                  src={mappedProduct.image.sourceUrl}
                                  alt={mappedProduct.image.altText || decodedName}
                                  fill
                                  sizes="(max-width: 640px) 50vw, 25vw"
                                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                  placeholder="blur"
                                  blurDataURL={PRODUCT_SHIMMER}
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50">
                                  <Box className="h-8 w-8 text-zinc-200" />
                                  <span className="mt-2 text-[10px] font-medium uppercase tracking-tighter text-zinc-300">
                                    No Preview
                                  </span>
                                </div>
                              )}

                              {/* Wishlist Button (Top Right) */}
                              <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group/wishlist">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    void toggleWishlist(mappedProduct.databaseId);
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-xl ring-1 ring-white/50 backdrop-blur-md transition-all duration-200 hover:bg-white"
                                >
                                  {pending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={cn(
                                        "h-4 w-4 transition-colors",
                                        isProductWishlisted ? "fill-zinc-950 text-zinc-950" : "group-hover/wishlist:fill-zinc-950"
                                      )}
                                    />
                                  )}
                                </button>
                              </div>

                              {/* Blur Overlay (Bottom) */}
                              <div className="absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white/20 to-transparent opacity-0 backdrop-blur-md transition-opacity duration-500 group-hover:opacity-100 pointer-events-none hidden lg:block" />

                              {/* Add to Basket Bar (Floating Bottom) */}
                              <div className="absolute inset-x-3 bottom-3 z-20 translate-y-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 hidden lg:block">
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickAdd(e, mappedProduct)}
                                  disabled={isOutOfStock}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur-sm transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                                >
                                  {isOutOfStock ? (
                                    "Sold Out"
                                  ) : (
                                    <>
                                      <ShoppingCart className="h-3.5 w-3.5" />
                                      {isProductWishlisted ? "Move to Basket" : "Add to Basket"}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <Link href={`/products/${mappedProduct.slug}`} className="absolute inset-0 z-0" />

                            <div className="flex flex-col pt-3">
                              <h3 className="line-clamp-2 text-xs font-medium text-zinc-900">
                                {decodedName}
                              </h3>
                              <p className="mt-1 text-sm font-bold tracking-tight text-zinc-900">
                                {mappedProduct.price || mappedProduct.regularPrice || 'View Details'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-zinc-500">You have not viewed any products yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Order History</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    View and track your recent orders and receipts.
                  </p>
                </div>

                {initialOrders.length > 0 ? (
                  <div className="space-y-4">
                    {initialOrders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      
                      return (
                        <div 
                          key={order.id} 
                          className={cn(
                            "overflow-hidden rounded-xl border transition-all duration-300",
                            isExpanded ? "border-zinc-300 bg-zinc-50/30 shadow-md" : "border-zinc-200 bg-white hover:border-zinc-300"
                          )}
                        >
                          {/* Order Header (Summary) */}
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="flex w-full items-center justify-between p-5 text-left sm:p-6"
                          >
                            <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-8">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Order</p>
                                <p className="text-sm font-bold text-zinc-900">#{order.number}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date</p>
                                <p className="text-sm text-zinc-700">{formatDate(order.date_created)}</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total</p>
                                <p className="text-sm font-bold text-zinc-900">{order.currency} {order.total}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</p>
                                <span className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                  order.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                                  order.status === "processing" ? "bg-blue-100 text-blue-800" :
                                  "bg-zinc-100 text-zinc-800"
                                )}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="hidden items-center -space-x-2 sm:flex">
                                {order.line_items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-zinc-100 shadow-sm ring-1 ring-zinc-200">
                                    {item.image?.src ? (
                                      <Image src={item.image.src} alt="" fill sizes="32px" className="object-cover" placeholder="blur" blurDataURL={THUMB_SHIMMER} />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                                        <Box className="h-3 w-3 text-zinc-300" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {order.line_items.length > 3 && (
                                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[9px] font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                                    +{order.line_items.length - 3}
                                  </div>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-zinc-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-zinc-400" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-zinc-200 bg-white p-5 sm:p-8 animate-in slide-in-from-top-2 duration-300">
                              <div className="grid gap-8 lg:grid-cols-3">
                                {/* Left: Line Items */}
                                <div className="lg:col-span-2 space-y-4">
                                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">Items Purchased</h3>
                                  <div className="divide-y divide-zinc-100">
                                    {order.line_items.map((item) => {
                                      const decodedName = decodeHtmlEntities(item.name);
                                      return (
                                        <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-100 img-shimmer">
                                            {item.image?.src ? (
                                              <Image src={item.image.src} alt={decodedName} fill sizes="64px" className="object-cover" placeholder="blur" blurDataURL={THUMB_SHIMMER} />
                                            ) : (
                                              <div className="flex h-full w-full items-center justify-center">
                                                <Box className="h-6 w-6 text-zinc-200" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-1 flex-col justify-between">
                                            <div>
                                              <h4 className="text-sm font-bold text-zinc-900">{decodedName}</h4>
                                              <p className="text-xs text-zinc-500 mt-1">Quantity: {item.quantity}</p>
                                            </div>
                                            <p className="text-sm font-medium text-zinc-900">£{parseFloat(item.total).toFixed(2)}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="mt-6 space-y-2 rounded-xl bg-zinc-50 p-4">
                                    <div className="flex justify-between text-xs text-zinc-500">
                                      <span>Subtotal</span>
                                      <span>£{(parseFloat(order.total) - parseFloat(order.shipping_total || "0")).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-zinc-500">
                                      <span>Shipping</span>
                                      <span>£{parseFloat(order.shipping_total || "0").toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-bold text-zinc-900">
                                      <span>Total</span>
                                      <span>{order.currency} {order.total}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Metadata / Addresses */}
                                <div className="space-y-6">
                                  {/* Shipping Address */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">
                                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                      Shipping To
                                    </div>
                                    <div className="text-xs text-zinc-600 leading-relaxed">
                                      <p className="font-bold text-zinc-900">{order.shipping.first_name} {order.shipping.last_name}</p>
                                      <p>{order.shipping.address_1}</p>
                                      {order.shipping.address_2 && <p>{order.shipping.address_2}</p>}
                                      <p>{order.shipping.city}, {order.shipping.postcode}</p>
                                      <p>{order.shipping.country}</p>
                                    </div>
                                  </div>

                                  {/* Payment Method */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-900 border-b border-zinc-100 pb-2">
                                      <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
                                      Payment Method
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                                      <span className="capitalize">{order.payment_method_title || order.payment_method}</span>
                                    </div>
                                  </div>


                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-24 text-center">
                    <Package className="h-8 w-8 text-zinc-300" />
                    <h3 className="mt-4 text-base font-bold text-zinc-900">No orders found</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      You have not placed any orders yet.
                    </p>
                    <Link href="/shop" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
                      Start Shopping
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === "wishlist" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Your Wishlist</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Products you save will appear here.
                    </p>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">{wishlistItems.length} items</span>
                </div>

                {wishlistStatusMessage && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {wishlistStatusMessage}
                  </div>
                )}

                {wishlistItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
                    {wishlistItems.map((product) => {
                      const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK' || product.stockStatus === 'outofstock';
                      const isProductWishlisted = wishlistIds.includes(product.databaseId);
                      const pending = isPending(product.databaseId);
                      const decodedName = decodeHtmlEntities(product.name);

                      return (
                        <div key={product.databaseId} className="group relative flex flex-col">
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl img-shimmer">
                            {product.image?.sourceUrl ? (
                              <Image
                                src={product.image.sourceUrl}
                                alt={product.image.altText || decodedName}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                placeholder="blur"
                                blurDataURL={PRODUCT_SHIMMER}
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50">
                                <Box className="h-8 w-8 text-zinc-200" />
                                <span className="mt-2 text-[10px] font-medium uppercase tracking-tighter text-zinc-300">
                                  No Preview
                                </span>
                              </div>
                            )}

                            {/* Wishlist Button (Top Right) */}
                            <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group/wishlist">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  void toggleWishlist(product.databaseId);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-xl ring-1 ring-white/50 backdrop-blur-md transition-all duration-200 hover:bg-white"
                              >
                                {pending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      isProductWishlisted ? "fill-zinc-950 text-zinc-950" : "group-hover/wishlist:fill-zinc-950"
                                    )}
                                  />
                                )}
                              </button>
                            </div>

                            {/* Blur Overlay (Bottom) */}
                            <div className="absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white/20 to-transparent opacity-0 backdrop-blur-md transition-opacity duration-500 group-hover:opacity-100 pointer-events-none hidden lg:block" />

                            {/* Add to Basket Bar (Floating Bottom) */}
                            <div className="absolute inset-x-3 bottom-3 z-20 translate-y-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 hidden lg:block">
                              <button
                                type="button"
                                onClick={(e) => handleQuickAdd(e, product)}
                                disabled={isOutOfStock}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 shadow-xl ring-1 ring-zinc-200/50 backdrop-blur-sm transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                              >
                                {isOutOfStock ? (
                                  "Sold Out"
                                ) : (
                                  <>
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    {isProductWishlisted ? "Move to Basket" : "Add to Basket"}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" />

                          <div className="flex flex-col pt-5">
                            <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">
                              {decodedName}
                            </h3>
                            <p className="mt-2 text-base font-bold tracking-tight text-zinc-900">
                              {formatPrice(product)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-24 text-center">
                    <Heart className="h-8 w-8 text-zinc-300" />
                    <h3 className="mt-4 text-base font-bold text-zinc-900">Wishlist is empty</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Products you save will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Account settings</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Keep your account details up to date and manage your security.
                  </p>
                </div>

                <div className="divide-y divide-zinc-200/60">
                  <div className="grid gap-6 pb-12 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Personal Information</h3>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                        Update your name, contact email address, and account password.
                      </p>
                    </div>
                    <div className="min-w-0 max-w-2xl space-y-6">
                      <IdentityForm customer={initialCustomer} activeUser={activeUser} />
                      <ChangePasswordForm />
                    </div>
                  </div>

                  <div className="grid gap-6 py-12 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Addresses</h3>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                        Manage your billing and shipping addresses for faster checkout.
                      </p>
                    </div>
                    <div className="min-w-0 max-w-2xl space-y-6">
                      <AddressForm type="billing" customer={initialCustomer} />
                      <AddressForm type="shipping" customer={initialCustomer} />
                    </div>
                  </div>

                  <div className="grid gap-6 py-12 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Wallet</h3>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                        Manage your securely saved payment methods.
                      </p>
                    </div>
                    <div className="min-w-0 max-w-2xl">
                      <WalletSection />
                    </div>
                  </div>

                  <div className="grid gap-6 pt-12 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
                    <div>
                      <h3 className="text-sm font-bold text-rose-700">Danger Zone</h3>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                        Permanently delete your account and all associated data.
                      </p>
                    </div>
                    <div className="min-w-0 max-w-2xl">
                      <DeleteAccountSection />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Mobile Customer Support Block (Bottom) */}
            <div className="mt-6 mx-4 lg:hidden relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-emerald-600 p-6 shadow-md text-white">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <p className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Customer Support
              </p>
              <h3 className="relative z-10 mt-2 text-base font-bold text-white">
                Need help?
              </h3>
              <p className="relative z-10 mt-1 text-sm text-emerald-50">
                Contact our team for help with your account or orders.
              </p>
              <Link
                href="/contact"
                className="relative z-10 mt-4 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-zinc-50 shadow-sm"
              >
                Contact Us
              </Link>
            </div>

            {/* Persistent Sign Out (Mobile) */}
            <div className="mt-12 mb-8 px-4 lg:hidden">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-rose-200 bg-white py-4 text-sm font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
                Sign Out
              </button>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
