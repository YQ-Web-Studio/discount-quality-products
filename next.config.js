/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    // Next.js Image Optimisation is enabled (no global unoptimized flag).
    // Images are served as modern WebP/AVIF at the correct breakpoint size,
    // preventing layout shift and reducing payload for the 25k catalogue.
    qualities: [60, 75, 90],

    // Breakpoint widths used when the browser picks a srcset candidate.
    // Tuned for the product grid (cards render at ~300px) up to full-bleed hero.
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [64, 128, 256, 384],

    remotePatterns: [
      // ── Local development (WP Local) ─────────────────────────────────
      {
        protocol: 'http',
        hostname: 'discount-products-backend.local',
        pathname: '/wp-content/uploads/**',
      },
      // ── Production: Bluehost WordPress backend ────────────────────────
      // Replace <your-domain> with the actual Bluehost domain once deployed,
      // e.g. hostname: 'store-backend.discountproducts.co.uk'
      {
        protocol: 'https',
        hostname: '*.bluehost.com',
        pathname: '/wp-content/uploads/**',
      },
      // Wildcard for custom domain on Bluehost (add your real hostname here).
      // Example: { protocol: 'https', hostname: 'api.discountproducts.co.uk', pathname: '/wp-content/uploads/**' }
      // ── Unsplash (placeholder / editorial images) ─────────────────────
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
