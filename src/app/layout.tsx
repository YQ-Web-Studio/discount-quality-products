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

export const metadata: Metadata = {
  metadataBase: new URL("https://discountqualityproducts.co.uk"),
  title: {
    template: "%s | Discount Quality Products",
    default: "Discount Quality Products | Essentials & Rare Finds",
  },
  description:
    "Shop 25,000+ discounted products: premium electricals, curated collectibles, computing, and more. Professional quality, competitive prices. Shipped worldwide from the UK.",
  openGraph: {
    title: "Discount Quality Products | Essentials & Rare Finds",
    description:
      "Shop 25,000+ discounted products: premium electricals, curated collectibles, computing, and more.",
    url: "https://discountqualityproducts.co.uk",
    siteName: "Discount Quality Products",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Discount Quality Products — 25,000+ Discounted Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discount Quality Products | Essentials & Rare Finds",
    description:
      "Shop 25,000+ discounted products: premium electricals, curated collectibles, computing, and more.",
    images: ["/images/og-image.jpg"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

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
      <body className={`${geistSans.className} min-h-screen bg-background text-foreground`} suppressHydrationWarning>
        <div className="relative flex min-h-screen flex-col overflow-x-clip">
          <StructuredData />
          <AuthProvider>
            <Header />
            <main className="flex-1 relative z-[1]">{children}</main>
            <Footer />
            <GlobalSearch />
            <MiniCart />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
