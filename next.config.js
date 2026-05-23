/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Concurrency Throttling ─────────────────────────────────────────
  // Tells Next.js to compile pages sequentially.
  // This prevents triggering Bluehost's concurrent rate-limiting firewalls.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  images: {
    unoptimized: true,
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