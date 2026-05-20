/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'discount-products-backend.local',
      },
      {
        protocol: 'https',
        hostname: 'discount-products-backend.local',
      },
    ],
  },
};

export default nextConfig;
