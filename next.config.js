/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Concurrency Throttling ─────────────────────────────────────────
  // Tells Next.js to compile pages sequentially.
  // This prevents triggering Bluehost's concurrent rate-limiting firewalls.
  experimental: {
    workerThreads: false,
    cpus: 1,
    // Keep RSC payloads in the client router cache so back/forward nav is instant
    staleTimes: {
      dynamic: 180, // 3 minutes — navigating back serves cached RSC payload
      static: 600,  // 10 minutes
    },
  },

  images: {
    // Serve AVIF first (30–50% smaller than WebP), fall back to WebP
    formats: ['image/avif', 'image/webp'],
    // Cache optimised images for 30 days in the browser/CDN
    minimumCacheTTL: 2592000,
    remotePatterns: [
      // ── New Active Live Subdomain ──────────────────────────────────
      {
        protocol: 'https',
        hostname: 'admin.discountproducts.co.uk',
        pathname: '/wp-content/uploads/**',
      },
      // ── Cloudflare R2 Storage ──────────────────────────────────────
      {
        protocol: 'https',
        hostname: 'pub-8d1174ef87b14259ae896366fb94672b.r2.dev',
        pathname: '/wp-content/uploads/**',
      },
      // ── Cloudflare Workers Proxy ──────────────────────────────────
      {
        protocol: 'https',
        hostname: 'dqp-image-proxy.yusufq2004.workers.dev',
      },
      // ── Local Development ──────────────────────────────────────────
      {
        protocol: 'http',
        hostname: 'discount-products-backend.local',
      },
      {
        protocol: 'https',
        hostname: 'discount-products-backend.local',
      },
      // ── Placeholders ───────────────────────────────────────────────
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;