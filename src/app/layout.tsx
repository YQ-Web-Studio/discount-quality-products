import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { MiniCart } from "@/components/MiniCart";
import { AuthProvider } from "@/context/AuthContext";
import { StructuredData } from "@/components/seo/StructuredData";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Suspense } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.discountproducts.co.uk"),
  title: {
    template: "%s | Discount Quality Products",
    default: "Discount Quality Products | Light Bulbs, Electricals, Magazines & Collectibles",
  },
  description:
    "Shop 14,000+ items: light bulbs, electrical fittings, screws, bolts, rare coins & stamps, and magazines. Free UK delivery.",
  openGraph: {
    title: "Discount Quality Products | Light Bulbs, Electricals, Magazines & Collectibles",
    description:
      "Shop 14,000+ items: light bulbs, electrical fittings, screws, bolts, rare coins & stamps, and magazines. Free UK delivery.",
    url: "https://www.discountproducts.co.uk",
    siteName: "Discount Quality Products",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Discount Quality Products — Light Bulbs, Screws, Electricals & Collectibles",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discount Quality Products | Light Bulbs, Electricals, Magazines & Collectibles",
    description:
      "Shop 14,000+ items: light bulbs, electrical fittings, screws, bolts, rare coins & stamps, and magazines. Free UK delivery.",
    images: ["/images/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

import { GlobalRouteLoader } from "@/components/GlobalRouteLoader";
import { GoogleAnalytics } from '@next/third-parties/google';
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
              });
            `
          }}
        />
      </head>
      <body className={`${geistSans.className} min-h-screen bg-background text-foreground`} suppressHydrationWarning>
        <div className="relative flex min-h-screen flex-col overflow-x-clip">
          <StructuredData />
          <AuthProvider>
            <Suspense fallback={null}>
              <ScrollToTop />
            </Suspense>
            <Suspense fallback={null}>
              <GlobalRouteLoader />
            </Suspense>
            <Header />
            <main className="flex-1 relative z-[1]">{children}</main>
            <Footer />
            <GlobalSearch />
            <MiniCart />
            <AnalyticsProvider />
          </AuthProvider>
        </div>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-GYZVWG63H1"} />
      </body>
    </html>
  );
}
