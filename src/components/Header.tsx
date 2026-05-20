"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SearchCommand } from "./SearchCommand";
import { ShoppingCart, Mail, Menu, X, ChevronDown, User, Heart } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { navigationCategories } from "@/lib/navigationConfig";
import { useBasket } from "@/lib/useBasket";
import { useMiniCart } from "@/lib/useMiniCart";
import { useWishlist } from "@/lib/useWishlist";
import { useIsMounted } from "@/hooks/useIsMounted";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const basketCount = useBasket((s) => s.itemCount);
  const { wishlistIds } = useWishlist();
  const openMiniCart = useMiniCart((s) => s.open);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "sticky top-0 z-[9999] w-full border-b transition-all duration-300",
        isScrolled 
          ? "border-zinc-200/50 bg-white/80 backdrop-blur-xl shadow-sm" 
          : "border-zinc-100 !bg-white shadow-none"
      )}
    >
      {/* Top Utility Bar */}
      <div className="bg-primary/85 backdrop-blur-md py-2 text-primary-foreground">
        <div className="mx-auto flex max-w-[1440px] 2xl:max-w-[1750px] items-center justify-between px-4 md:px-6 xl:px-10 text-[11px] font-medium uppercase tracking-wider sm:text-xs">
          <span className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">International Shipping Available</span>
            <span className="sm:hidden">Intl Shipping</span>
          </span>
          <span className="text-primary-foreground/80 hidden sm:block">Professional • Reliable • High-Value</span>
        </div>
      </div>

      {/* Main Header Unified Row */}
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 md:px-6 xl:px-10 py-3 lg:py-5">
        <div className="flex items-center justify-between gap-4 xl:gap-8">
          
          {/* 1. Left: Logo */}
          <div className="flex flex-1 justify-start shrink-0">
            <Link href="/" className="flex items-center gap-3 sm:gap-4 transition-all hover:opacity-90 group shrink-0 outline-none pt-2">
              <div className="relative shrink-0">
                {/* Minimalist shopping bag handle above the green box */}
                <svg 
                  viewBox="0 0 24 12" 
                  className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-5 h-2.5 text-zinc-400 group-hover:text-primary transition-colors duration-300"
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                >
                  <path d="M4 12C4 5.5 8 2 12 2C16 2 20 5.5 20 12" />
                </svg>
                
                {/* Exact original plain-text DQP Green Box */}
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md group-hover:scale-105 transition-transform duration-300">
                  <span className="font-black text-lg sm:text-xl tracking-tighter">DQP</span>
                </div>
              </div>
              <div className="flex flex-col leading-none justify-center pl-1">
                <span 
                  className="text-[13px] sm:text-[15px] font-black italic tracking-[0.08em] uppercase text-primary inline-block origin-left"
                  style={{ transform: 'scaleX(1.2)', transformOrigin: 'left' }}
                >
                  Discount
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-500 mt-1.5">
                  <span className="text-zinc-300 font-normal mr-1.5 select-none">—</span>Quality Products
                </span>
              </div>
            </Link>
          </div>

          {/* 2. Middle: Desktop Navigation Bar */}
          <div className="hidden lg:flex shrink-0 justify-center px-2 w-[350px] xl:w-[400px] 2xl:w-[500px]">
            <NavigationMenu className="mx-auto max-w-none" align="center" sideOffset={22} data-scrolled={isScrolled}>
              <NavigationMenuList className="justify-center">

                {/* Home */}
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/" />} className={cn(navigationMenuTriggerStyle(), "text-xs lg:text-sm font-bold uppercase tracking-[0.2em] lg:tracking-[0.25em] text-zinc-600 hover:text-zinc-900 px-4 lg:px-6 xl:px-8 !bg-transparent hover:!bg-transparent focus:!bg-transparent data-open:!bg-transparent data-popup-open:!bg-transparent")}>
                    Home
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* Shop Megamenu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className="text-xs lg:text-sm font-bold uppercase tracking-[0.2em] lg:tracking-[0.25em] text-zinc-600 hover:text-zinc-900 px-4 lg:px-6 xl:px-8 !bg-transparent hover:!bg-transparent focus:!bg-transparent data-open:!bg-transparent data-popup-open:!bg-transparent"
                    onClick={(e) => {
                      if (e.detail > 0) window.location.assign('/shop');
                    }}
                  >
                    Shop
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className={cn("transition-all duration-300 rounded-lg overflow-hidden", !isScrolled ? "!bg-white !opacity-100" : "bg-transparent")}>
                    <div className="w-[850px] p-8">
                      <div className="mb-6 border-b border-zinc-100 pb-3">
                        <Link 
                          href="/shop" 
                          className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-zinc-900 hover:text-primary transition-colors"
                        >
                          Browse All Departments →
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-5 divide-x divide-zinc-100">
                        {navigationCategories.map((category) => (
                          <div key={category.slug} className="px-5 first:pl-0 last:pr-0">
                            <Link
                              href={`/shop?category=${category.slug}`}
                              className={cn(
                                "block text-[11px] uppercase tracking-[0.1em] font-bold mb-3 transition-opacity hover:opacity-75",
                                category.accentColor
                              )}
                            >
                              {category.label}
                            </Link>
                            <ul className="space-y-2">
                              {category.subcategories.map((sub) => (
                                <li key={sub.slug}>
                                  <Link
                                    href={`/shop?category=${category.slug}&subcategory=${sub.slug}`}
                                    className="block text-xs text-zinc-800 hover:text-zinc-900 transition-colors leading-snug"
                                  >
                                    {sub.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Contact */}
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/contact" />} className={cn(navigationMenuTriggerStyle(), "text-xs lg:text-sm font-bold uppercase tracking-[0.2em] lg:tracking-[0.25em] text-zinc-600 hover:text-zinc-900 px-4 lg:px-6 xl:px-8 !bg-transparent hover:!bg-transparent focus:!bg-transparent data-open:!bg-transparent data-popup-open:!bg-transparent")}>
                    Contact
                  </NavigationMenuLink>
                </NavigationMenuItem>

              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* 3. Right: Utility Actions (Search, Cart, Mobile Nav) */}
          <div className="flex flex-1 items-center justify-end gap-2 lg:gap-4 shrink-0">
            <div className="w-full max-w-[350px] xl:max-w-[420px] hidden lg:block">
              <SearchCommand />
            </div>

            {/* Account Button */}
            <Link
              href="/account"
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 transition-colors hover:bg-zinc-200"
              aria-label="My account"
            >
              <User className="h-5 w-5 text-zinc-900" />
            </Link>

            {/* Wishlist Button */}
            <Link
              href="/account"
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 transition-colors hover:bg-zinc-200"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5 text-zinc-900" />
              {isMounted && wishlistIds.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                  {wishlistIds.length > 99 ? "99+" : wishlistIds.length}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => openMiniCart()}
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 transition-colors hover:bg-zinc-200"
              aria-label="Shopping basket"
            >
              <ShoppingCart className="h-5 w-5 text-zinc-900" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                {isMounted ? (basketCount() > 99 ? "99+" : basketCount()) : 0}
              </span>
            </button>
            
            {/* Mobile Hamburger */}
            <button
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 transition-colors hover:bg-zinc-200 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Accordion Drawer */}
      <div
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-zinc-100/50 bg-white/90 backdrop-blur-xl",
          mobileOpen ? "max-h-[80vh] overflow-y-auto" : "max-h-0"
        )}
      >
        <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-4 sm:px-8 py-4 2xl:px-16">
          <div className="mb-4 sm:hidden">
            <SearchCommand />
          </div>
          <nav aria-label="Mobile navigation">
            {/* Home Link */}
            <div className="border-b border-zinc-100 last:border-0">
              <Link href="/" className="block py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>
                Home
              </Link>
            </div>

            {/* Shop Accordion */}
            <div className="border-b border-zinc-100 last:border-0">
              <button
                className="flex w-full items-center justify-between py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900"
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === 'shop' ? null : 'shop'
                  )
                }
              >
                <span>Shop</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-zinc-400 transition-transform duration-200",
                    expandedCategory === 'shop' && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  expandedCategory === 'shop' ? "max-h-[60vh] overflow-y-auto" : "max-h-0"
                )}
              >
                <div className="pb-3 pl-4 space-y-4">
                  {navigationCategories.map((category) => (
                    <div key={category.slug}>
                      <Link
                        href={`/shop?category=${category.slug}`}
                        className={cn("block text-[11px] uppercase tracking-[0.1em] font-bold mb-2 transition-opacity hover:opacity-75", category.accentColor)}
                        onClick={() => setMobileOpen(false)}
                      >
                        {category.label}
                      </Link>
                      <ul className="space-y-1">
                        {category.subcategories.map((sub) => (
                          <li key={sub.slug}>
                            <Link
                              href={`/shop?category=${category.slug}&subcategory=${sub.slug}`}
                              className="block rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                              onClick={() => setMobileOpen(false)}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-zinc-100">
                    <Link
                      href="/shop"
                      className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 hover:text-primary transition-colors py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      Browse All Departments →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Link */}
            <div className="border-b border-zinc-100 last:border-0">
              <Link
                href="/contact"
                className="block py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Contact Us
              </Link>
            </div>

            {/* Account Link */}
            <div className="border-b border-zinc-100 last:border-0">
              <Link
                href="/account"
                className="block py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                My Account
              </Link>
            </div>

            {/* Wishlist Link */}
            <div className="pt-2 pb-1">
              <Link
                href="/account"
                className="flex items-center justify-between py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <span>Wishlist</span>
                {isMounted && wishlistIds.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    {wishlistIds.length}
                  </span>
                )}
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
